import { useEffect, useRef, useState } from 'react';
import type { TaskEvent } from '../types';

export function useSSE(onEvent: (event: TaskEvent) => void) {
    const onEventRef = useRef(onEvent);
    const [connected, setConnected] = useState(true);

    onEventRef.current = onEvent;

    useEffect(() => {
        const es = new EventSource('/events');

        es.onopen = () => {
            setConnected(true);
        };

        es.onmessage = (msg) => {
            try {
                const event = JSON.parse(msg.data) as TaskEvent;
                onEventRef.current(event);
            } catch {
                // ignore malformed events
            }
        };

        es.onerror = () => {
            setConnected(false);
            // EventSource auto-reconnects by default
        };

        return () => {
            es.close();
        };
    }, []);

    return connected;
}
