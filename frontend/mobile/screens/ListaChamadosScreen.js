/**
 * tiResolve - Lista de Chamados
 * Exibe chamados do usuário com filtro por status.
 */

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarChamados } from '../services/api';
import { FontAwesome5 } from '@expo/vector-icons';
import ChamadoCard from '../components/ChamadoCard';

const FILTROS = [
    { value: null, label: 'Todos' },
    { value: 'ABERTO', label: 'Abertos' },
    { value: 'EM_ATENDIMENTO', label: 'Em Atendim.' },
    { value: 'FINALIZADO', label: 'Finalizados' },
];

export default function ListaChamadosScreen({ navigation }) {
    const [chamados, setChamados] = useState([]);
    const [filtro, setFiltro] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);

    useFocusEffect(
        useCallback(() => {
            carregarChamados();
        }, [filtro])
    );

    const carregarChamados = async () => {
        try {
            const dados = await listarChamados(filtro);
            setChamados(dados);
        } catch (error) {
            console.log('Erro ao carregar chamados:', error.message);
        } finally {
            setCarregando(false);
            setAtualizando(false);
        }
    };

    const onRefresh = () => {
        setAtualizando(true);
        carregarChamados();
    };

    if (carregando) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Filtros */}
            <View style={styles.filtros}>
                {FILTROS.map((f) => (
                    <TouchableOpacity
                        key={f.label}
                        style={[
                            styles.filtroBotao,
                            filtro === f.value && styles.filtroAtivo,
                        ]}
                        onPress={() => setFiltro(f.value)}
                    >
                        <Text style={[
                            styles.filtroTexto,
                            filtro === f.value && styles.filtroTextoAtivo,
                        ]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Lista */}
            <FlatList
                data={chamados}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <ChamadoCard
                        chamado={item}
                        onPress={() => navigation.navigate('DetalheChamado', { id: item.id })}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={atualizando}
                        onRefresh={onRefresh}
                        tintColor="#6C63FF"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.vazio}>
                        <FontAwesome5 name="inbox" size={48} color="#a0a0b0" style={{ marginBottom: 12 }} />
                        <Text style={styles.vazioTexto}>Nenhum chamado encontrado</Text>
                    </View>
                }
                contentContainerStyle={chamados.length === 0 ? styles.listaVazia : null}
            />
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
    filtros: {
        flexDirection: 'row',
        padding: 12,
        gap: 8,
    },
    filtroBotao: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: '#16213e',
        borderWidth: 1,
        borderColor: '#333',
    },
    filtroAtivo: {
        backgroundColor: '#6C63FF',
        borderColor: '#6C63FF',
    },
    filtroTexto: {
        color: '#a0a0b0',
        fontSize: 13,
        fontWeight: '600',
    },
    filtroTextoAtivo: {
        color: '#FFFFFF',
    },
    vazio: {
        alignItems: 'center',
        padding: 40,
    },
    vazioTexto: {
        color: '#a0a0b0',
        fontSize: 16,
    },
    listaVazia: {
        flex: 1,
        justifyContent: 'center',
    },
});
