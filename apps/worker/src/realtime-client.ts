import { Driver, InternalSessionSyncRequest, RaceFlag, Session, TelemetryTick, toOpaqueError } from "@f1/shared";
const opaqueMessage = "요청 처리 실패";
const requestTimeoutStatus = 504;
const requestUpstreamFailureStatus = 502;
const defaultRequestTimeoutMs = 3000;

export type RealtimeClientErrorCode = "REQUEST_FAILED";

export class RealtimeClientError extends Error {
  constructor(
    public readonly code: RealtimeClientErrorCode,
    public readonly status: number
  ) {
    super(opaqueMessage);
    this.name = "RealtimeClientError";
  }
}

export class RealtimeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly timeoutMs: number = defaultRequestTimeoutMs
  ) {}

  private async post(path: string, body: unknown): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token": this.token
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new RealtimeClientError("REQUEST_FAILED", response.status);
      }
    } catch (error) {
      if (error instanceof RealtimeClientError) {
        throw error;
      }

      const status =
        error instanceof Error && error.name === "AbortError"
          ? requestTimeoutStatus
          : requestUpstreamFailureStatus;
      throw new RealtimeClientError("REQUEST_FAILED", status);
    } finally {
      clearTimeout(timer);
    }
  }

  async syncSession(session: Session, drivers: Driver[]): Promise<void> {
    const payload: InternalSessionSyncRequest = {
      session,
      drivers
    };
    await this.post("/internal/session", payload);
  }

  async sendTelemetry(tick: TelemetryTick): Promise<void> {
    await this.post("/internal/events/telemetry", tick);
  }

  async sendFlag(flag: RaceFlag): Promise<void> {
    await this.post("/internal/events/flag", flag);
  }

  handleFailure(error: unknown): void {
    const opaque = toOpaqueError(error);
    // 한국어 로그 메시지 유지
    console.error("워크커 전송 실패", opaque.publicMessage);
  }
}
