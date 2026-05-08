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
import { FontAwesome5 } from '@expo/vector-icons';

export default function DashboardScreen({ navigation, onLogout }) {
    const [usuario, setUsuario] = useState(null);
    const [contadores, setContadores] = useState({
        abertos: 0,
        em_atendimento: 0,
        finalizados: 0,
        total: 0,
    });
    const [ticketsEmAndamento, setTicketsEmAndamento] = useState([]);
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

            const emAndamento = chamados
                .filter(c => c.status === 'EM_ATENDIMENTO')
                .sort((a, b) => {
                    const da = new Date(a.updated_at || a.created_at || 0);
                    const db = new Date(b.updated_at || b.created_at || 0);
                    return db - da;
                })
                .slice(0, 3);
            setTicketsEmAndamento(emAndamento);
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
                <Text style={styles.ola}>Olá, {usuario?.nome || 'Usuário'}</Text>
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

            {/* Tickets Em Andamento */}
            <Text style={styles.secaoTitulo}>Em Andamento</Text>
            {ticketsEmAndamento.length === 0 ? (
                <View style={styles.semTickets}>
                    <FontAwesome5 name="check-circle" size={28} color="#6BCB77" style={{ marginBottom: 8 }} />
                    <Text style={styles.semTicketsTexto}>Nenhum chamado em andamento</Text>
                </View>
            ) : (
                ticketsEmAndamento.map(ticket => (
                    <TouchableOpacity
                        key={ticket.id}
                        style={styles.ticketCard}
                        onPress={() => navigation.navigate('DetalheChamado', { chamadoId: ticket.id })}
                        activeOpacity={0.75}
                    >
                        <View style={styles.ticketHeader}>
                            <Text style={styles.ticketId}>#{ticket.id}</Text>
                            <View style={styles.ticketBadge}>
                                <Text style={styles.ticketBadgeTexto}>Em Andamento</Text>
                            </View>
                        </View>
                        <Text style={styles.ticketTitulo} numberOfLines={2}>{ticket.titulo}</Text>
                        <View style={styles.ticketFooter}>
                            <FontAwesome5 name="user" size={11} color="#a0a0b0" />
                            <Text style={styles.ticketMeta}>
                                {ticket.tecnico_nome || ticket.tecnico?.nome || 'Sem técnico'}
                            </Text>
                            <FontAwesome5 name="tag" size={11} color="#a0a0b0" style={{ marginLeft: 10 }} />
                            <Text style={styles.ticketMeta}>{ticket.categoria || '—'}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
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
    semTickets: {
        alignItems: 'center',
        paddingVertical: 28,
        backgroundColor: '#16213e',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1a4a7a',
    },
    semTicketsTexto: {
        color: '#a0a0b0',
        fontSize: 14,
    },
    ticketCard: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD93D',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    ticketId: {
        color: '#6C63FF',
        fontWeight: '700',
        fontSize: 13,
    },
    ticketBadge: {
        backgroundColor: 'rgba(255,217,61,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    ticketBadgeTexto: {
        color: '#FFD93D',
        fontSize: 11,
        fontWeight: '600',
    },
    ticketTitulo: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    ticketFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ticketMeta: {
        color: '#a0a0b0',
        fontSize: 12,
        marginLeft: 4,
    },
});
