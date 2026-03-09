import { WsEvent } from "@f1/shared";

export class WsRingBuffer {
  private events: WsEvent[] = [];

  constructor(private readonly capacity: number) {}

  push(event: WsEvent): void {
    this.events = [...this.events, event].slice(-this.capacity);
  }

  snapshot(): WsEvent[] {
    return [...this.events];
  }
}
