import React, { useState, useEffect } from 'react';
import { listarNotificacoes, marcarNotificacaoLida } from '../services/api';
import { useWebSocketEvent } from '../contexts/WebSocketContext';

export default function NotificationBell({ user }) {
    const [notificacoes, setNotificacoes] = useState([]);
    const [aberto, setAberto] = useState(false);

    useEffect(() => {
        if (!user) return;
        carregarNotificacoes();
    }, []);

    // Escuta notificacoes em tempo real via context centralizado
    useWebSocketEvent('NOTIFICACAO', (data) => {
        setNotificacoes(prev => [data, ...prev]);
    });

    const carregarNotificacoes = async () => {
        try {
            const data = await listarNotificacoes();
            setNotificacoes(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleLer = async (id, e) => {
        e.stopPropagation();
        try {
            await marcarNotificacaoLida(id);
            setNotificacoes(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    if (!user) return null;

    return (
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setAberto(!aberto)}>
            <div style={{ padding: '8px', fontSize: '18px', position: 'relative' }}>
                🔔
                {notificacoes.length > 0 && (
                    <span style={{
                        position: 'absolute', top: 0, right: 0,
                        background: '#FF6B6B', color: '#fff',
                        fontSize: '10px', fontWeight: 'bold',
                        padding: '2px 5px', borderRadius: '10px'
                    }}>
                        {notificacoes.length}
                    </span>
                )}
            </div>
            
            {aberto && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0,
                    width: '300px', background: 'var(--cor-superficie)',
                    border: '1px solid var(--cor-borda)', borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 100,
                    maxHeight: '400px', overflowY: 'auto', padding: '10px'
                }} onClick={e => e.stopPropagation()}>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--cor-borda)', paddingBottom: '8px' }}>Notificações</h4>
                    {notificacoes.length === 0 ? (
                        <p style={{ color: 'var(--cor-texto-sec)', fontSize: '12px', textAlign: 'center' }}>Nenhuma notificação não lida</p>
                    ) : (
                        notificacoes.map(n => (
                            <div key={n.id} style={{
                                background: 'rgba(255,255,255,0.05)', borderRadius: '6px',
                                padding: '10px', marginBottom: '8px', fontSize: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <strong style={{ color: '#fff' }}>{n.titulo}</strong>
                                    <button onClick={(e) => handleLer(n.id, e)} style={{
                                        background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: '12px'
                                    }}>✖</button>
                                </div>
                                <p style={{ margin: 0, color: '#e0e0e0' }}>{n.mensagem}</p>
                                <span style={{ fontSize: '10px', color: '#888', display: 'block', marginTop: '4px' }}>
                                    {new Date(n.created_at).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
