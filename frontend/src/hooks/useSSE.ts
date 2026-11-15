import { useEffect, useRef, useState } from 'react';

export interface SSECallbacks {
  onTranscriptUpdate?: (data: any) => void;
  onIncidentUpdate?: (data: any) => void;
  onUnitUpdate?: (data: any) => void;
  onStatusChange?: (data: any) => void;
}

export function useSSE(role: 'caller' | 'operator' = 'caller', callbacks: SSECallbacks = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventId, setLastEventId] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;

      const token = role === 'operator' 
        ? localStorage.getItem('responseos_operator_token')
        : localStorage.getItem('responseos_caller_token');

      if (!token) {
        // Retry shortly when token becomes available
        reconnectTimeoutRef.current = setTimeout(connect, 1000);
        return;
      }

      const url = new URL(`${window.location.origin}/api/events/stream`);
      url.searchParams.set('token', token);
      url.searchParams.set('role', role);
      if (lastEventId !== null) {
        url.searchParams.set('last_event_id', String(lastEventId));
      }

      const es = new EventSource(url.toString(), { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!active) return;
        setIsConnected(true);
      };

      es.addEventListener('TRANSCRIPT_UPDATE', (e: MessageEvent) => {
        if (e.lastEventId) setLastEventId(Number(e.lastEventId));
        try {
          const data = JSON.parse(e.data);
          callbacks.onTranscriptUpdate?.(data);
        } catch {}
      });

      es.addEventListener('INCIDENT_UPDATE', (e: MessageEvent) => {
        if (e.lastEventId) setLastEventId(Number(e.lastEventId));
        try {
          const data = JSON.parse(e.data);
          callbacks.onIncidentUpdate?.(data);
        } catch {}
      });

      es.addEventListener('UNIT_UPDATE', (e: MessageEvent) => {
        if (e.lastEventId) setLastEventId(Number(e.lastEventId));
        try {
          const data = JSON.parse(e.data);
          callbacks.onUnitUpdate?.(data);
        } catch {}
      });

      es.addEventListener('STATUS_CHANGE', (e: MessageEvent) => {
        if (e.lastEventId) setLastEventId(Number(e.lastEventId));
        try {
          const data = JSON.parse(e.data);
          callbacks.onStatusChange?.(data);
        } catch {}
      });

      es.onerror = () => {
        if (!active) return;
        setIsConnected(false);
        es.close();
        // Exponential backoff reconnection
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      active = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [role, lastEventId]);

  return { isConnected };
}
