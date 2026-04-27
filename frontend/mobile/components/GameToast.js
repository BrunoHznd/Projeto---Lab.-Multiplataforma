/**
 * tiResolve - GameToast Component
 * Notificação animada estilo "conquista de jogo" que desliza do topo.
 * Suporta 3 tipos visuais: STATUS (roxo), MENSAGEM (azul), FINALIZADO (verde).
 */

import React, { useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Animated, Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const TIPO_CONFIG = {
    STATUS: {
        gradientStart: '#6C63FF',
        gradientEnd: '#5a52d5',
        icon: '🔧',
        glow: 'rgba(108, 99, 255, 0.4)',
    },
    MENSAGEM: {
        gradientStart: '#4FC3F7',
        gradientEnd: '#0288D1',
        icon: '💬',
        glow: 'rgba(79, 195, 247, 0.4)',
    },
    FINALIZADO: {
        gradientStart: '#6BCB77',
        gradientEnd: '#4CAF50',
        icon: '✅',
        glow: 'rgba(107, 203, 119, 0.4)',
    },
};

export default function GameToast({ notificacao, onPress, onDismiss }) {
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(1)).current;

    const config = TIPO_CONFIG[notificacao?.tipo] || TIPO_CONFIG.STATUS;

    useEffect(() => {
        // === ENTRADA: Spring bounce ===
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // === PULSE no ícone ===
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // === Barra de progresso (XP bar) ===
        Animated.timing(progressAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: false,
        }).start();

        // === AUTO-DISMISS após 4 segundos ===
        const timer = setTimeout(() => {
            dismissToast();
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    const dismissToast = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -200,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onDismiss) onDismiss();
        });
    };

    const handlePress = () => {
        dismissToast();
        if (onPress) onPress(notificacao);
    };

    if (!notificacao) return null;

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <TouchableOpacity
                style={[styles.toast, { backgroundColor: config.gradientStart }]}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                {/* Glow effect */}
                <View style={[styles.glowOverlay, { backgroundColor: config.glow }]} />

                {/* Conteúdo */}
                <View style={styles.content}>
                    {/* Ícone pulsante */}
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <Text style={styles.icon}>{config.icon}</Text>
                    </Animated.View>

                    {/* Textos */}
                    <View style={styles.textContainer}>
                        <Text style={styles.titulo} numberOfLines={1}>
                            {notificacao.titulo}
                        </Text>
                        {notificacao.corpo && (
                            <Text style={styles.corpo} numberOfLines={2}>
                                {notificacao.corpo}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Barra de progresso estilo XP */}
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                width: progressWidth,
                                backgroundColor: config.gradientEnd,
                            },
                        ]}
                    />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 999,
    },
    toast: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 20,
    },
    glowOverlay: {
        position: 'absolute',
        top: -20,
        left: -20,
        right: -20,
        bottom: -20,
        borderRadius: 30,
        opacity: 0.3,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 26,
    },
    textContainer: {
        flex: 1,
    },
    titulo: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    corpo: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        marginTop: 3,
        lineHeight: 18,
    },
    progressTrack: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
});
