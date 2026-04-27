/**
 * tiResolve - Tela de Registro
 * Cadastro de usuário via código de organização (QR Code).
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView
} from 'react-native';
import { registrarComID, testarConexao } from '../services/api';

export default function RegistroScreen({ navigation, route, onLoginSuccess }) {
    const codigoFromRoute = route.params?.codigo || '';
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [codigo, setCodigo] = useState(codigoFromRoute);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        if (codigoFromRoute) {
            setCodigo(codigoFromRoute);
        }
    }, [codigoFromRoute]);

    const handleRegistro = async () => {
        if (!nome.trim() || !email.trim() || !senha.trim() || !codigo.trim()) {
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }

        setCarregando(true);
        try {
            const conexao = await testarConexao();
            if (!conexao.ok) {
                Alert.alert(
                    'Sem Conexão',
                    `Não foi possível conectar ao servidor.\nErro: ${conexao.error}`
                );
                setCarregando(false);
                return;
            }

            await registrarComID({
                nome: nome.trim(),
                email: email.trim(),
                senha: senha.trim(),
                codigo_organizacao: codigo.trim().toUpperCase(),
            });

            Alert.alert(
                'Cadastro Realizado! ✅',
                'Sua conta foi criada com sucesso. Bem-vindo ao tiResolve!',
                [{
                    text: 'Entrar',
                    onPress: () => {
                        if (onLoginSuccess) {
                            onLoginSuccess();
                        } else {
                            navigation.navigate('Login');
                        }
                    }
                }]
            );
        } catch (error) {
            const msg = error.response?.data?.detail || 'Erro ao criar conta.';
            Alert.alert('Erro no Cadastro', msg);
        } finally {
            setCarregando(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Cabeçalho */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>📝</Text>
                    <Text style={styles.titulo}>Criar Conta</Text>
                    <Text style={styles.subtitulo}>Use o código fornecido pelo admin</Text>
                </View>

                {/* Formulário */}
                <View style={styles.form}>
                    <Text style={styles.label}>Código da Organização</Text>
                    <TextInput
                        style={[styles.input, codigoFromRoute ? styles.inputDisabled : null]}
                        placeholder="Ex: ABC123"
                        placeholderTextColor="#666"
                        value={codigo}
                        onChangeText={setCodigo}
                        autoCapitalize="characters"
                        editable={!codigoFromRoute}
                    />

                    <Text style={styles.label}>Nome Completo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Seu nome"
                        placeholderTextColor="#666"
                        value={nome}
                        onChangeText={setNome}
                    />

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="seu.email@fatec.sp.gov.br"
                        placeholderTextColor="#666"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Text style={styles.label}>Senha</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Crie uma senha"
                        placeholderTextColor="#666"
                        value={senha}
                        onChangeText={setSenha}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.botao, carregando && styles.botaoDesabilitado]}
                        onPress={handleRegistro}
                        disabled={carregando}
                    >
                        {carregando ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.botaoTexto}>Criar Conta</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.voltarBotao}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.voltarTexto}>Já tenho conta</Text>
                    </TouchableOpacity>
                </View>
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
        flexGrow: 1,
        justifyContent: 'center',
        padding: 30,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    emoji: {
        fontSize: 60,
        marginBottom: 10,
    },
    titulo: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    subtitulo: {
        fontSize: 14,
        color: '#a0a0b0',
    },
    form: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    label: {
        color: '#a0a0b0',
        fontSize: 14,
        marginBottom: 6,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#0f3460',
        borderRadius: 10,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1a4a7a',
    },
    inputDisabled: {
        opacity: 0.7,
        backgroundColor: '#0a2040',
    },
    botao: {
        backgroundColor: '#6C63FF',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    botaoDesabilitado: {
        opacity: 0.7,
    },
    botaoTexto: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    voltarBotao: {
        alignItems: 'center',
        marginTop: 16,
    },
    voltarTexto: {
        color: '#6C63FF',
        fontSize: 14,
        fontWeight: '600',
    },
});
