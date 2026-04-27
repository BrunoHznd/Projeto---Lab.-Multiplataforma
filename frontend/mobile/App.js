/**
 * tiResolve - App Mobile (Entry Point)
 * Configuracao de navegacao e estrutura principal do app.
 * Compativel com Expo 52 / React 18 / React Navigation 6.
 * Inclui sistema de notificacoes game-style com polling
 * + Background Fetch para notificações com app fechado (sem Firebase).
 */

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { isAuthenticated, logout } from './services/api';
import { startPolling, stopPolling, forceCheck } from './services/NotificationService';
import {
    configurarNotificationHandler,
    inicializarNotificacoes,
    adicionarListenerNotificacaoTocada,
} from './services/PushNotificationService';
import {
    registrarBackgroundTask,
    cancelarBackgroundTask,
} from './services/BackgroundNotificationTask';
import GameToast from './components/GameToast';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ListaChamadosScreen from './screens/ListaChamadosScreen';
import NovoChamadoScreen from './screens/NovoChamadoScreen';
import DetalheChamadoScreen from './screens/DetalheChamadoScreen';
import RegistroScreen from './screens/RegistroScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Configura handler de notificação ANTES do componente montar
// Garante que notificações locais sejam exibidas corretamente
configurarNotificationHandler();

/**
 * Navegacao por abas para usuario autenticado.
 */
function TabNavigator({ onLogout }) {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: '#1a1a2e',
                    borderTopColor: '#2a2a4a',
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: '#6C63FF',
                tabBarInactiveTintColor: '#666',
                headerStyle: { backgroundColor: '#1a1a2e' },
                headerTintColor: '#fff',
            }}
        >
            <Tab.Screen
                name="Dashboard"
                options={{
                    title: 'Inicio',
                    headerTitle: 'tiResolve',
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>🏠</Text>
                    ),
                }}
            >
                {(props) => <DashboardScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen
                name="Chamados"
                component={ListaChamadosScreen}
                options={{
                    title: 'Chamados',
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>📋</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="NovoChamado"
                component={NovoChamadoScreen}
                options={{
                    title: 'Novo',
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>➕</Text>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

/**
 * App principal com stack navigator, sistema de notificações
 * e background fetch (funciona fora do app sem Firebase).
 */
export default function App() {
    const [verificando, setVerificando] = useState(true);
    const [autenticado, setAutenticado] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const [toastQueue, setToastQueue] = useState([]);
    const [currentToast, setCurrentToast] = useState(null);
    const navigationRef = useNavigationContainerRef();

    useEffect(() => {
        verificarAuth();
    }, []);

    // Gerencia fila de toasts - mostra um por vez
    useEffect(() => {
        if (!currentToast && toastQueue.length > 0) {
            const [next, ...rest] = toastQueue;
            setCurrentToast(next);
            setToastQueue(rest);
        }
    }, [currentToast, toastQueue]);

    // Inicia/para polling conforme login + registra background task
    useEffect(() => {
        if (autenticado) {
            startPolling(
                (novasNotifs) => {
                    // Adiciona novas notificações à fila do toast
                    setToastQueue(prev => [...prev, ...novasNotifs]);
                },
                (count) => {
                    setNotifCount(count);
                },
                30000 // 30 segundos
            );

            // Inicializa notificações (canal + permissão) e background task
            inicializarNotificacoes();
            registrarBackgroundTask();
        } else {
            stopPolling();
            setNotifCount(0);
            setToastQueue([]);
            setCurrentToast(null);
        }

        return () => stopPolling();
    }, [autenticado]);

    // Listener para quando o usuário toca numa notificação
    useEffect(() => {
        const cleanup = adicionarListenerNotificacaoTocada(navigationRef);
        return cleanup;
    }, []);

    const verificarAuth = async () => {
        try {
            const auth = await isAuthenticated();
            setAutenticado(auth);
        } catch (e) {
            setAutenticado(false);
        }
        setVerificando(false);
    };

    const handleToastPress = (notif) => {
        setCurrentToast(null);
        // Navega para o chamado
        if (notif.chamado_id && navigationRef.isReady()) {
            navigationRef.navigate('DetalheChamado', { id: notif.chamado_id });
        }
    };

    const handleToastDismiss = () => {
        setCurrentToast(null);
    };

    const handleLoginSuccess = () => {
        setAutenticado(true);
        setTimeout(() => forceCheck(), 1000);
    };

    const handleLogout = async () => {
        stopPolling();
        setNotifCount(0);
        setToastQueue([]);
        setCurrentToast(null);

        // Cancela background task (para de verificar notificações)
        await cancelarBackgroundTask();

        await logout();
        setAutenticado(false);
    };

    if (verificando) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
                <ActivityIndicator size="large" color="#6C63FF" />
                <Text style={{ color: '#a0a0b0', marginTop: 16 }}>Carregando...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer
            ref={navigationRef}
            linking={{
                prefixes: ['tiresolve://', 'exp+tiResolve://', 'http://67.211.211.231'],
                config: {
                    screens: {
                        Login: 'login',
                        Registro: 'registro/:codigo?',
                        DetalheChamado: 'chamado/:id',
                    },
                },
            }}
        >
            <StatusBar style="light" />

            {/* Toast overlay global - renderiza acima de tudo */}
            {currentToast && (
                <GameToast
                    notificacao={currentToast}
                    onPress={handleToastPress}
                    onDismiss={handleToastDismiss}
                />
            )}

            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: '#1a1a2e' },
                    headerTintColor: '#fff',
                    contentStyle: { backgroundColor: '#0f0f1a' },
                }}
            >
                {!autenticado ? (
                    <>
                        <Stack.Screen
                            name="Login"
                            options={{ headerShown: false }}
                        >
                            {(props) => (
                                <LoginScreen
                                    {...props}
                                    onLoginSuccess={handleLoginSuccess}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen
                            name="Registro"
                            options={{ title: 'Cadastro', headerShown: false }}
                        >
                            {(props) => (
                                <RegistroScreen
                                    {...props}
                                    onLoginSuccess={handleLoginSuccess}
                                />
                            )}
                        </Stack.Screen>
                    </>
                ) : (
                    <>
                        <Stack.Screen
                            name="Main"
                            options={{ headerShown: false }}
                        >
                            {() => <TabNavigator onLogout={handleLogout} />}
                        </Stack.Screen>
                        <Stack.Screen
                            name="DetalheChamado"
                            component={DetalheChamadoScreen}
                            options={{ title: 'Detalhes do Chamado' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
