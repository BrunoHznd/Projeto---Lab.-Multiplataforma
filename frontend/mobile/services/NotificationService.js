/**
 * tiResolve - Serviço de Notificações
 * Polling em background para verificar novas notificações.
 * Usa Vibration para feedback háptico estilo game.
 */

import { Vibration } from 'react-native';
import { contagemNaoLidas, listarNotificacoes } from './api';

let intervalId = null;
let onNewNotification = null;
let onCountUpdate = null;
let lastCount = 0;

/**
 * Inicia o polling de notificações.
 * @param {Function} onNew - Callback chamado com array de novas notificações
 * @param {Function} onCount - Callback chamado com contagem de não lidas
 * @param {number} intervalMs - Intervalo em ms (padrão: 30s)
 */
export const startPolling = (onNew, onCount, intervalMs = 30000) => {
    onNewNotification = onNew;
    onCountUpdate = onCount;
    lastCount = 0;

    // Primeira verificação imediata
    checkNotifications();

    // Inicia loop
    intervalId = setInterval(checkNotifications, intervalMs);
};

/**
 * Para o polling de notificações.
 */
export const stopPolling = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    onNewNotification = null;
    onCountUpdate = null;
    lastCount = 0;
};

/**
 * Verificação única de notificações.
 */
const checkNotifications = async () => {
    try {
        const count = await contagemNaoLidas();

        // Atualiza contagem
        if (onCountUpdate) {
            onCountUpdate(count);
        }

        // Sincroniza contagem com background task (evita duplicatas)
        try {
            const { sincronizarContagem } = require('./BackgroundNotificationTask');
            sincronizarContagem(count);
        } catch (e) {
            // Ignora se módulo não disponível
        }

        // Se há novas notificações desde último check
        if (count > lastCount && lastCount >= 0) {
            const novas = await listarNotificacoes(true);

            // Pega apenas as realmente novas (quantidade que aumentou)
            const qtdNovas = count - lastCount;
            const notificacoesNovas = novas.slice(0, qtdNovas);

            if (notificacoesNovas.length > 0 && onNewNotification) {
                // Vibração estilo game: padrão curto-longo
                Vibration.vibrate([0, 100, 50, 200]);
                onNewNotification(notificacoesNovas);
            }
        }

        lastCount = count;
    } catch (error) {
        // Ignora erros silenciosamente (pode ser problema de rede)
        console.log('Polling notificações:', error.message);
    }
};

/**
 * Força uma verificação imediata (útil após login).
 */
export const forceCheck = () => {
    lastCount = 0;
    checkNotifications();
};
