/**
 * tiResolve - Background Notification Task
 * Verifica novas notificações periodicamente em background.
 * Funciona mesmo com o app FECHADO (sem Firebase).
 * 
 * Usa expo-task-manager + expo-background-fetch:
 * - Android: WorkManager (~15 min intervalo)
 * - iOS: Background App Refresh
 * 
 * Quando encontra novas notificações, cria notificações LOCAIS
 * que aparecem na barra de notificações do celular.
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const BACKGROUND_NOTIFICATION_TASK = 'TIRESOLVE_BG_NOTIF_CHECK';
const LAST_BG_COUNT_KEY = '@tiresolve_bg_notif_count';

/**
 * Define a tarefa de background (DEVE estar no escopo do módulo).
 * Essa função é executada pelo SO mesmo com o app fechado.
 */
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
    try {
        const token = await AsyncStorage.getItem('@tiresolve_token');
        if (!token) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const apiUrl = await AsyncStorage.getItem('@tiresolve_api_url');
        if (!apiUrl) {
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        // Verifica contagem de notificações não lidas
        const countRes = await fetch(`${apiUrl}/notificacoes/contagem`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!countRes.ok) {
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        const { nao_lidas } = await countRes.json();
        const lastCount = parseInt(
            await AsyncStorage.getItem(LAST_BG_COUNT_KEY) || '0',
            10
        );

        if (nao_lidas > lastCount) {
            // Busca as notificações não lidas
            const notifsRes = await fetch(
                `${apiUrl}/notificacoes/?nao_lidas=true&limit=10`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (notifsRes.ok) {
                const notifs = await notifsRes.json();
                const qtdNovas = Math.min(nao_lidas - lastCount, notifs.length);
                const novasNotifs = notifs.slice(0, qtdNovas);

                // Cria notificação LOCAL para cada nova
                for (const notif of novasNotifs) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: notif.titulo,
                            body: notif.corpo,
                            data: {
                                chamado_id: notif.chamado_id,
                                tipo: notif.tipo,
                            },
                            sound: 'default',
                            ...(Platform.OS === 'android' && {
                                channelId: 'tiresolve-tickets',
                            }),
                        },
                        trigger: null, // Mostra imediatamente
                    });
                }
            }

            await AsyncStorage.setItem(LAST_BG_COUNT_KEY, String(nao_lidas));
            return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        await AsyncStorage.setItem(LAST_BG_COUNT_KEY, String(nao_lidas));
        return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
        console.log('[BG Task] Erro:', error.message);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

/**
 * Registra a tarefa de background fetch.
 * Deve ser chamado após o login.
 */
export async function registrarBackgroundTask() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_NOTIFICATION_TASK
        );
        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
                minimumInterval: 15 * 60, // 15 minutos (mínimo do Android)
                stopOnTerminate: false,   // Continua após app fechado
                startOnBoot: true,        // Reinicia após reboot
            });
            console.log('[BG Task] Registrada com sucesso');
        }
    } catch (error) {
        console.log('[BG Task] Erro ao registrar:', error.message);
    }
}

/**
 * Cancela a tarefa de background (usado no logout).
 */
export async function cancelarBackgroundTask() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_NOTIFICATION_TASK
        );
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        }
        await AsyncStorage.removeItem(LAST_BG_COUNT_KEY);
    } catch (error) {
        console.log('[BG Task] Erro ao cancelar:', error.message);
    }
}

/**
 * Atualiza a contagem salva (sincroniza com polling em foreground).
 */
export async function sincronizarContagem(count) {
    await AsyncStorage.setItem(LAST_BG_COUNT_KEY, String(count));rq3qrqrq
}
