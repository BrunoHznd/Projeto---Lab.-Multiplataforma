/**
 * tiResolve Desktop - Kanban Board
 * Visualização de chamados em formato kanban com colunas por status.
 * Permite atualizar status e adicionar logs técnicos.
 */

import React, { useState, useEffect, useRef } from 'react';
import { listarChamados, atualizarChamado, adicionarLog, listarLogs, obterChamado, getUser } from '../services/api';
import { useWebSocketEvent } from '../contexts/WebSocketContext';

const COLUNAS = [
    { status: 'ABERTO', titulo: '🔴 Abertos', cor: '#FF6B6B' },
    { status: 'EM_ATENDIMENTO', titulo: '🟡 Em Atendimento', cor: '#FFD93D' },
    { status: 'FINALIZADO', titulo: '🟢 Finalizados', cor: '#6BCB77' },
];

export default function KanbanBoard() {
    const [chamados, setChamados] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [modal, setModal] = useState(null); // chamado selecionado
    const [logs, setLogs] = useState([]);
    const [novoLog, setNovoLog] = useState('');
    const [novoStatus, setNovoStatus] = useState('');
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverStatus, setDragOverStatus] = useState(null);
    const user = getUser();
    const modalRef = useRef(modal);
    modalRef.current = modal;

    useEffect(() => { carregar(); }, []);

    // === TEMPO REAL via WebSocket ===
    useWebSocketEvent('CHAMADO_CRIADO', () => { carregar(); });
    useWebSocketEvent('CHAMADO_ATUALIZADO', () => { carregar(); });
    useWebSocketEvent('NOVA_MENSAGEM', (data) => {
        const m = modalRef.current;
        if (m && data.chamado_id === m.id) {
            listarLogs(m.id).then(setLogs).catch(() => {});
        }
    });

    const carregar = async () => {
        try {
            const dados = await listarChamados();
            setChamados(dados);
        } catch (err) { console.error(err); }
        finally { setCarregando(false); }
    };

    const abrirDetalhe = async (chamado) => {
        setModal(chamado);
        setNovoStatus(chamado.status);
        try {
            const [l, c] = await Promise.all([
                listarLogs(chamado.id),
                obterChamado(chamado.id)
            ]);
            setLogs(l);
            setModal(c);
        } catch (err) { setLogs([]); }
    };

    const handleMudarStatus = async (id, status) => {
        try {
            await atualizarChamado(id, { status });
            carregar();
            if (modal && modal.id === id) {
                setModal(prev => ({ ...prev, status }));
                setNovoStatus(status);
            }
        } catch (err) {
            alert('Erro ao atualizar status.');
        }
    };

    const handleDragStart = (e, chamado) => {
        setDraggingId(chamado.id);
        try {
            e.dataTransfer.setData('text/plain', String(chamado.id));
            e.dataTransfer.effectAllowed = 'move';
        } catch (_err) {
            // ignore
        }
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverStatus(null);
    };

    const handleDropOnColumn = async (e, status) => {
        e.preventDefault();
        const idRaw = e.dataTransfer.getData('text/plain');
        const id = Number(idRaw);
        if (!id || Number.isNaN(id)) return;
        await handleMudarStatus(id, status);
        setDragOverStatus(null);
    };

    const handleAdicionarLog = async () => {
        if (!novoLog.trim() || !modal) return;
        try {
            await adicionarLog(modal.id, novoLog.trim());
            setNovoLog('');
            const l = await listarLogs(modal.id);
            setLogs(l);
        } catch (err) {
            alert('Erro ao adicionar log.');
        }
    };

    const formatarData = (d) => {
        return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    if (carregando) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">📋 Kanban de Chamados</h1>
                    <p className="page-subtitle">Gerencie chamados arrastando entre colunas</p>
                </div>
                <button className="btn btn-primary" onClick={carregar}>🔄 Atualizar</button>
            </div>

            {/* Board */}
            <div className="kanban-board">
                {COLUNAS.map(coluna => {
                    const cards = chamados.filter(c => c.status === coluna.status);
                    return (
                        <div
                            key={coluna.status}
                            className="kanban-column"
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverStatus(coluna.status);
                            }}
                            onDragLeave={() => {
                                setDragOverStatus(prev => (prev === coluna.status ? null : prev));
                            }}
                            onDrop={(e) => handleDropOnColumn(e, coluna.status)}
                            style={dragOverStatus === coluna.status ? { outline: `2px dashed ${coluna.cor}`, outlineOffset: '-6px' } : undefined}
                        >
                            <div className="kanban-header" style={{ borderBottom: `3px solid ${coluna.cor}` }}>
                                <span className="kanban-title">{coluna.titulo}</span>
                                <span className="kanban-count">{cards.length}</span>
                            </div>
                            <div className="kanban-cards">
                                {cards.map(chamado => (
                                    <div
                                        key={chamado.id}
                                        className={`kanban-card ${draggingId === chamado.id ? 'dragging' : ''}`}
                                        onClick={() => abrirDetalhe(chamado)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, chamado)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="kanban-card-title">{chamado.titulo}</div>
                                        <div className="kanban-card-desc">{chamado.descricao}</div>
                                        <div className="kanban-card-meta">
                                            <span className={`badge badge-${chamado.prioridade.toLowerCase()}`}>
                                                {chamado.prioridade}
                                            </span>
                                            <span className="kanban-card-id">#{chamado.id}</span>
                                        </div>
                                    </div>
                                ))}
                                {cards.length === 0 && (
                                    <div className="empty-state">
                                        <div className="empty-icon" style={{ fontSize: '28px' }}>📭</div>
                                        <p className="empty-text" style={{ fontSize: '12px' }}>Nenhum chamado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de detalhe */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                            <h2 className="modal-title" style={{ margin: 0 }}>#{modal.id} {modal.titulo}</h2>
                            <button className="btn-icon" onClick={() => setModal(null)}>✖️</button>
                        </div>

                        {/* Info */}
                        <div style={{ background: 'var(--cor-superficie)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                            <p style={{ color: 'var(--cor-texto)', marginBottom: '10px', fontSize: '13px', lineHeight: '1.6' }}>{modal.descricao}</p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--cor-texto-sec)' }}>
                                <span>👤 {modal.usuario?.nome || 'N/A'}</span>
                                <span>🔧 {modal.tecnico?.nome || 'Sem técnico'}</span>
                                <span>📅 {formatarData(modal.created_at)}</span>
                            </div>
                        </div>

                        {/* Views History (Admin) */}
                        {user?.role === 'ADMIN' && modal.visualizacoes && modal.visualizacoes.length > 0 && (
                            <div style={{ background: 'var(--cor-superficie)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                                <label className="form-label">👁️ Histórico de Visualizações</label>
                                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                    {modal.visualizacoes.map((v, i) => (
                                        <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--cor-borda)', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--cor-primaria)', fontWeight: 'bold' }}>{v.usuario?.nome || 'Usuario'}</span> visualizou em <span style={{ color: 'var(--cor-texto-sec)' }}>{formatarData(v.visualizado_em)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Alterar status */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">Alterar Status</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {COLUNAS.map(c => (
                                    <button
                                        key={c.status}
                                        className={`btn btn-sm ${modal.status === c.status ? 'btn-primary' : ''}`}
                                        style={modal.status !== c.status ? { background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)', border: '1px solid var(--cor-borda)' } : {}}
                                        onClick={() => handleMudarStatus(modal.id, c.status)}
                                    >
                                        {c.titulo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Logs */}
                        <div>
                            <label className="form-label">💬 Logs Técnicos ({logs.length})</label>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                                {logs.map(log => (
                                    <div key={log.id} style={{ background: 'var(--cor-superficie)', borderRadius: '8px', padding: '10px', marginBottom: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--cor-primaria)', fontSize: '12px', fontWeight: 600 }}>{log.autor?.nome || 'Sistema'}</span>
                                            <span style={{ color: '#666', fontSize: '11px' }}>{formatarData(log.created_at)}</span>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>{log.mensagem}</p>
                                    </div>
                                ))}
                                {logs.length === 0 && <p style={{ color: '#666', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>Nenhum log registrado</p>}
                            </div>

                            {/* Adicionar log */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    className="form-input"
                                    placeholder="Adicionar anotação técnica..."
                                    value={novoLog}
                                    onChange={(e) => setNovoLog(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdicionarLog()}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={handleAdicionarLog}>📤 Enviar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
