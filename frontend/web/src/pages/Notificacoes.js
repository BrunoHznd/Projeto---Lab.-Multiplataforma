import React, { useState, useEffect } from 'react';
import { listarNotificacoes, marcarNotificacaoLida } from '../services/api';

export default function NotificacoesPage() {
    const [notificacoes, setNotificacoes] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        carregar();
    }, []);

    const carregar = async () => {
        try {
            const data = await listarNotificacoes();
            setNotificacoes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setCarregando(false);
        }
    };

    const handleLer = async (id) => {
        try {
            await marcarNotificacaoLida(id);
            setNotificacoes(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    if (carregando) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Notificações</h1>
                <p className="page-subtitle">Visualize seus alertas e novidades dos chamados.</p>
            </div>

            <div className="table-container" style={{ maxWidth: '800px', padding: '20px', background: 'var(--cor-superficie)' }}>
                {notificacoes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cor-texto-sec)' }}>
                        <span style={{ fontSize: '48px', opacity: 0.5, display: 'block', marginBottom: '16px' }}>📭</span>
                        Você não tem notificações pendentes.
                    </div>
                ) : (
                    notificacoes.map(n => (
                        <div key={n.id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--cor-borda)',
                            borderRadius: '10px',
                            padding: '16px',
                            marginBottom: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#fff' }}>{n.titulo}</h3>
                                <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cor-texto)' }}>{n.mensagem}</p>
                                <span style={{ fontSize: '11px', color: '#666' }}>{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            <button
                                className="btn btn-sm btn-primary"
                                style={{ background: 'rgba(107,203,119,0.15)', color: '#6BCB77', border: 'none', marginLeft: '16px' }}
                                onClick={() => handleLer(n.id)}
                            >
                                ✔ Marcar como Lida
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
