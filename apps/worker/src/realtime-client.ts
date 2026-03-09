import { Driver, RaceFlag, Session, TelemetryTick, toOpaqueError } from "@f1/shared";

export class RealtimeClient {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  private async post(path: string, body: unknown): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": this.token
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`post failed ${response.status}`);
    }
  }

  async syncSession(session: Session, drivers: Driver[]): Promise<void> {
    await this.post("/internal/session", { session, drivers });
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