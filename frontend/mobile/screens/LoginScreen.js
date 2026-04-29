/**
 * tiResolve - Tela de Login
 * Autenticação do usuário com email e senha.
 */

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView
} from 'react-native';
import { login, testarConexao, API_URL } from '../services/api';
import { FontAwesome5 } from '@expo/vector-icons';

export default function LoginScreen({ navigation, onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [carregando, setCarregando] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !senha.trim()) {
            Alert.alert('Atenção', 'Preencha email e senha.');
            return;
        }

        setCarregando(true);
        try {
            // Testa conexão antes de tentar login
            const conexao = await testarConexao();
            if (!conexao.ok) {
                Alert.alert(
                    'Sem Conexão com o Servidor',
                    `Não foi possível conectar ao servidor.\n\n` +
                    `URL: ${conexao.url}\n` +
                    `Erro: ${conexao.error}\n\n` +
                    `Verifique sua conexão com a internet e tente novamente.`
                );
                setCarregando(false);
                return;
            }

            await login(email.trim(), senha);
            onLoginSuccess();
        } catch (error) {
            let msg = 'Erro desconhecido';
            if (error.response) {
                msg = error.response.data?.detail || `Erro ${error.response.status}`;
            } else if (error.request) {
                msg = `Sem resposta do servidor.\n\nURL: ${API_URL}\n\nVerifique sua conexão com a internet.`;
            } else {
                msg = error.message;
            }
            Alert.alert('Erro no Login', msg);
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
                    <FontAwesome5 name="desktop" size={60} color="#6C63FF" style={{ marginBottom: 10 }} />
                    <Text style={styles.titulo}>tiResolve</Text>
                    <Text style={styles.subtitulo}>Centro de Informática</Text>
                    <Text style={styles.descricao}>FATEC Praia Grande</Text>
                </View>

                {/* Formulário */}
                <View style={styles.form}>
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
                        placeholder="Sua senha"
                        placeholderTextColor="#666"
                        value={senha}
                        onChangeText={setSenha}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.botao, carregando && styles.botaoDesabilitado]}
                        onPress={handleLogin}
                        disabled={carregando}
                    >
                        {carregando ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.botaoTexto}>Entrar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Link para cadastro */}
                <TouchableOpacity
                    style={styles.cadastroBotao}
                    onPress={() => navigation.navigate('Registro', { codigo: '' })}
                >
                    <Text style={styles.cadastroTexto}>Cadastrar com código</Text>
                </TouchableOpacity>

                {/* Versão */}
                <Text style={styles.versao}>v1.0.0 - MVP</Text>
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
    titulo: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    subtitulo: {
        fontSize: 16,
        color: '#6C63FF',
        fontWeight: '600',
    },
    descricao: {
        fontSize: 14,
        color: '#a0a0b0',
        marginTop: 4,
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
    versao: {
        textAlign: 'center',
        color: '#555',
        marginTop: 30,
        fontSize: 12,
    },
    cadastroBotao: {
        alignItems: 'center',
        marginTop: 20,
    },
    cadastroTexto: {
        color: '#6C63FF',
        fontSize: 14,
        fontWeight: '600',
    },
});
