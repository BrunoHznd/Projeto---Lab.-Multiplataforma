/**
 * tiResolve Desktop - WebSocket Context
 * Centraliza a conexao WebSocket em um unico lugar.
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ user, children }) {
    const wsRef = useRef(null);
    const listenersRef = useRef(new Set());
    const reconnectTimeoutRef = useRef(null);
    const isConnectingRef = useRef(false);

    const connectWs = useCallback(() => {
        if (isConnectingRef.current) return;
        
        const token = localStorage.getItem('tiresolve_token');
        if (!token) return;

        if (wsRef.current && wsRef.current.readyState <= 1) {
            return;
        }

        isConnectingRef.current = true;
        const wsUrl = API_URL.replace(/^http/, 'ws') + `/notificacoes/ws?token=${token}`;
        console.log('[WS] Conectando...', wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WS] Conectado!');
            isConnectingRef.current = false;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[WS] Evento recebido:', data.type, data);
                listenersRef.current.forEach(listener => {
                    try { listener(data); } catch (e) { console.error('[WS] Erro no listener:', e); }
                });
            } catch (e) {
                console.error('[WS] Erro ao parsear mensagem:', e);
            }
        };

        ws.onclose = (event) => {
            console.log('[WS] Desconectado. Code:', event.code);
            isConnectingRef.current = false;
            wsRef.current = null;
            if (event.code !== 1008) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWs();
                }, 3000);
            }
        };

        ws.onerror = (e) => {
            console.error('[WS] Erro:', e);
            isConnectingRef.current = false;
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        if (user) {
            connectWs();
        }
        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            isConnectingRef.current = false;
        };
    }, [user?.id]);

    const addListener = useCallback((listener) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
    }, []);

    const contextValue = React.useMemo(() => ({ addListener }), [addListener]);

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocketEvent(eventType, handler, deps = []) {
    const ctx = useContext(WebSocketContext);
    const handlerRef = useRef(handler);
    
    useEffect(() => {
        handlerRef.current = handler;
    });
    
    useEffect(() => {
        if (!ctx) return;
        
        const wrappedHandler = (data) => {
            if (eventType === null || data.type === eventType) {
                handlerRef.current(data);
            }
        };
        
        const removeListener = ctx.addListener(wrappedHandler);
        return removeListener;
    }, [ctx, eventType]);
}

export default WebSocketContext;
