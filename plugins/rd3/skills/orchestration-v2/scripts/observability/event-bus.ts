/**
 * orchestration-v2 — Typed Event Bus
 *
 * Central event emitter for all subsystems. All events flow through here.
 */

import type { OrchestratorEvent, EventType } from '../model';

export type EventHandler = (event: OrchestratorEvent) => void;

export class EventBus {
    // biome-ignore lint/complexity/noUselessConstructor: V8 function coverage requires explicit constructor
    constructor() {}
    private handlers: Map<EventType, Set<EventHandler>> = new Map();
    private globalHandlers: Set<EventHandler> = new Set();

    subscribe(eventType: EventType, handler: EventHandler): void {
        let set = this.handlers.get(eventType);
        if (!set) {
            set = new Set();
            this.handlers.set(eventType, set);
        }
        set.add(handler);
    }

    subscribeAll(handler: EventHandler): void {
        this.globalHandlers.add(handler);
    }

    unsubscribe(eventType: EventType, handler: EventHandler): void {
        this.handlers.get(eventType)?.delete(handler);
    }

    unsubscribeAll(handler: EventHandler): void {
        this.globalHandlers.delete(handler);
    }

    emit(event: OrchestratorEvent): void {
        const typedHandlers = this.handlers.get(event.event_type);
        if (typedHandlers) {
            for (const handler of typedHandlers) {
                handler(event);
            }
        }
        for (const handler of this.globalHandlers) {
            handler(event);
        }
    }

    clear(): void {
        this.handlers.clear();
        this.globalHandlers.clear();
    }
}
