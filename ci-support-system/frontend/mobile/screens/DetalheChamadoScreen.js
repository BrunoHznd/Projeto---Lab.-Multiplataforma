/**
 * tiResolve - Detalhe do Chamado
 * Exibe detalhes, logs e permite adicionar mensagens.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { obterChamado, listarLogs, adicionarLog } from '../services/api';

const STATUS_CORES = {
    ABERTO: '#FF6B6B',
    EM_ATENDIMENTO: '#FFD93D',
    FINALIZADO: '#6BCB77',
};

const PRIORIDADE_CORES = {
    BAIXA: '#6BCB77',
    MEDIA: '#FFD93D',
    ALTA: '#FF8C00',
    CRITICA: '#FF6B6B',
};

export default function DetalheChamadoScreen({ route }) {
    const { id } = route.params;
    const [chamado, setChamado] = useState(null);
    const [logs, setLogs] = useState([]);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [enviandoLog, setEnviandoLog] = useState(false);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const [chamadoData, logsData] = await Promise.all([
                obterChamado(id),
                listarLogs(id),
            ]);
            setChamado(chamadoData);
            setLogs(logsData);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar o chamado.');
        } finally {
            setCarregando(false);
        }
    };

    const handleEnviarLog = async () => {
        if (!novaMensagem.trim()) return;

        setEnviandoLog(true);
        try {
            await adicionarLog(id, novaMensagem.trim());
            setNovaMensagem('');
            // Recarrega logs
            const logsData = await listarLogs(id);
            setLogs(logsData);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
        } finally {
            setEnviandoLog(false);
        }
    };

    const formatarData = (dataStr) => {
        const data = new Date(dataStr);
        return data.toLocaleDateString('pt-BR') + ' ' +
            data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    if (carregando) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    if (!chamado) {
        return (
            <View style={styles.center}>
                <Text style={styles.erroTexto}>Chamado não encontrado</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll}>
                {/* Cabeçalho do chamado */}
                <View style={styles.header}>
                    <Text style={styles.titulo}>{chamado.titulo}</Text>
                    <View style={styles.badges}>
                        <View style={[styles.badge, { backgroundColor: STATUS_CORES[chamado.status] + '20' }]}>
                            <Text style={[styles.badgeTexto, { color: STATUS_CORES[chamado.status] }]}>
                                {chamado.status.replace('_', ' ')}
                            </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: PRIORIDADE_CORES[chamado.prioridade] + '20' }]}>
                            <Text style={[styles.badgeTexto, { color: PRIORIDADE_CORES[chamado.prioridade] }]}>
                                {chamado.prioridade}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Informações */}
                <View style={styles.info}>
                    <Text style={styles.descricao}>{chamado.descricao}</Text>
                    <View style={styles.metadados}>
                        <Text style={styles.metaTexto}>
                            📅 Aberto em: {formatarData(chamado.created_at)}
                        </Text>
                        <Text style={styles.metaTexto}>
                            👤 Solicitante: {chamado.usuario?.nome || 'N/A'}
                        </Text>
                        {chamado.tecnico && (
                            <Text style={styles.metaTexto}>
                                🔧 Técnico: {chamado.tecnico.nome}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Histórico de logs */}
                <Text style={styles.secaoTitulo}>💬 Histórico ({logs.length})</Text>
                {logs.length === 0 ? (
                    <Text style={styles.semLogs}>Nenhuma mensagem ainda.</Text>
                ) : (
                    logs.map((log) => (
                        <View key={log.id} style={styles.logItem}>
                            <View style={styles.logHeader}>
                                <Text style={styles.logAutor}>{log.autor?.nome || 'Sistema'}</Text>
                                <Text style={styles.logData}>{formatarData(log.created_at)}</Text>
                            </View>
                            <Text style={styles.logMensagem}>{log.mensagem}</Text>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Input de nova mensagem */}
            {chamado.status !== 'FINALIZADO' && (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.inputMensagem}
                        placeholder="Adicionar mensagem..."
                        placeholderTextColor="#666"
                        value={novaMensagem}
                        onChangeText={setNovaMensagem}
                        multiline
                    />
                    <TouchableOpacity
                        style={styles.enviarBotao}
                        onPress={handleEnviarLog}
                        disabled={enviandoLog || !novaMensagem.trim()}
                    >
                        {enviandoLog ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.enviarTexto}>📤</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
    erroTexto: {
        color: '#FF6B6B',
        fontSize: 16,
    },
    scroll: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginBottom: 16,
    },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    badges: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    badgeTexto: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    info: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    descricao: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
    },
    metadados: {
        borderTopWidth: 1,
        borderTopColor: '#0f3460',
        paddingTop: 12,
        gap: 6,
    },
    metaTexto: {
        color: '#a0a0b0',
        fontSize: 13,
    },
    secaoTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    semLogs: {
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    },
    logItem: {
        backgroundColor: '#16213e',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    logAutor: {
        color: '#6C63FF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    logData: {
        color: '#666',
        fontSize: 12,
    },
    logMensagem: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#16213e',
        borderTopWidth: 1,
        borderTopColor: '#0f3460',
        alignItems: 'flex-end',
        gap: 8,
    },
    inputMensagem: {
        flex: 1,
        backgroundColor: '#0f3460',
        borderRadius: 10,
        padding: 12,
        color: '#FFFFFF',
        fontSize: 14,
        maxHeight: 100,
    },
    enviarBotao: {
        backgroundColor: '#6C63FF',
        borderRadius: 10,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    enviarTexto: {
        fontSize: 20,
    },
});
