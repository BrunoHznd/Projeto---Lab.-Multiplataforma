/**
 * tiResolve Desktop - Monitor de Máquinas
 * Visualização de máquinas monitoradas com gráficos técnicos.
 */

import React, { useState, useEffect } from 'react';
import { listarMaquinas } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

export default function MaquinasMonitor() {
    const [maquinas, setMaquinas] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => { carregar(); }, []);

    const carregar = async () => {
        try {
            const dados = await listarMaquinas();
            setMaquinas(dados);
        } catch (err) { console.error(err); }
        finally { setCarregando(false); }
    };

    const online = maquinas.filter(m => m.ultimo_status === 'ONLINE').length;
    const offline = maquinas.filter(m => m.ultimo_status === 'OFFLINE').length;
    const cpuMedia = maquinas.length > 0 ? (maquinas.reduce((s, m) => s + m.cpu_uso, 0) / maquinas.length).toFixed(1) : 0;
    const memMedia = maquinas.length > 0 ? (maquinas.reduce((s, m) => s + m.memoria_uso, 0) / maquinas.length).toFixed(1) : 0;

    const dadosGrafico = maquinas.slice(0, 20).map(m => ({
        nome: m.nome.length > 10 ? m.nome.slice(0, 10) + '..' : m.nome,
        CPU: m.cpu_uso,
        Memória: m.memoria_uso,
    }));

    if (carregando) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">🖥️ Monitoramento de Máquinas</h1>
                    <p className="page-subtitle">Status em tempo real da infraestrutura de rede</p>
                </div>
                <button className="btn btn-primary" onClick={carregar}>🔄 Atualizar</button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card" style={{ '--cor-indicador': '#6C63FF' }}>
                    <span className="stat-icon">🖥️</span>
                    <div className="stat-value">{maquinas.length}</div>
                    <div className="stat-label">Total</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#6BCB77' }}>
                    <span className="stat-icon">🟢</span>
                    <div className="stat-value">{online}</div>
                    <div className="stat-label">Online</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#FF6B6B' }}>
                    <span className="stat-icon">🔴</span>
                    <div className="stat-value">{offline}</div>
                    <div className="stat-label">Offline</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#4FC3F7' }}>
                    <span className="stat-icon">💻</span>
                    <div className="stat-value">{cpuMedia}%</div>
                    <div className="stat-label">CPU Média</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#FFD93D' }}>
                    <span className="stat-icon">🧠</span>
                    <div className="stat-value">{memMedia}%</div>
                    <div className="stat-label">RAM Média</div>
                </div>
            </div>

            {/* Gráfico */}
            {dadosGrafico.length > 0 && (
                <div className="charts-grid">
                    <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                        <h3 className="chart-title">📊 CPU e Memória por Máquina</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={dadosGrafico}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                                <XAxis dataKey="nome" stroke="#a0a0b0" fontSize={11} angle={-30} textAnchor="end" height={50} />
                                <YAxis stroke="#a0a0b0" fontSize={11} unit="%" />
                                <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#fff' }} />
                                <Bar dataKey="CPU" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Memória" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Tabela */}
            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">📋 Lista de Máquinas</h3>
                    <span style={{ fontSize: '12px', color: 'var(--cor-texto-sec)' }}>{maquinas.length} máquinas</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>IP</th>
                            <th>Local</th>
                            <th>Status</th>
                            <th>CPU</th>
                            <th>Memória</th>
                            <th>Última Verificação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {maquinas.map(m => (
                            <tr key={m.id}>
                                <td style={{ fontWeight: 600 }}>{m.nome}</td>
                                <td><code style={{ color: '#4FC3F7', background: 'rgba(79,195,247,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{m.ip || '-'}</code></td>
                                <td>{m.localizacao || '-'}</td>
                                <td><span className={`badge badge-${m.ultimo_status.toLowerCase()}`}>{m.ultimo_status === 'ONLINE' ? '🟢' : '🔴'} {m.ultimo_status}</span></td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '50px', height: '5px', borderRadius: '3px', background: 'var(--cor-borda)', overflow: 'hidden' }}>
                                            <div style={{ width: `${m.cpu_uso}%`, height: '100%', background: m.cpu_uso > 80 ? '#FF6B6B' : m.cpu_uso > 50 ? '#FFD93D' : '#6BCB77', borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#a0a0b0' }}>{m.cpu_uso}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '50px', height: '5px', borderRadius: '3px', background: 'var(--cor-borda)', overflow: 'hidden' }}>
                                            <div style={{ width: `${m.memoria_uso}%`, height: '100%', background: m.memoria_uso > 80 ? '#FF6B6B' : m.memoria_uso > 50 ? '#FFD93D' : '#6BCB77', borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#a0a0b0' }}>{m.memoria_uso}%</span>
                                    </div>
                                </td>
                                <td style={{ fontSize: '11px', color: '#a0a0b0' }}>{m.ultima_verificacao ? new Date(m.ultima_verificacao).toLocaleString('pt-BR') : 'N/A'}</td>
                            </tr>
                        ))}
                        {maquinas.length === 0 && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                <div className="empty-state">
                                    <div className="empty-icon">🖥️</div>
                                    <p className="empty-text">Nenhuma máquina sendo monitorada.<br /><small>Execute o agent Python nas máquinas.</small></p>
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
