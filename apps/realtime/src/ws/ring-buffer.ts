import { WsEvent } from "@f1/shared";

export class WsRingBuffer {
  private events: WsEvent[] = [];

  constructor(private readonly capacity: number) {}

  push(event: WsEvent): boolean {
    const nextEvents = [...this.events, event];
    const overflowed = nextEvents.length > this.capacity;
    this.events = nextEvents.slice(-this.capacity);
    return overflowed;
  }

  snapshot(): WsEvent[] {
    return [...this.events];
  }
}
