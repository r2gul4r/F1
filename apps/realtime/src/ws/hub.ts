import { Server } from "http";
import { wsEventSchema, WsEvent } from "@f1/shared";
import { verifyWatchToken } from "@f1/shared/watch-token";
import { WebSocket, WebSocketServer } from "ws";
import { WsRingBuffer } from "./ring-buffer.js";

type ConnectionQuery = {
  sessionId: string;
  token: string;
};

type WsHubConfig = {
  bufferSize: number;
  watchTokenSecret: string;
  allowedOrigins: string[];
  onConnected?: () => void;
  onRejected?: () => void;
  onReplayDelivered?: () => void;
};

export class WsHub {
  private readonly clients = new Set<WebSocket>();
  private readonly sessions = new Map<WebSocket, string>();
  private readonly buffer: WsRingBuffer;
  private readonly watchTokenSecret: string;
  private readonly allowedOrigins: string[];

  constructor(server: Server, config: WsHubConfig) {
    this.buffer = new WsRingBuffer(config.bufferSize);
    this.watchTokenSecret = config.watchTokenSecret;
    this.allowedOrigins = config.allowedOrigins;
    const wsServer = new WebSocketServer({ server, path: "/ws" });

    wsServer.on("connection", (socket, request) => {
      const query = this.parseQuery(request.url);
      const origin = request.headers.origin;
      const authorized = query && verifyWatchToken(query.token, this.watchTokenSecret);
      const allowedOrigin = !origin || this.allowedOrigins.includes(origin);

      if (!authorized || !allowedOrigin) {
        config.onRejected?.();
        socket.close(1008, "policy");
        return;
      }

      this.clients.add(socket);
      this.sessions.set(socket, query.sessionId);
      config.onConnected?.();
      this.buffer.snapshot().forEach((event) => {
        if (event.payload.sessionId === query.sessionId) {
          config.onReplayDelivered?.();
          socket.send(JSON.stringify(event));
        }
      });

      socket.on("close", () => {
        this.clients.delete(socket);
        this.sessions.delete(socket);
      });
    });

    setInterval(() => {
      this.clients.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        }
      });
    }, 15000).unref();
  }

  broadcast(event: WsEvent): void {
    const parsed = wsEventSchema.parse(event);
    this.buffer.push(parsed);
    const payload = JSON.stringify(parsed);
    const sessionId = parsed.payload.sessionId;

    this.clients.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN && this.sessions.get(socket) === sessionId) {
        socket.send(payload);
      }
    });
  }

  private parseQuery(rawUrl: string | undefined): ConnectionQuery | null {
    const url = new URL(rawUrl ?? "", "http://localhost");
    const sessionId = (url.searchParams.get("sessionId") ?? "").trim();
    const token = (url.searchParams.get("token") ?? "").trim();

    if (!sessionId || !token) {
      return null;
    }

    return {
      sessionId,
      token
    };
  }
}
