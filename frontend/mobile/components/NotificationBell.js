import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, listarNotificacoes, marcarNotificacaoLida, getUsuarioLogado } from '../services/api';

export default function NotificationBell() {
    const [user, setUser] = useState(null);
    const [notificacoes, setNotificacoes] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const init = async () => {
            const u = await getUsuarioLogado();
            setUser(u);
            if (!u) return;
            
            carregarNotificacoes();

            const token = await AsyncStorage.getItem('@tiresolve_token');
            if (!token) return;
            
            const wsUrl = API_URL.replace(/^http/, 'ws') + `/notificacoes/ws?token=${token}`;
            // ...
            ws = new WebSocket(wsUrl);
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                setNotificacoes(prev => [data, ...prev]);
            };
        };
        
        connectWs();
        
        return () => {
            if (ws) ws.close();
        };
    }, [user]);

    const carregarNotificacoes = async () => {
        try {
            const data = await listarNotificacoes();
            setNotificacoes(data);
        } catch (e) {}
    };

    const handleLer = async (id) => {
        try {
            await marcarNotificacaoLida(id);
            setNotificacoes(prev => prev.filter(n => n.id !== id));
        } catch (e) {}
    };

    if (!user) return null;

    return (
        <View style={{ marginRight: 10 }}>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconContainer}>
                <Text style={styles.icon}>🔔</Text>
                {notificacoes.length > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{notificacoes.length > 9 ? '9+' : notificacoes.length}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Notificações</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.close}>FECHAR</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {notificacoes.length === 0 ? (
                            <Text style={styles.empty}>Nenhuma notificação não lida</Text>
                        ) : (
                            <FlatList
                                data={notificacoes}
                                keyExtractor={item => item.id.toString()}
                                renderItem={({ item }) => (
                                    <View style={styles.item}>
                                        <View style={styles.itemHeader}>
                                            <Text style={styles.itemTitle}>{item.titulo}</Text>
                                            <TouchableOpacity onPress={() => handleLer(item.id)}>
                                                <Text style={styles.readBtn}>✔</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.itemText}>{item.mensagem}</Text>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    iconContainer: { padding: 4, position: 'relative' },
    icon: { fontSize: 24, paddingBottom: 2 },
    badge: { position: 'absolute', top: 2, right: 0, backgroundColor: '#FF6B6B', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: '#2a2a4a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a4a', paddingBottom: 8 },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    close: { color: '#FF6B6B', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    empty: { color: '#a0a0b0', textAlign: 'center', marginVertical: 30, fontSize: 14 },
    item: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, marginBottom: 10 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    itemTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1 },
    readBtn: { color: '#6BCB77', fontSize: 14, fontWeight: 'bold', paddingHorizontal: 4 },
    itemText: { color: '#e0e0e0', fontSize: 13, lineHeight: 18 },
});
