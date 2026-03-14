/**
 * tiResolve - Tela de Novo Chamado
 * Formulário para abrir um chamado técnico.
 */

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator,
    ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { criarChamado } from '../services/api';

const PRIORIDADES = [
    { value: 'BAIXA', label: '🟢 Baixa', cor: '#6BCB77' },
    { value: 'MEDIA', label: '🟡 Média', cor: '#FFD93D' },
    { value: 'ALTA', label: '🟠 Alta', cor: '#FF8C00' },
    { value: 'CRITICA', label: '🔴 Crítica', cor: '#FF6B6B' },
];

export default function NovoChamadoScreen({ navigation }) {
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [prioridade, setPrioridade] = useState('MEDIA');
    const [enviando, setEnviando] = useState(false);

    const handleEnviar = async () => {
        if (!titulo.trim()) {
            Alert.alert('Atenção', 'Informe o título do chamado.');
            return;
        }
        if (!descricao.trim()) {
            Alert.alert('Atenção', 'Descreva o problema.');
            return;
        }

        setEnviando(true);
        try {
            await criarChamado({
                titulo: titulo.trim(),
                descricao: descricao.trim(),
                prioridade,
            });
            Alert.alert(
                'Sucesso! ✅',
                'Chamado aberto com sucesso. A equipe técnica foi notificada.',
                [{ text: 'OK', onPress: () => navigation.navigate('Chamados') }]
            );
            setTitulo('');
            setDescricao('');
            setPrioridade('MEDIA');
        } catch (error) {
            const msg = error.response?.data?.detail || 'Erro ao criar chamado.';
            Alert.alert('Erro', msg);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Título */}
                <Text style={styles.label}>Título do Chamado *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Computador não liga no Lab 3"
                    placeholderTextColor="#666"
                    value={titulo}
                    onChangeText={setTitulo}
                    maxLength={200}
                />

                {/* Descrição */}
                <Text style={styles.label}>Descrição do Problema *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Descreva o problema com detalhes: o que acontece, em qual máquina, etc."
                    placeholderTextColor="#666"
                    value={descricao}
                    onChangeText={setDescricao}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                />

                {/* Prioridade */}
                <Text style={styles.label}>Prioridade</Text>
                <View style={styles.prioridadeContainer}>
                    {PRIORIDADES.map((p) => (
                        <TouchableOpacity
                            key={p.value}
                            style={[
                                styles.prioridadeBotao,
                                prioridade === p.value && {
                                    borderColor: p.cor,
                                    backgroundColor: p.cor + '20',
                                },
                            ]}
                            onPress={() => setPrioridade(p.value)}
                        >
                            <Text style={[
                                styles.prioridadeTexto,
                                prioridade === p.value && { color: p.cor },
                            ]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Anexos (placeholder) */}
                <Text style={styles.label}>Anexos (em breve)</Text>
                <View style={styles.anexosContainer}>
                    <TouchableOpacity style={styles.anexoBotao} disabled>
                        <Text style={styles.anexoTexto}>📷 Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.anexoBotao} disabled>
                        <Text style={styles.anexoTexto}>🎤 Áudio</Text>
                    </TouchableOpacity>
                </View>

                {/* Botão enviar */}
                <TouchableOpacity
                    style={[styles.enviarBotao, enviando && styles.desabilitado]}
                    onPress={handleEnviar}
                    disabled={enviando}
                >
                    {enviando ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.enviarTexto}>📨 Abrir Chamado</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    scroll: {
        padding: 20,
        paddingBottom: 40,
    },
    label: {
        color: '#a0a0b0',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#16213e',
        borderRadius: 10,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#1a4a7a',
    },
    textArea: {
        minHeight: 120,
    },
    prioridadeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    prioridadeBotao: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#333',
        backgroundColor: '#16213e',
    },
    prioridadeTexto: {
        color: '#a0a0b0',
        fontSize: 14,
        fontWeight: '600',
    },
    anexosContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    anexoBotao: {
        backgroundColor: '#16213e',
        borderRadius: 10,
        padding: 14,
        flex: 1,
        alignItems: 'center',
        opacity: 0.5,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
    },
    anexoTexto: {
        color: '#666',
        fontSize: 14,
    },
    enviarBotao: {
        backgroundColor: '#6C63FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    desabilitado: {
        opacity: 0.7,
    },
    enviarTexto: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
