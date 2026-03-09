"use client";

import { Driver, Session, wsEventSchema } from "@f1/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "./api";
import { useRaceStore } from "@/src/store/use-race-store";

type SocketStatus = "idle" | "connecting" | "connected" | "reconnecting";

const wsBase = process.env.NEXT_PUBLIC_REALTIME_WS_BASE ?? "ws://localhost:4001";
const hasWatchToken = (token: string): boolean => token.trim().length > 0;

export const useRaceSocket = (sessionId: string, watchToken: string): { status: SocketStatus; reconnectInMs: number } => {
  const setDrivers = useRaceStore((state) => state.setDrivers);
  const upsertTick = useRaceStore((state) => state.upsertTick);
  const setFlag = useRaceStore((state) => state.setFlag);
  const addPrediction = useRaceStore((state) => state.addPrediction);
  const [resolvedSessionId, setResolvedSessionId] = useState(sessionId);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [reconnectInMs, setReconnectInMs] = useState(0);

  useEffect(() => {
    const resolveSessionId = async (): Promise<void> => {
      if (sessionId !== "current") {
        setResolvedSessionId(sessionId);
        return;
      }

      try {
        const current = await apiClient.getCurrentSession<Session | null>(watchToken);
        setResolvedSessionId(current?.id ?? "mock-session");
      } catch {
        setResolvedSessionId("mock-session");
      }
    };

    resolveSessionId().catch(() => {
      setResolvedSessionId("mock-session");
    });
  }, [sessionId]);

  const wsUrl = useMemo(
    () =>
      `${wsBase.replace(/\/$/, "")}/ws?sessionId=${encodeURIComponent(resolvedSessionId)}&token=${encodeURIComponent(watchToken)}`,
    [resolvedSessionId, watchToken]
  );

  useEffect(() => {
    let closedByUser = false;

    if (!hasWatchToken(watchToken)) {
      setStatus("reconnecting");
      return;
    }

    const loadDrivers = async (): Promise<void> => {
      const drivers = await apiClient.getDrivers<Driver[]>(resolvedSessionId, watchToken);
      setDrivers(drivers);
    };

    const connect = (): void => {
      setStatus(reconnectAttempt.current > 0 ? "reconnecting" : "connecting");
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        const parsed = wsEventSchema.safeParse(JSON.parse(event.data as string));
        if (!parsed.success) {
          return;
        }

        if (parsed.data.type === "telemetry.tick") {
          upsertTick(parsed.data.payload);
        }

        if (parsed.data.type === "race.flag") {
          setFlag(parsed.data.payload);
        }

        if (parsed.data.type === "ai.prediction") {
          addPrediction(parsed.data.payload);
        }
      };

      socket.onclose = () => {
        if (closedByUser) {
          return;
        }

        reconnectAttempt.current += 1;
        const delay = Math.min(3000, reconnectAttempt.current * 500);
        setReconnectInMs(delay);
        setStatus("reconnecting");
        reconnectTimer.current = setTimeout(connect, delay);
      };
    };

    loadDrivers().catch(() => {
      setStatus("reconnecting");
    });
    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      socketRef.current?.close();
    };
  }, [addPrediction, resolvedSessionId, setDrivers, setFlag, upsertTick, watchToken, wsUrl]);

  return { status, reconnectInMs };
};
