/**
 * tiResolve Web - WebSocket Context
 * Centraliza a conexao WebSocket em um unico lugar.
 * Qualquer componente pode escutar eventos chamando useWebSocket().
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../services/api';

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

        // Limpa conexao anterior
        if (wsRef.current && wsRef.current.readyState <= 1) {
            return; // ja conectado ou conectando
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
                // Distribui o evento para todos os listeners registrados
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
            // Reconexao automatica apos 3 segundos
            if (event.code !== 1008) { // 1008 = policy violation (token invalido)
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
    }, []); // Sem deps - usa refs e localStorage diretamente

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
    }, [user?.id]); // Reconecta apenas se o usuario mudou (login/logout)

    // Funcao para registrar um listener de eventos
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

/**
 * Hook para escutar eventos WebSocket.
 * @param {string|null} eventType - Tipo de evento para filtrar (ex: 'CHAMADO_CRIADO'), ou null para todos.
 * @param {function} handler - Funcao chamada com o evento (data) quando o tipo corresponde.
 * @param {array} deps - Dependencias do handler.
 */
export function useWebSocketEvent(eventType, handler, deps = []) {
    const ctx = useContext(WebSocketContext);
    const handlerRef = useRef(handler);
    
    // Sempre manter a ref atualizada com o handler mais recente
    useEffect(() => {
        handlerRef.current = handler;
    });
    
    useEffect(() => {
        if (!ctx) return;
        
        const wrappedHandler = (data) => {
            // Se eventType for null, chama pra tudo; senao filtra pelo type
            if (eventType === null || data.type === eventType) {
                handlerRef.current(data);
            }
        };
        
        const removeListener = ctx.addListener(wrappedHandler);
        return removeListener;
    }, [ctx, eventType]);
}

export default WebSocketContext;