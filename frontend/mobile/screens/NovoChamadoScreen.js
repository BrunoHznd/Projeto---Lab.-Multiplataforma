/**
 * tiResolve - Tela de Novo Chamado
 * Formulário para abrir um chamado técnico.
 */

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator,
    ScrollView, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { criarChamado, uploadImagem, API_URL } from '../services/api';


export default function NovoChamadoScreen({ navigation }) {
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [imagemUri, setImagemUri] = useState(null);
    const [imagemUrl, setImagemUrl] = useState(null);
    const [enviando, setEnviando] = useState(false);


    /**
     * Abre a câmera para tirar uma foto.
     */
    const tirarFoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImagemUri(result.assets[0].uri);
            setImagemUrl(null); // Reset URL para forçar upload
        }
    };

    /**
     * Abre a galeria para escolher uma imagem.
     */
    const escolherGaleria = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar fotos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImagemUri(result.assets[0].uri);
            setImagemUrl(null);
        }
    };

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
            let imageUrlFinal = imagemUrl;

            // Se tem imagem local mas ainda nao fez upload
            if (imagemUri && !imagemUrl) {
                imageUrlFinal = await uploadImagem(imagemUri);
            }

            await criarChamado({
                titulo: titulo.trim(),
                descricao: descricao.trim(),
                prioridade: 'NENHUMA',
                imagem_url: imageUrlFinal,
            });
            Alert.alert(
                'Sucesso! ✅',
                'Chamado aberto com sucesso. A equipe técnica foi notificada.',
                [{ text: 'OK', onPress: () => navigation.navigate('Chamados') }]
            );
            setTitulo('');
            setDescricao('');
            setImagemUri(null);
            setImagemUrl(null);
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


                {/* Foto */}
                <Text style={styles.label}>Foto (opcional)</Text>
                {imagemUri ? (
                    <View style={styles.imagemContainer}>
                        <Image source={{ uri: imagemUri }} style={styles.imagemPreview} />
                        <TouchableOpacity style={styles.removerImagem} onPress={() => { setImagemUri(null); setImagemUrl(null); }}>
                            <Text style={styles.removerImagemTexto}>✕ Remover</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.anexosContainer}>
                        <TouchableOpacity style={styles.anexoBotao} onPress={tirarFoto}>
                            <Text style={styles.anexoEmoji}>📷</Text>
                            <Text style={styles.anexoTexto}>Câmera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.anexoBotao} onPress={escolherGaleria}>
                            <Text style={styles.anexoEmoji}>🖼️</Text>
                            <Text style={styles.anexoTexto}>Galeria</Text>
                        </TouchableOpacity>
                    </View>
                )}

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
        borderWidth: 1,
        borderColor: '#1a4a7a',
    },
    anexoEmoji: {
        fontSize: 28,
        marginBottom: 4,
    },
    anexoTexto: {
        color: '#a0a0b0',
        fontSize: 14,
    },
    imagemContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    imagemPreview: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 8,
    },
    removerImagem: {
        backgroundColor: '#FF6B6B',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    removerImagemTexto: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
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
