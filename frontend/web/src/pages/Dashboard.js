/**
 * tiResolve Web - Dashboard Administrativo
 * Exibe indicadores, gráficos de chamados e atividade recente.
 */

import React, { useState, useEffect } from 'react';
import { listarChamados, listarMaquinas } from '../services/api';
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
    const abertos = chamados.filter(c => c.status === 'ABERTO').length;
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
