import { Server } from "http";
import { wsEventSchema, WsEvent } from "@f1/shared";
import { verifyWatchToken } from "@f1/shared/watch-token";
import { WebSocket, WebSocketServer } from "ws";
import { WsRingBuffer } from "./ring-buffer.js";

type ConnectionQuery = {
  sessionId: string;
  token: string;
  clientId: string | null;
};

type WsHubConfig = {
  bufferSize: number;
  watchTokenSecret: string;
  allowedOrigins: string[];
  onConnected?: () => void;
  onReconnected?: () => void;
  onRejected?: () => void;
  onReplayDelivered?: () => void;
  onDroppedEventSuspected?: () => void;
};

export class WsHub {
  private readonly clients = new Set<WebSocket>();
  private readonly sessions = new Map<WebSocket, string>();
  private readonly clientKeys = new Map<WebSocket, string>();
  private readonly seenClientKeys = new Set<string>();
  private readonly buffer: WsRingBuffer;
  private readonly watchTokenSecret: string;
  private readonly allowedOrigins: string[];
  private readonly onConnected?: () => void;
  private readonly onReconnected?: () => void;
  private readonly onRejected?: () => void;
  private readonly onReplayDelivered?: () => void;
  private readonly onDroppedEventSuspected?: () => void;

  constructor(server: Server, config: WsHubConfig) {
    this.buffer = new WsRingBuffer(config.bufferSize);
    this.watchTokenSecret = config.watchTokenSecret;
    this.allowedOrigins = config.allowedOrigins;
    this.onConnected = config.onConnected;
    this.onReconnected = config.onReconnected;
    this.onRejected = config.onRejected;
    this.onReplayDelivered = config.onReplayDelivered;
    this.onDroppedEventSuspected = config.onDroppedEventSuspected;
    const wsServer = new WebSocketServer({ server, path: "/ws" });

    wsServer.on("connection", (socket, request) => {
      const query = this.parseQuery(request.url);
      const origin = request.headers.origin;
      const authorized = query && verifyWatchToken(query.token, this.watchTokenSecret);
      const allowedOrigin = !origin || this.allowedOrigins.includes(origin);

      if (!authorized || !allowedOrigin) {
        this.onRejected?.();
        socket.close(1008, "policy");
        return;
      }

      const clientKey = this.getClientKey(query);
      if (clientKey && this.seenClientKeys.has(clientKey) && !this.hasActiveClientKey(clientKey)) {
        this.onReconnected?.();
      }

      this.clients.add(socket);
      this.sessions.set(socket, query.sessionId);
      if (clientKey) {
        this.clientKeys.set(socket, clientKey);
        this.seenClientKeys.add(clientKey);
      }
      this.onConnected?.();
      this.buffer.snapshot().forEach((event) => {
        if (event.payload.sessionId === query.sessionId) {
          this.onReplayDelivered?.();
          socket.send(JSON.stringify(event));
        }
      });

      socket.on("close", () => {
        this.clients.delete(socket);
        this.sessions.delete(socket);
        this.clientKeys.delete(socket);
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
    const overflowed = this.buffer.push(parsed);
    if (overflowed) {
      this.onDroppedEventSuspected?.();
    }
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
    const clientId = (url.searchParams.get("clientId") ?? "").trim();

    if (!sessionId || !token) {
      return null;
    }

    return {
      sessionId,
      token,
      clientId: clientId.length > 0 ? clientId : null
    };
  }

  private getClientKey(query: ConnectionQuery): string | null {
    if (!query.clientId) {
      return null;
    }

    return `${query.sessionId}::${query.clientId}`;
  }

  private hasActiveClientKey(clientKey: string): boolean {
    return Array.from(this.clientKeys.values()).some((value) => value === clientKey);
  }
}
