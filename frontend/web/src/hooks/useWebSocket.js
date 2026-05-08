/**
 * tiResolve - Hook de WebSocket
 * Conecta ao backend via WS e dispara callback em eventos.
 * Reconecta automaticamente em caso de queda.
 */

import { useEffect, useRef, useCallback } from 'react';

const WS_RECONNECT_MS = 3000;

export default function useWebSocket(onEvent) {
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    const connect = useCallback(() => {
        const token = localStorage.getItem('tiresolve_token');
        if (!token) return;

        // Derive WS URL from API URL
        const apiUrl = process.env.REACT_APP_API_URL || window.location.origin + '/api';
        const wsBase = apiUrl.replace(/^http/, 'ws');
        const url = `${wsBase}/ws/chamados?token=${token}`;

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Conectado');
            };

            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (onEventRef.current) onEventRef.current(msg.event, msg.data);
                } catch { /* ignore bad json */ }
            };

            ws.onclose = () => {
                console.log('[WS] Desconectado, reconectando...');
                reconnectTimer.current = setTimeout(connect, WS_RECONNECT_MS);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent reconnect on unmount
                wsRef.current.close();
            }
        };
    }, [connect]);
}
