/**
 * tiResolve - App Mobile (Entry Point)
 * Configuracao de navegacao e estrutura principal do app.
 * Compativel com Expo 52 / React 18 / React Navigation 6.
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { isAuthenticated } from './services/api';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ListaChamadosScreen from './screens/ListaChamadosScreen';
import NovoChamadoScreen from './screens/NovoChamadoScreen';
import DetalheChamadoScreen from './screens/DetalheChamadoScreen';
import NotificationBell from './components/NotificationBell';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Navegacao por abas para usuario autenticado.
 */
function TabNavigator() {
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
                component={DashboardScreen}
                options={{
                    title: 'Inicio',
                    headerTitle: 'tiResolve',
                    headerRight: () => <NotificationBell />,
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>🏠</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Chamados"
                component={ListaChamadosScreen}
                options={{
                    title: 'Chamados',
                    headerRight: () => <NotificationBell />,
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
 * App principal com stack navigator.
 */
export default function App() {
    const [verificando, setVerificando] = useState(true);
    const [autenticado, setAutenticado] = useState(false);

    useEffect(() => {
        verificarAuth();
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

    if (verificando) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
                <ActivityIndicator size="large" color="#6C63FF" />
                <Text style={{ color: '#a0a0b0', marginTop: 16 }}>Carregando...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: '#1a1a2e' },
                    headerTintColor: '#fff',
                    contentStyle: { backgroundColor: '#0f0f1a' },
                }}
            >
                {!autenticado ? (
                    <Stack.Screen
                        name="Login"
                        options={{ headerShown: false }}
                    >
                        {(props) => (
                            <LoginScreen
                                {...props}
                                onLoginSuccess={() => setAutenticado(true)}
                            />
                        )}
                    </Stack.Screen>
                ) : (
                    <>
                        <Stack.Screen
                            name="Main"
                            component={TabNavigator}
                            options={{ headerShown: false }}
                        />
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
