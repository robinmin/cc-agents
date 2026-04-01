import { describe, test, expect, beforeAll } from 'bun:test';
import { EventBus } from '../scripts/observability/event-bus';
import type { OrchestratorEvent, EventType } from '../scripts/model';

function makeEvent(type: EventType, runId = 'test-run'): OrchestratorEvent {
    return { run_id: runId, event_type: type, payload: {} };
}

import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('EventBus', () => {
    test('emit delivers to typed subscriber', () => {
        const bus = new EventBus();
        const received: OrchestratorEvent[] = [];
        bus.subscribe('run.started', (e) => received.push(e));

        bus.emit(makeEvent('run.started'));
        bus.emit(makeEvent('run.paused'));

        expect(received).toHaveLength(1);
        expect(received[0].event_type).toBe('run.started');
    });

    test('emit delivers to global subscriber for all event types', () => {
        const bus = new EventBus();
        const received: OrchestratorEvent[] = [];
        bus.subscribeAll((e) => received.push(e));

        bus.emit(makeEvent('run.started'));
        bus.emit(makeEvent('phase.completed'));

        expect(received).toHaveLength(2);
    });

    test('unsubscribe removes typed handler', () => {
        const bus = new EventBus();
        const received: OrchestratorEvent[] = [];
        const handler = (e: OrchestratorEvent) => received.push(e);

        bus.subscribe('run.started', handler);
        bus.unsubscribe('run.started', handler);

        bus.emit(makeEvent('run.started'));
        expect(received).toHaveLength(0);
    });

    test('unsubscribeAll removes global handler', () => {
        const bus = new EventBus();
        const received: OrchestratorEvent[] = [];
        const handler = (e: OrchestratorEvent) => received.push(e);

        bus.subscribeAll(handler);
        bus.unsubscribeAll(handler);

        bus.emit(makeEvent('run.started'));
        expect(received).toHaveLength(0);
    });

    test('clear removes all handlers', () => {
        const bus = new EventBus();
        let count = 0;
        bus.subscribe('run.started', () => count++);
        bus.subscribeAll(() => count++);

        bus.clear();
        bus.emit(makeEvent('run.started'));
        bus.emit(makeEvent('phase.completed'));

        expect(count).toBe(0);
    });

    test('multiple subscribers for same event type', () => {
        const bus = new EventBus();
        let a = 0;
        let b = 0;
        bus.subscribe('run.started', () => a++);
        bus.subscribe('run.started', () => b++);

        bus.emit(makeEvent('run.started'));
        expect(a).toBe(1);
        expect(b).toBe(1);
    });

    test('emit with payload delivers payload to subscriber', () => {
        const bus = new EventBus();
        let receivedPayload: Record<string, unknown> | undefined;
        bus.subscribe('phase.completed', (e) => {
            receivedPayload = e.payload;
        });

        bus.emit({
            run_id: 'r1',
            event_type: 'phase.completed',
            payload: { duration_ms: 5000 },
        });

        expect(receivedPayload).toEqual({ duration_ms: 5000 });
    });
});
