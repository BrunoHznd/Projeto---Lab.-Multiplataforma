/**
 * tiResolve - Serviço de Configuração de Notificações
 * Configura canal Android e handler de notificações locais.
 * NÃO usa Firebase - trabalha com notificações LOCAIS criadas
 * pelo BackgroundNotificationTask e pelo polling in-app.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Configura o canal de notificação Android.
 * Necessário para Android 8+ (API 26+).
 */
export async function configurarCanalAndroid() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('tiresolve-tickets', {
            name: 'Chamados tiResolve',
            description: 'Notificações de alterações em chamados técnicos',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 100, 50, 200],
            lightColor: '#6C63FF',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        });
    }
}

/**
 * Solicita permissão de notificações ao usuário.
 * @returns {boolean} true se permissão concedida
 */
export async function solicitarPermissaoNotificacoes() {
    try {
        if (!Device.isDevice) {
            console.log('Notificações requerem dispositivo físico');
            return false;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Permissão de notificação negada pelo usuário');
            return false;
        }

        return true;
    } catch (error) {
        console.log('Erro ao solicitar permissão:', error.message);
        return false;
    }
}

/**
 * Configura o handler de notificações.
 * 
 * Quando o app está aberto:
 * - Mostra a notificação na barra de status (igual rede social)
 * - Toca som de notificação
 * 
 * Quando o app está fechado/background:
 * - O sistema exibe automaticamente (notificação local criada pelo BG Task)
 */
export function configurarNotificationHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,   // Mostra notificação sempre
            shouldPlaySound: true,   // Toca som
            shouldSetBadge: true,    // Atualiza badge no ícone
        }),
    });
}

/**
 * Inicializa tudo: canal, permissão e handler.
 * Chamado após login.
 */
export async function inicializarNotificacoes() {
    await configurarCanalAndroid();
    await solicitarPermissaoNotificacoes();
}

/**
 * Adiciona listener para quando o usuário toca numa notificação.
 * Retorna a função de cleanup para remover o listener.
 * 
 * @param {function} navigationRef - Referência do NavigationContainer
 * @returns {function} Cleanup function para remover listener
 */
export function adicionarListenerNotificacaoTocada(navigationRef) {
    const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            const data = response.notification.request.content.data;
            
            // Navega para o chamado se tiver chamado_id
            if (data?.chamado_id && navigationRef?.isReady()) {
                navigationRef.navigate('DetalheChamado', { id: data.chamado_id });
            }
        }
    );

    return () => subscription.remove();
}
