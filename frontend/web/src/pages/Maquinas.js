/**
 * tiResolve Web - Pagina de Maquinas/Equipamentos
 * Gestao de equipamentos: criar, editar nome/localizacao, monitoramento.
 */

import React, { useState, useEffect } from 'react';
import {
    listarMaquinas, deletarMaquina, atualizarMaquina, criarMaquina,
    historicoChamadosMaquina, getUser, downloadAgent
} from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

export default function MaquinasPage() {
    const [maquinas, setMaquinas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [editModal, setEditModal] = useState(null);
    const [criarModal, setCriarModal] = useState(false);
    const [historicoModal, setHistoricoModal] = useState(null);
    const [historicoChamados, setHistoricoChamados] = useState([]);
    const [editForm, setEditForm] = useState({ nome: '', localizacao: '', ip: '' });
    const [criarForm, setCriarForm] = useState({ nome: '', localizacao: '', ip: '' });
    const [enviando, setEnviando] = useState(false);

    const user = getUser();
    const isAdminOrTec = user?.role === 'ADMIN' || user?.role === 'TECNICO';

    useEffect(() => { carregar(); }, []);

    const carregar = async () => {
        try {
            const dados = await listarMaquinas();
            setMaquinas(dados);
        } catch (err) {
            console.error('Erro ao carregar maquinas:', err);
        } finally { setCarregando(false); }
    };

    const handleEditar = async () => {
        setEnviando(true);
        try {
            await atualizarMaquina(editModal.id, editForm);
            setEditModal(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao atualizar.');
        }
        setEnviando(false);
    };

    const handleCriar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            await criarMaquina(criarForm);
            setCriarModal(false);
            setCriarForm({ nome: '', localizacao: '', ip: '' });
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao criar equipamento.');
        }
        setEnviando(false);
    };

    const abrirEditar = (m) => {
        setEditForm({ nome: m.nome, localizacao: m.localizacao || '', ip: m.ip || '' });
        setEditModal(m);
    };

    const abrirHistorico = async (m) => {
        try {
            const chamados = await historicoChamadosMaquina(m.id);
            setHistoricoChamados(chamados);
            setHistoricoModal(m);
        } catch (err) {
            alert('Erro ao carregar historico.');
        }
    };

    const handleDeletar = async (id) => {
        if (!window.confirm('Remover este equipamento?')) return;
        try {
            await deletarMaquina(id);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao remover.');
        }
    };

    const online = maquinas.filter(m => m.ultimo_status === 'ONLINE').length;
    const offline = maquinas.filter(m => m.ultimo_status === 'OFFLINE').length;

    const dadosGrafico = maquinas.slice(0, 15).map(m => ({
        nome: m.nome.length > 12 ? m.nome.slice(0, 12) + '...' : m.nome,
        CPU: m.cpu_uso,
        Memoria: m.memoria_uso,
    }));

    const getStatusBadge = (status) => {
        const map = {
            'ABERTO': { bg: 'rgba(255,107,107,0.15)', color: '#FF6B6B', label: 'Aberto' },
            'EM_ATENDIMENTO': { bg: 'rgba(255,217,61,0.15)', color: '#FFD93D', label: 'Em Atendimento' },
            'FINALIZADO': { bg: 'rgba(107,203,119,0.15)', color: '#6BCB77', label: 'Finalizado' },
        };
        const s = map[status] || { bg: '#333', color: '#fff', label: status };
        return <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{s.label}</span>;
    };

    if (carregando) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Equipamentos</h1>
                    <p className="page-subtitle">Gestao e monitoramento de equipamentos da rede</p>
                </div>
                {isAdminOrTec && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn" onClick={async () => {
                            try {
                                const res = await downloadAgent();
                                const blob = new Blob([res.data], { type: 'text/x-python' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                const disposition = res.headers['content-disposition'] || '';
                                const match = disposition.match(/filename=(.+)/);
                                a.href = url;
                                a.download = match ? match[1] : 'tiresolve_agent.py';
                                a.click();
                                window.URL.revokeObjectURL(url);
                            } catch { alert('Erro ao baixar agent'); }
                        }} style={{ background: 'rgba(107,203,119,0.15)', color: '#6BCB77' }}>
                            ⬇️ Baixar Agent
                        </button>
                        <button className="btn btn-primary" onClick={() => setCriarModal(true)}>
                            + Novo Equipamento
                        </button>
                    </div>
                )}
            </div>

            {/* Indicadores */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
            </div>

            {/* Grafico */}
            {dadosGrafico.length > 0 && (
                <div className="chart-card" style={{ marginBottom: '24px' }}>
                    <h3 className="chart-title">📊 CPU e Memoria por Equipamento</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dadosGrafico}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                            <XAxis dataKey="nome" stroke="#a0a0b0" fontSize={11} angle={-30} textAnchor="end" height={60} />
                            <YAxis stroke="#a0a0b0" fontSize={12} unit="%" />
                            <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="CPU" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Memoria" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tabela */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>IP</th>
                            <th>Localizacao</th>
                            <th>Status</th>
                            <th>CPU</th>
                            <th>Memoria</th>
                            <th>Ultima Verificacao</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {maquinas.map(m => (
                            <tr key={m.id}>
                                <td style={{ fontWeight: 600 }}>{m.nome}</td>
                                <td><code style={{ color: '#4FC3F7', background: 'rgba(79,195,247,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{m.ip || '-'}</code></td>
                                <td>{m.localizacao || '-'}</td>
                                <td>
                                    <span className={`badge badge-${m.ultimo_status.toLowerCase()}`}>
                                        {m.ultimo_status === 'ONLINE' ? '🟢' : '🔴'} {m.ultimo_status}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--cor-borda)', overflow: 'hidden' }}>
                                            <div style={{ width: `${m.cpu_uso}%`, height: '100%', background: m.cpu_uso > 80 ? '#FF6B6B' : m.cpu_uso > 50 ? '#FFD93D' : '#6BCB77', borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#a0a0b0' }}>{m.cpu_uso}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--cor-borda)', overflow: 'hidden' }}>
                                            <div style={{ width: `${m.memoria_uso}%`, height: '100%', background: m.memoria_uso > 80 ? '#FF6B6B' : m.memoria_uso > 50 ? '#FFD93D' : '#6BCB77', borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#a0a0b0' }}>{m.memoria_uso}%</span>
                                    </div>
                                </td>
                                <td style={{ fontSize: '12px', color: '#a0a0b0' }}>
                                    {m.ultima_verificacao ? new Date(m.ultima_verificacao).toLocaleString('pt-BR') : 'Nunca'}
                                </td>
                                <td style={{ display: 'flex', gap: '4px' }}>
                                    {/* Historico de chamados */}
                                    <button className="btn-icon" onClick={() => abrirHistorico(m)} title="Historico de Chamados"
                                        style={{ background: 'rgba(79,195,247,0.15)', borderRadius: '6px', padding: '4px 8px' }}>📋</button>
                                    {/* Editar */}
                                    {isAdminOrTec && (
                                        <button className="btn-icon" onClick={() => abrirEditar(m)} title="Editar"
                                            style={{ background: 'rgba(108,99,255,0.15)', borderRadius: '6px', padding: '4px 8px' }}>✏️</button>
                                    )}
                                    {/* Deletar */}
                                    {user?.role === 'ADMIN' && (
                                        <button className="btn-icon" onClick={() => handleDeletar(m.id)} title="Remover">🗑️</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {maquinas.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                    <div className="empty-state">
                                        <div className="empty-icon">🖥️</div>
                                        <p className="empty-text">Nenhum equipamento cadastrado.<br /><small>Clique em "+ Novo Equipamento" ou execute o agent.</small></p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Editar Equipamento */}
            {editModal && (
                <div className="modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Editar Equipamento</h2>
                        <p style={{ color: '#a0a0b0', marginBottom: 16 }}>
                            ID: <strong style={{ color: '#fff' }}>#{editModal.id}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">Nome</label>
                            <input className="form-input" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Localizacao</label>
                            <input className="form-input" value={editForm.localizacao} onChange={(e) => setEditForm({ ...editForm, localizacao: e.target.value })} placeholder="Ex: Lab 1, Sala 203" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">IP</label>
                            <input className="form-input" value={editForm.ip} onChange={(e) => setEditForm({ ...editForm, ip: e.target.value })} placeholder="192.168.1.100" />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)' }} onClick={() => setEditModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEditar} disabled={enviando}>
                                {enviando ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Criar Equipamento */}
            {criarModal && (
                <div className="modal-overlay" onClick={() => setCriarModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Novo Equipamento</h2>
                        <form onSubmit={handleCriar}>
                            <div className="form-group">
                                <label className="form-label">Nome do Equipamento</label>
                                <input className="form-input" value={criarForm.nome} onChange={(e) => setCriarForm({ ...criarForm, nome: e.target.value })} required placeholder="Ex: PC-LAB1-01" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Localizacao</label>
                                <input className="form-input" value={criarForm.localizacao} onChange={(e) => setCriarForm({ ...criarForm, localizacao: e.target.value })} placeholder="Ex: Laboratorio 1" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">IP (opcional)</label>
                                <input className="form-input" value={criarForm.ip} onChange={(e) => setCriarForm({ ...criarForm, ip: e.target.value })} placeholder="192.168.1.100" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)' }} onClick={() => setCriarModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={enviando}>
                                    {enviando ? 'Criando...' : 'Criar Equipamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Historico de Chamados do Equipamento */}
            {historicoModal && (
                <div className="modal-overlay" onClick={() => setHistoricoModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <h2 className="modal-title">Historico de Chamados</h2>
                        <p style={{ color: '#a0a0b0', marginBottom: 16 }}>
                            Equipamento: <strong style={{ color: '#fff' }}>{historicoModal.nome}</strong>
                            {historicoModal.localizacao && <span> ({historicoModal.localizacao})</span>}
                        </p>
                        {historicoChamados.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#666', padding: '30px 0' }}>Nenhum chamado associado a este equipamento.</p>
                        ) : (
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Titulo</th>
                                            <th>Status</th>
                                            <th>Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historicoChamados.map(c => (
                                            <tr key={c.id}>
                                                <td>#{c.id}</td>
                                                <td>{c.titulo}</td>
                                                <td>{getStatusBadge(c.status)}</td>
                                                <td style={{ fontSize: '12px', color: '#a0a0b0' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="modal-actions" style={{ marginTop: 16 }}>
                            <button className="btn btn-primary" onClick={() => setHistoricoModal(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
