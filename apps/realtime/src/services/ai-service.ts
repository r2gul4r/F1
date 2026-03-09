import {
  AiPredictRequest,
  AiPrediction,
  sanitizeUserHtml,
  TelemetryTick,
  toOpaqueError
} from "@f1/shared";

export type AiServiceConfig = {
  baseUrl: string;
  model: string;
};

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const fallbackPrediction = (request: AiPredictRequest, latencyMs: number): AiPrediction => {
  const latest = request.snapshot.ticks.slice(-3);
  const base = latest.length > 0 ? latest.reduce((sum, tick) => sum + tick.speedKph, 0) / latest.length : 0;
  const p1 = clamp(0.25 + base / 1200);
  const p2 = clamp(0.45 - base / 2400);
  const p3 = clamp(1 - p1 - p2);

  return {
    sessionId: request.sessionId,
    lap: request.lap,
    triggerDriverId: request.triggerDriverId,
    podiumProb: [p1, p2, p3],
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

  const selected = matches.slice(0, 3).map((item) => clamp(Number(item)));
  const total = selected.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return null;
  }

  return selected.map((value) => value / total);
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

export class AiService {
  constructor(private readonly config: AiServiceConfig) {}

  async predict(request: AiPredictRequest): Promise<AiPrediction> {
    const startedAt = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          prompt: toPrompt(request),
          stream: false,
          options: { temperature: 0.2 }
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error("model request failed");
      }

      const data = (await response.json()) as { response?: string };
      const raw = data.response ?? "";
      const probabilities = extractProbabilities(raw);
      const summary = sanitizeUserHtml(raw.split("\n").slice(1).join(" ").slice(0, 200) || "보수적 추정");

      if (!probabilities) {
        return fallbackPrediction(request, Date.now() - startedAt);
      }

      return {
        sessionId: request.sessionId,
        lap: request.lap,
        triggerDriverId: request.triggerDriverId,
        podiumProb: probabilities,
        reasoningSummary: summary,
        modelLatencyMs: Date.now() - startedAt,
        timestampMs: Date.now()
      };
    } catch (error) {
      const opaque = toOpaqueError(error);
      return {
        ...fallbackPrediction(request, Date.now() - startedAt),
        reasoningSummary: sanitizeUserHtml(opaque.publicMessage)
      };
    }
  }
}