import { Driver, Session } from "@f1/shared";
import { Snapshot, TelemetrySource } from "./types.js";

const session: Session = {
  id: "mock-session",
  name: "Mock Grand Prix",
  startsAt: new Date().toISOString(),
  isCurrent: true
};

const drivers: Driver[] = [
  {
    id: "VER",
    sessionId: session.id,
    fullName: "Max Verstappen",
    number: 1,
    teamName: "Red Bull",
    deepLink: "https://f1tv.formula1.com/detail/100000000"
  },
  {
    id: "NOR",
    sessionId: session.id,
    fullName: "Lando Norris",
    number: 4,
    teamName: "McLaren",
    deepLink: "https://f1tv.formula1.com/detail/100000001"
  },
  {
    id: "RUS",
    sessionId: session.id,
    fullName: "George Russell",
    number: 63,
    teamName: "Mercedes",
    deepLink: "https://f1tv.formula1.com/detail/100000002"
  },
  {
    id: "LEC",
    sessionId: session.id,
    fullName: "Charles Leclerc",
    number: 16,
    teamName: "Ferrari",
    deepLink: "https://f1tv.formula1.com/detail/100000003"
  },
  {
    id: "HAM",
    sessionId: session.id,
    fullName: "Lewis Hamilton",
    number: 44,
    teamName: "Mercedes",
    deepLink: "https://f1tv.formula1.com/detail/100000004"
  },
  {
    id: "ALO",
    sessionId: session.id,
    fullName: "Fernando Alonso",
    number: 14,
    teamName: "Aston Martin",
    deepLink: "https://f1tv.formula1.com/detail/100000005"
  }
];

export class MockSource implements TelemetrySource {
  private tick = 0;

  async pull(): Promise<Snapshot> {
    this.tick += 1;
    const lap = Math.floor(this.tick / 20) + 1;

    const ranks = this.tick % 25 === 0
      ? { VER: 1, NOR: 2, RUS: 3, LEC: 4, ALO: 5, HAM: 6 }
      : { VER: 1, NOR: 2, RUS: 3, LEC: 4, HAM: 5, ALO: 6 };

    const ticks = drivers.map((driver, index) => {
      const angle = (this.tick / 12 + index * 0.8) % (Math.PI * 2);
      const radius = 120 + index * 6;
      const speed = 260 + ((this.tick + index * 9) % 40);
      const rank = ranks[driver.id as keyof typeof ranks] ?? index + 1;

      return {
        sessionId: session.id,
        driverId: driver.id,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: 0
        },
        speedKph: speed,
        lap,
        rank,
        timestampMs: Date.now()
      };
    });

    const flag = this.tick % 40 === 0
      ? {
          sessionId: session.id,
          flagType: "YELLOW" as const,
          sector: "S2",
          timestampMs: Date.now()
        }
      : undefined;

    return {
      session,
      drivers,
      ticks,
      flag
    };
  }
}