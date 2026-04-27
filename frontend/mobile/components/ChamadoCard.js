/**
 * tiResolve - Componente ChamadoCard
 * Card reutilizável para exibição de chamado na lista.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const STATUS_CONFIG = {
    ABERTO: { cor: '#FF6B6B', emoji: '🔴', label: 'Aberto' },
    EM_ATENDIMENTO: { cor: '#FFD93D', emoji: '🟡', label: 'Em Atendimento' },
    FINALIZADO: { cor: '#6BCB77', emoji: '🟢', label: 'Finalizado' },
};

const PRIORIDADE_CONFIG = {
    NENHUMA: { cor: '#666', label: '-' },
    BAIXA: { cor: '#6BCB77', label: 'Baixa' },
    MEDIA: { cor: '#FFD93D', label: 'Média' },
    ALTA: { cor: '#FF8C00', label: 'Alta' },
    CRITICA: { cor: '#FF6B6B', label: 'Crítica' },
};

export default function ChamadoCard({ chamado, onPress }) {
    const statusConfig = STATUS_CONFIG[chamado.status] || STATUS_CONFIG.ABERTO;
    const prioridadeConfig = PRIORIDADE_CONFIG[chamado.prioridade] || PRIORIDADE_CONFIG.NENHUMA;

    const formatarData = (dataStr) => {
        const data = new Date(dataStr);
        return data.toLocaleDateString('pt-BR');
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            {/* Indicador de status lateral */}
            <View style={[styles.indicador, { backgroundColor: statusConfig.cor }]} />

            <View style={styles.conteudo}>
                {/* Título e ID */}
                <View style={styles.topo}>
                    <Text style={styles.titulo} numberOfLines={2}>
                        {chamado.titulo}
                    </Text>
                    <Text style={styles.id}>#{chamado.id}</Text>
                </View>

                {/* Descrição */}
                <Text style={styles.descricao} numberOfLines={2}>
                    {chamado.descricao}
                </Text>

                {/* Badges e data */}
                <View style={styles.rodape}>
                    <View style={styles.badges}>
                        <View style={[styles.badge, { backgroundColor: statusConfig.cor + '20' }]}>
                            <Text style={[styles.badgeTexto, { color: statusConfig.cor }]}>
                                {statusConfig.emoji} {statusConfig.label}
                            </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: prioridadeConfig.cor + '20' }]}>
                            <Text style={[styles.badgeTexto, { color: prioridadeConfig.cor }]}>
                                {prioridadeConfig.label}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.data}>{formatarData(chamado.created_at)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: '#16213e',
        borderRadius: 12,
        marginHorizontal: 12,
        marginVertical: 4,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    indicador: {
        width: 4,
    },
    conteudo: {
        flex: 1,
        padding: 14,
    },
    topo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    titulo: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginRight: 8,
    },
    id: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
    },
    descricao: {
        color: '#a0a0b0',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    rodape: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badges: {
        flexDirection: 'row',
        gap: 6,
    },
    badge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    badgeTexto: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    data: {
        color: '#666',
        fontSize: 11,
    },
});
