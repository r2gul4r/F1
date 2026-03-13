import {
  AiPredictRequest,
  AiPrediction,
  sanitizeUserHtml,
  TelemetryTick,
  toOpaqueError
} from "@f1/shared";

export type AiServiceConfig = {
  provider: "ollama" | "gemini" | "disabled";
  model: string;
  baseUrl?: string;
  apiKey?: string;
};

export type AiPredictionStatus = "ok" | "fallback";
export type AiFallbackReason = "http_error" | "invalid_payload" | "exception" | "disabled_provider" | "timeout";

export type AiPredictionResult = {
  prediction: AiPrediction;
  status: AiPredictionStatus;
  reason?: AiFallbackReason;
};

type OllamaGenerateResponse = {
  response?: string;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeProbabilities = (values: number[]): number[] | null => {
  const sanitized = values.map((value) => clamp(value));
  const total = sanitized.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return null;
  }

  return sanitized.map((value) => value / total);
};

const fallbackPrediction = (request: AiPredictRequest, latencyMs: number): AiPrediction => {
  const latest = request.snapshot.ticks.slice(-3);
  const base = latest.length > 0 ? latest.reduce((sum, tick) => sum + tick.speedKph, 0) / latest.length : 0;
  const p1 = clamp(0.25 + base / 1200);
  const p2 = clamp(0.45 - base / 2400);
  const p3 = clamp(1 - p1 - p2);
  const normalized = normalizeProbabilities([p1, p2, p3]) ?? [1 / 3, 1 / 3, 1 / 3];

  return {
    sessionId: request.sessionId,
    lap: request.lap,
    triggerDriverId: request.triggerDriverId,
    podiumProb: [normalized[0] ?? 0, normalized[1] ?? 0, normalized[2] ?? 0],
    reasoningSummary: sanitizeUserHtml("모델 응답 실패로 보수적 추정 사용"),
    modelLatencyMs: latencyMs,
    timestampMs: Date.now()
  };
};

const extractProbabilities = (text: string): number[] | null => {
  const matches = text.match(/0(?:\.\d+)?|1(?:\.0+)?/g);
  if (!matches || matches.length < 3) {
    return null;
  }

  return normalizeProbabilities(matches.slice(0, 3).map((item) => Number(item)));
};

const toPrompt = (request: AiPredictRequest): string => {
  const rows = request.snapshot.ticks.slice(-20).map((tick: TelemetryTick) =>
    `${tick.driverId}|lap=${tick.lap}|rank=${tick.rank}|speed=${tick.speedKph.toFixed(1)}|ts=${tick.timestampMs}`
  );

  const note = sanitizeUserHtml(request.snapshot.note ?? "");
  return [
    "역할: F1 전략 분석",
    "출력: 첫 줄에 확률 3개를 콤마로 반환, 둘째 줄에 120자 요약",
    `session=${request.sessionId} lap=${request.lap} trigger=${request.triggerDriverId}`,
    `note=${note}`,
    ...rows
  ].join("\n");
};

const isAbortFailure = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
    cause?: unknown;
  };
  const name = typeof maybeError.name === "string" ? maybeError.name : "";
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const message = typeof maybeError.message === "string" ? maybeError.message : "";

  if (name === "AbortError" || code === "ABORT_ERR") {
    return true;
  }

  if (/\babort(?:ed)?\b/i.test(message)) {
    return true;
  }

  return isAbortFailure(maybeError.cause);
};

export class AiService {
  constructor(private readonly config: AiServiceConfig) {}

  async predictWithStatus(request: AiPredictRequest): Promise<AiPredictionResult> {
    const startedAt = Date.now();

    if (this.config.provider === "disabled") {
      return {
        prediction: fallbackPrediction(request, Date.now() - startedAt),
        status: "fallback",
        reason: "disabled_provider"
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const prompt = toPrompt(request);
      const response = this.config.provider === "gemini"
        ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": this.config.apiKey ?? ""
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ]
            }),
            signal: controller.signal
          })
        : await fetch(`${this.config.baseUrl}/api/generate`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              model: this.config.model,
              prompt,
              stream: false,
              options: { temperature: 0.2 }
            }),
            signal: controller.signal
          });

      if (!response.ok) {
        return {
          prediction: fallbackPrediction(request, Date.now() - startedAt),
          status: "fallback",
          reason: "http_error"
        };
      }

      const raw = this.config.provider === "gemini"
        ? ((await response.json()) as GeminiGenerateResponse)
          .candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join(" ")
          .trim() ?? ""
        : ((await response.json()) as OllamaGenerateResponse).response ?? "";
      const probabilities = extractProbabilities(raw);
      const summary = sanitizeUserHtml(raw.split("\n").slice(1).join(" ").slice(0, 200) || "보수적 추정");

      if (!probabilities) {
        return {
          prediction: fallbackPrediction(request, Date.now() - startedAt),
          status: "fallback",
          reason: "invalid_payload"
        };
      }

      return {
        prediction: {
          sessionId: request.sessionId,
          lap: request.lap,
          triggerDriverId: request.triggerDriverId,
          podiumProb: probabilities,
          reasoningSummary: summary,
          modelLatencyMs: Date.now() - startedAt,
          timestampMs: Date.now()
        },
        status: "ok"
      };
    } catch (error) {
      const opaque = toOpaqueError(error);
      return {
        prediction: {
          ...fallbackPrediction(request, Date.now() - startedAt),
          reasoningSummary: sanitizeUserHtml(opaque.publicMessage)
        },
        status: "fallback",
        reason: isAbortFailure(error) ? "timeout" : "exception"
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async predict(request: AiPredictRequest): Promise<AiPrediction> {
    const result = await this.predictWithStatus(request);
    return result.prediction;
  }
}
