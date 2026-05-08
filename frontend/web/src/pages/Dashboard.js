/**
 * tiResolve Web - Dashboard Administrativo
 * Exibe indicadores, gráficos de chamados e atividade recente.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarChamados, listarMaquinas, getUser } from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CORES_STATUS = {
    ABERTO: '#FF6B6B',
    EM_ATENDIMENTO: '#FFD93D',
    FINALIZADO: '#6BCB77',
};

export default function DashboardPage() {
    const [chamados, setChamados] = useState([]);
    const [maquinas, setMaquinas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [abertosExpandido, setAbertosExpandido] = useState(true); // accordion principal
    const [ticketExpandido, setTicketExpandido] = useState(null);   // id do ticket aberto (accordion interno)
    const user = getUser();
    const navigate = useNavigate();

    // WebSocket: atualiza dashboard em tempo real
    const handleWsEvent = useCallback((event) => {
        if (event.startsWith('chamado_') || event === 'nova_mensagem') {
            carregarDados();
        }
    }, []);
    useWebSocket(handleWsEvent);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const [ch, mq] = await Promise.all([
                listarChamados(),
                listarMaquinas().catch(() => [])
            ]);
            setChamados(ch);
            setMaquinas(mq);
        } catch (err) {
            console.error('Erro ao carregar dashboard:', err);
        } finally {
            setCarregando(false);
        }
    };

    // Contadores
    const chamadosAbertos = chamados.filter(c => c.status === 'ABERTO');
    const abertos = chamadosAbertos.length;
    const emAtendimento = chamados.filter(c => c.status === 'EM_ATENDIMENTO').length;
    const finalizados = chamados.filter(c => c.status === 'FINALIZADO').length;
    const maqOnline = maquinas.filter(m => m.ultimo_status === 'ONLINE').length;

    // Dados para gráfico de pizza
    const dadosPizza = [
        { name: 'Abertos', value: abertos, cor: CORES_STATUS.ABERTO },
        { name: 'Em Atendimento', value: emAtendimento, cor: CORES_STATUS.EM_ATENDIMENTO },
        { name: 'Finalizados', value: finalizados, cor: CORES_STATUS.FINALIZADO },
    ].filter(d => d.value > 0);

    // Dados para gráfico de barras (últimos 7 dias simulados)
    const dadosBarra = [
        { name: 'Abertos', quantidade: abertos },
        { name: 'Atendim.', quantidade: emAtendimento },
        { name: 'Finaliz.', quantidade: finalizados },
    ];

    if (carregando) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Visão geral do sistema de chamados e infraestrutura</p>
            </div>

            {/* Alerta de tickets ABERTOS (accordion) — apenas ADMIN */}
            {user?.role === 'ADMIN' && (
                <div className="alerta-abertos">
                    <div
                        className="alerta-abertos-titulo"
                        onClick={() => setAbertosExpandido(v => !v)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                        title={abertosExpandido ? 'Recolher' : 'Expandir'}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {abertos > 0
                                ? `${abertos} chamado${abertos !== 1 ? 's' : ''} aguardando atendimento`
                                : 'Nenhum chamado aberto no momento'}
                        </span>
                        <i
                            className={`fa-solid fa-chevron-down`}
                            style={{
                                transition: 'transform .2s',
                                transform: abertosExpandido ? 'rotate(180deg)' : 'rotate(0deg)',
                                fontSize: 14,
                                animation: 'none'
                            }}
                        ></i>
                    </div>
                    {abertosExpandido && (
                        <div className="alerta-abertos-lista">
                            {chamadosAbertos.length === 0 ? (
                                <div className="alerta-vazio">
                                    <i className="fa-solid fa-check-circle" style={{ color: '#6BCB77', marginRight: 6 }}></i>
                                    Todos os chamados estão em atendimento ou finalizados
                                </div>
                            ) : (
                                chamadosAbertos.map(c => {
                                    const expandido = ticketExpandido === c.id;
                                    return (
                                        <div
                                            key={c.id}
                                            style={{
                                                background: 'rgba(255,107,107,0.08)',
                                                border: '1px solid rgba(255,107,107,0.25)',
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                transition: 'all .2s',
                                            }}
                                        >
                                            {/* Cabeçalho do accordion */}
                                            <div
                                                onClick={() => setTicketExpandido(expandido ? null : c.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '10px 14px', cursor: 'pointer',
                                                    background: expandido ? 'rgba(255,107,107,0.12)' : 'transparent',
                                                    transition: 'background .15s',
                                                }}
                                                title={expandido ? 'Recolher detalhes' : 'Ver detalhes'}
                                            >
                                                <span className="alerta-ticket-id">#{c.id}</span>
                                                <span className="alerta-ticket-titulo">{c.titulo}</span>
                                                <span className="alerta-ticket-meta">
                                                    <i className="fa-solid fa-tag"></i>
                                                    {c.categoria}
                                                </span>
                                                <span className="alerta-ticket-meta">
                                                    <i className="fa-solid fa-flag"></i>
                                                    {c.prioridade}
                                                </span>
                                                <span className="alerta-ticket-meta">
                                                    <i className="fa-solid fa-calendar"></i>
                                                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                                <i
                                                    className="fa-solid fa-chevron-down"
                                                    style={{
                                                        marginLeft: 'auto',
                                                        fontSize: 12,
                                                        color: '#FF6B6B',
                                                        transition: 'transform .2s',
                                                        transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    }}
                                                ></i>
                                            </div>
                                            {/* Corpo expandido */}
                                            {expandido && (
                                                <div style={{
                                                    padding: '14px 16px',
                                                    borderTop: '1px solid rgba(255,107,107,0.2)',
                                                    background: 'rgba(0,0,0,0.15)',
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr',
                                                    gap: 12,
                                                }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                                            Descrição
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#e0e0e0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                            {c.descricao || <span style={{ color: '#666' }}>Sem descrição</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: 0.5 }}>Solicitante</div>
                                                            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{c.usuario?.nome || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: 0.5 }}>Técnico</div>
                                                            <div style={{ fontSize: 13, color: c.tecnico ? '#fff' : '#FF6B6B', fontWeight: 600 }}>
                                                                {c.tecnico?.nome || 'Não atribuído'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: 0.5 }}>Aberto em</div>
                                                            <div style={{ fontSize: 13, color: '#fff' }}>
                                                                {new Date(c.created_at).toLocaleString('pt-BR')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/chamados?abrir=${c.id}`); }}
                                                        >
                                                            <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 6 }}></i>
                                                            Abrir chamado
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Cards de indicadores */}
            <div className="stats-grid">
                <div className="stat-card" style={{ '--cor-indicador': '#FF6B6B' }}>
                    <span className="stat-icon"><i className="fa-solid fa-circle" style={{ color: '#FF6B6B' }}></i></span>
                    <div className="stat-value">{abertos}</div>
                    <div className="stat-label">Chamados Abertos</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#FFD93D' }}>
                    <span className="stat-icon"><i className="fa-solid fa-circle" style={{ color: '#FFD93D' }}></i></span>
                    <div className="stat-value">{emAtendimento}</div>
                    <div className="stat-label">Em Atendimento</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#6BCB77' }}>
                    <span className="stat-icon"><i className="fa-solid fa-circle" style={{ color: '#6BCB77' }}></i></span>
                    <div className="stat-value">{finalizados}</div>
                    <div className="stat-label">Finalizados</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#6C63FF' }}>
                    <span className="stat-icon"><i className="fa-solid fa-desktop"></i></span>
                    <div className="stat-value">{maqOnline}/{maquinas.length}</div>
                    <div className="stat-label">Máquinas Online</div>
                </div>
            </div>

            {/* Gráficos */}
            <div className="charts-grid">
                <div className="chart-card">
                    <h3 className="chart-title"><i className="fa-solid fa-chart-bar"></i> Distribuição de Chamados</h3>
                    {dadosPizza.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={dadosPizza}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    innerRadius={55}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {dadosPizza.map((entry, index) => (
                                        <Cell key={index} fill={entry.cor} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon"><i className="fa-solid fa-inbox"></i></div>
                            <p className="empty-text">Nenhum chamado registrado</p>
                        </div>
                    )}
                </div>

                <div className="chart-card">
                    <h3 className="chart-title"><i className="fa-solid fa-chart-line"></i> Chamados por Status</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dadosBarra}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                            <XAxis dataKey="name" stroke="#a0a0b0" fontSize={12} />
                            <YAxis stroke="#a0a0b0" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: '#16213e',
                                    border: '1px solid #2a2a4a',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Bar dataKey="quantidade" fill="#6C63FF" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chamados recentes */}
            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title"><i className="fa-solid fa-clipboard-list"></i> Chamados Recentes</h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Título</th>
                            <th>Status</th>
                            <th>Prioridade</th>
                            <th>Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chamados.slice(0, 10).map(c => (
                            <tr key={c.id}>
                                <td>#{c.id}</td>
                                <td>{c.titulo}</td>
                                <td>
                                    <span className={`badge badge-${c.status.toLowerCase()}`}>
                                        {c.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge badge-${c.prioridade.toLowerCase()}`}>
                                        {c.prioridade}
                                    </span>
                                </td>
                                <td>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                            </tr>
                        ))}
                        {chamados.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                                    Nenhum chamado registrado ainda
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
