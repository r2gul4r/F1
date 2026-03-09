import { AiPrediction, Driver, RaceFlag, Session, TelemetryTick } from "@f1/shared";
import { Pool } from "pg";
import { Repository } from "./repository.js";

type TelemetryCacheClient = {
  lPush(key: string, value: string): Promise<number>;
  lTrim(key: string, start: number, stop: number): Promise<string>;
  expire(key: string, seconds: number): Promise<number | boolean>;
  lRange(key: string, start: number, stop: number): Promise<string[]>;
};

const fromTickRow = (row: Record<string, unknown>): TelemetryTick => ({
  sessionId: String(row.session_id),
  driverId: String(row.driver_id),
  position: {
    x: Number(row.x),
    y: Number(row.y),
    z: Number(row.z)
  },
  speedKph: Number(row.speed_kph),
  lap: Number(row.lap),
  rank: Number(row.rank),
  timestampMs: Number(row.timestamp_ms)
});

export class PostgresRepository implements Repository {
  constructor(
    private readonly pool: Pool,
    private readonly redis?: TelemetryCacheClient
  ) {}

  async getCurrentSession(): Promise<Session | null> {
    const { rows } = await this.pool.query(
      `select id, name, starts_at, is_current
       from sessions
       where is_current = true
       order by starts_at desc
       limit 1`
    );

    if (!rows[0]) {
      return null;
    }

    return {
      id: rows[0].id,
      name: rows[0].name,
      startsAt: new Date(rows[0].starts_at).toISOString(),
      isCurrent: Boolean(rows[0].is_current)
    };
  }

  async upsertSession(session: Session): Promise<void> {
    await this.pool.query("update sessions set is_current = false where is_current = true");
    await this.pool.query(
      `insert into sessions (id, name, starts_at, is_current)
       values ($1, $2, $3, $4)
       on conflict (id)
       do update set name = excluded.name, starts_at = excluded.starts_at, is_current = excluded.is_current`,
      [session.id, session.name, session.startsAt, session.isCurrent]
    );
  }

  async getDrivers(sessionId: string): Promise<Driver[]> {
    const { rows } = await this.pool.query(
      `select id, session_id, full_name, number, team_name, deep_link
       from drivers
       where session_id = $1
       order by number asc`,
      [sessionId]
    );

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      fullName: row.full_name,
      number: Number(row.number),
      teamName: row.team_name,
      deepLink: row.deep_link
    }));
  }

  async upsertDrivers(drivers: Driver[]): Promise<void> {
    const operations = drivers.map((driver) =>
      this.pool.query(
        `insert into drivers (id, session_id, full_name, number, team_name, deep_link)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id, session_id)
         do update set full_name = excluded.full_name,
                       number = excluded.number,
                       team_name = excluded.team_name,
                       deep_link = excluded.deep_link`,
        [driver.id, driver.sessionId, driver.fullName, driver.number, driver.teamName, driver.deepLink]
      )
    );

    await Promise.all(operations);
  }

  async insertTelemetryTick(tick: TelemetryTick): Promise<void> {
    await this.pool.query(
      `insert into telemetry_ticks (session_id, driver_id, x, y, z, speed_kph, lap, rank, timestamp_ms)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tick.sessionId,
        tick.driverId,
        tick.position.x,
        tick.position.y,
        tick.position.z,
        tick.speedKph,
        tick.lap,
        tick.rank,
        tick.timestampMs
      ]
    );

    if (this.redis) {
      const key = `telemetry:${tick.driverId}`;
      await this.redis.lPush(key, JSON.stringify(tick));
      await this.redis.lTrim(key, 0, 600);
      await this.redis.expire(key, 60 * 30);
    }
  }

  async getRecentTelemetry(driverId: string, windowSec: number): Promise<TelemetryTick[]> {
    const cutoff = Date.now() - windowSec * 1000;
    if (this.redis) {
      const cached = await this.redis.lRange(`telemetry:${driverId}`, 0, 300);
      const parsed = cached
        .map((item) => {
          try {
            return JSON.parse(item) as TelemetryTick;
          } catch {
            return undefined;
          }
        })
        .filter((item): item is TelemetryTick => item !== undefined && item.timestampMs >= cutoff)
        .sort((left, right) => left.timestampMs - right.timestampMs);

      if (parsed.length > 0) {
        return parsed;
      }
    }

    const { rows } = await this.pool.query(
      `select session_id, driver_id, x, y, z, speed_kph, lap, rank, timestamp_ms
       from telemetry_ticks
       where driver_id = $1 and timestamp_ms >= $2
       order by timestamp_ms asc`,
      [driverId, cutoff]
    );

    return rows.map((row) => fromTickRow(row));
  }

  async getRecentSessionTicks(sessionId: string, limit: number): Promise<TelemetryTick[]> {
    const { rows } = await this.pool.query(
      `select session_id, driver_id, x, y, z, speed_kph, lap, rank, timestamp_ms
       from telemetry_ticks
       where session_id = $1
       order by timestamp_ms desc
       limit $2`,
      [sessionId, limit]
    );

    return [...rows].reverse().map((row) => fromTickRow(row));
  }

  async insertRaceFlag(flag: RaceFlag): Promise<void> {
    await this.pool.query(
      `insert into race_flags (session_id, flag_type, sector, timestamp_ms)
       values ($1, $2, $3, $4)`,
      [flag.sessionId, flag.flagType, flag.sector ?? null, flag.timestampMs]
    );
  }

  async savePrediction(prediction: AiPrediction): Promise<void> {
    await this.pool.query(
      `insert into ai_predictions (session_id, lap, trigger_driver_id, podium_prob, reasoning_summary, model_latency_ms, timestamp_ms)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
      [
        prediction.sessionId,
        prediction.lap,
        prediction.triggerDriverId,
        JSON.stringify(prediction.podiumProb),
        prediction.reasoningSummary,
        prediction.modelLatencyMs,
        prediction.timestampMs
      ]
    );
  }
}
