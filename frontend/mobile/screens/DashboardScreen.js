/**
 * tiResolve - Tela de Dashboard
 * Visão geral com contadores de chamados e acesso rápido.
 */

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarChamados, getUsuarioLogado } from '../services/api';

export default function DashboardScreen({ navigation, onLogout }) {
    const [usuario, setUsuario] = useState(null);
    const [contadores, setContadores] = useState({
        abertos: 0,
        em_atendimento: 0,
        finalizados: 0,
        total: 0,
    });
    const [atualizando, setAtualizando] = useState(false);

    // Carrega dados ao focar na tela
    useFocusEffect(
        useCallback(() => {
            carregarDados();
        }, [])
    );

    const carregarDados = async () => {
        setAtualizando(true);
        try {
            const user = await getUsuarioLogado();
            setUsuario(user);

            const chamados = await listarChamados();
            setContadores({
                abertos: chamados.filter(c => c.status === 'ABERTO').length,
                em_atendimento: chamados.filter(c => c.status === 'EM_ATENDIMENTO').length,
                finalizados: chamados.filter(c => c.status === 'FINALIZADO').length,
                total: chamados.length,
            });
        } catch (error) {
            console.log('Erro ao carregar dashboard:', error.message);
        } finally {
            setAtualizando(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Sair', 'Deseja realmente sair?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair', style: 'destructive', onPress: () => {
                    if (onLogout) onLogout();
                }
            },
        ]);
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={atualizando} onRefresh={carregarDados} tintColor="#6C63FF" />
            }
        >
            {/* Saudação */}
            <View style={styles.saudacao}>
                <Text style={styles.ola}>Olá, {usuario?.nome || 'Usuário'} 👋</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.sairTexto}>Sair</Text>
                </TouchableOpacity>
            </View>

            {/* Cards de contadores */}
            <View style={styles.cardsContainer}>
                <View style={[styles.card, { borderLeftColor: '#FF6B6B' }]}>
                    <Text style={styles.cardNumero}>{contadores.abertos}</Text>
                    <Text style={styles.cardLabel}>Abertos</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: '#FFD93D' }]}>
                    <Text style={styles.cardNumero}>{contadores.em_atendimento}</Text>
                    <Text style={styles.cardLabel}>Em Atendimento</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: '#6BCB77' }]}>
                    <Text style={styles.cardNumero}>{contadores.finalizados}</Text>
                    <Text style={styles.cardLabel}>Finalizados</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: '#6C63FF' }]}>
                    <Text style={styles.cardNumero}>{contadores.total}</Text>
                    <Text style={styles.cardLabel}>Total</Text>
                </View>
            </View>

            {/* Ações rápidas */}
            <Text style={styles.secaoTitulo}>Ações Rápidas</Text>
            <View style={styles.acoes}>
                <TouchableOpacity
                    style={styles.acaoBotao}
                    onPress={() => navigation.navigate('NovoChamado')}
                >
                    <Text style={styles.acaoEmoji}>🆕</Text>
                    <Text style={styles.acaoTexto}>Abrir Chamado</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.acaoBotao}
                    onPress={() => navigation.navigate('Chamados')}
                >
                    <Text style={styles.acaoEmoji}>📋</Text>
                    <Text style={styles.acaoTexto}>Ver Chamados</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        padding: 16,
    },
    saudacao: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    ola: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    sairTexto: {
        color: '#FF6B6B',
        fontSize: 16,
        fontWeight: '600',
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    cardNumero: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    cardLabel: {
        fontSize: 13,
        color: '#a0a0b0',
        marginTop: 4,
    },
    secaoTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    acoes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    acaoBotao: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '48%',
        borderWidth: 1,
        borderColor: '#1a4a7a',
    },
    acaoEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    acaoTexto: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
