/**
 * tiResolve Web - Pagina de Chamados
 * Views diferenciadas por role:
 * - ADMIN: ve todos, atribui tecnico
 * - TECNICO: ve todos, finaliza os dele com relatorio
 * - USUARIO: ve apenas os dele, cria novos com imagem
 */

import React, { useState, useEffect } from 'react';
import {
    listarChamados, criarChamado, deletarChamado,
    listarTecnicos, atribuirTecnico, finalizarChamado,
    uploadImagem, getUser, listarMaquinas, historicoChamadosMaquina, API_URL,
    listarMensagens, enviarMensagem, editarChamadoUsuario
} from '../services/api';

export default function ChamadosPage() {
    const [chamados, setChamados] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [filtro, setFiltro] = useState('');
    const [modal, setModal] = useState(null);
    const [tecnicos, setTecnicos] = useState([]);
    const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'NENHUMA', maquina_id: '' });
    const [maquinas, setMaquinas] = useState([]);
    const [imagemFile, setImagemFile] = useState(null);
    const [atribuirModal, setAtribuirModal] = useState(null);
    const [tecnicoSelecionado, setTecnicoSelecionado] = useState('');
    const [finalizarModal, setFinalizarModal] = useState(null);
    const [resolucao, setResolucao] = useState('');
    const [resolucaoImagem, setResolucaoImagem] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [detalheModal, setDetalheModal] = useState(null);
    const [equipHistorico, setEquipHistorico] = useState(null);
    const [mensagens, setMensagens] = useState([]);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [editando, setEditando] = useState(false);
    const [editForm, setEditForm] = useState({ titulo: '', descricao: '' });

    const user = getUser();
    const role = user?.role;

    useEffect(() => { carregar(); }, [filtro]);

    useEffect(() => {
        if (role === 'ADMIN') {
            listarTecnicos().then(setTecnicos).catch(() => {});
        }
        // Carrega maquinas para associar ao chamado (Apenas computadores/HARDWARE)
        listarMaquinas('HARDWARE').then(setMaquinas).catch(() => {});
    }, [role]);

    const carregar = async () => {
        try {
            const dados = await listarChamados(filtro || undefined);
            setChamados(dados);
        } catch (err) { console.error(err); }
        finally { setCarregando(false); }
    };

    const abrirDetalhes = async (c) => {
        setDetalheModal(c);
        setEquipHistorico(null);
        setEditando(false);
        setNovaMensagem('');
        try {
            const msgs = await listarMensagens(c.id);
            setMensagens(msgs);
        } catch { setMensagens([]); }
    };

    const handleEnviarMsg = async () => {
        if (!novaMensagem.trim() || !detalheModal) return;
        try {
            await enviarMensagem(detalheModal.id, novaMensagem.trim());
            setNovaMensagem('');
            const msgs = await listarMensagens(detalheModal.id);
            setMensagens(msgs);
        } catch (err) { alert(err.response?.data?.detail || 'Erro ao enviar mensagem'); }
    };

    // ==== USUARIO: Criar chamado ====
    const handleCriar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            let imagemUrl = null;
            if (imagemFile) {
                const upload = await uploadImagem(imagemFile);
                imagemUrl = upload.url;
            }
            await criarChamado({ ...form, imagem_url: imagemUrl, maquina_id: form.maquina_id ? parseInt(form.maquina_id) : null });
            setModal(null);
            setForm({ titulo: '', descricao: '', prioridade: 'NENHUMA', maquina_id: '' });
            setImagemFile(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao criar chamado.');
        }
        setEnviando(false);
    };

    // ==== ADMIN: Atribuir tecnico ====
    const handleAtribuir = async () => {
        if (!tecnicoSelecionado) return alert('Selecione um tecnico.');
        setEnviando(true);
        try {
            await atribuirTecnico(atribuirModal.id, parseInt(tecnicoSelecionado));
            setAtribuirModal(null);
            setTecnicoSelecionado('');
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao atribuir tecnico.');
        }
        setEnviando(false);
    };

    // ==== TECNICO: Finalizar chamado ====
    const handleFinalizar = async () => {
        if (!resolucao.trim()) return alert('Descreva o que foi feito.');
        setEnviando(true);
        try {
            let imagemUrl = null;
            if (resolucaoImagem) {
                const upload = await uploadImagem(resolucaoImagem);
                imagemUrl = upload.url;
            }
            await finalizarChamado(finalizarModal.id, resolucao, imagemUrl);
            setFinalizarModal(null);
            setResolucao('');
            setResolucaoImagem(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao finalizar chamado.');
        }
        setEnviando(false);
    };

    const handleDeletar = async (id) => {
        if (!window.confirm('Deseja realmente excluir este chamado?')) return;
        try {
            await deletarChamado(id);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao excluir.');
        }
    };

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
                    <h1 className="page-title">Chamados</h1>
                    <p className="page-subtitle">
                        {role === 'ADMIN' && 'Gerencie e atribua chamados aos tecnicos'}
                        {role === 'TECNICO' && 'Visualize chamados e finalize os atribuidos a voce'}
                        {role === 'USUARIO' && 'Seus chamados tecnicos'}
                    </p>
                </div>
                {role === 'USUARIO' && (
                    <button className="btn btn-primary" onClick={() => setModal('criar')}>
                        + Novo Chamado
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {['', 'ABERTO', 'EM_ATENDIMENTO', 'FINALIZADO'].map(f => (
                    <button
                        key={f}
                        className={`btn btn-sm ${filtro === f ? 'btn-primary' : ''}`}
                        style={filtro !== f ? { background: 'var(--cor-card)', color: 'var(--cor-texto-sec)', border: '1px solid var(--cor-borda)' } : {}}
                        onClick={() => setFiltro(f)}
                    >
                        {f ? f.replace('_', ' ') : 'Todos'}
                    </button>
                ))}
            </div>

            {/* Tabela */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Titulo</th>
                            <th>Status</th>
                            <th>Prioridade</th>
                            <th>Solicitante</th>
                            <th>Tecnico</th>
                            <th>Data</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chamados.map(c => (
                            <tr key={c.id}>
                                <td>
                                    <span onClick={() => abrirDetalhes(c)} style={{ cursor: 'pointer', color: '#6C63FF', fontWeight: 600 }} title="Ver detalhes">#{c.id}</span>
                                </td>
                                <td>
                                    <span onClick={() => abrirDetalhes(c)} style={{ cursor: 'pointer' }} title="Ver detalhes">
                                        {c.titulo}
                                        {c.imagem_url && <span style={{ marginLeft: 6 }}>📎</span>}
                                    </span>
                                </td>
                                <td>{getStatusBadge(c.status)}</td>
                                <td><span className={`badge badge-${c.prioridade.toLowerCase()}`}>{c.prioridade === 'NENHUMA' ? '-' : c.prioridade}</span></td>
                                <td>{c.usuario?.nome || '-'}</td>
                                <td>{c.tecnico?.nome || <span style={{ color: '#666' }}>Nao atribuido</span>}</td>
                                <td>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                                <td style={{ display: 'flex', gap: '4px' }}>
                                    {/* ADMIN: Atribuir tecnico (so se ABERTO) */}
                                    {role === 'ADMIN' && c.status === 'ABERTO' && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => { setAtribuirModal(c); setTecnicoSelecionado(''); }}
                                            title="Atribuir Tecnico"
                                            style={{ background: 'rgba(108,99,255,0.15)', borderRadius: '6px', padding: '4px 8px' }}
                                        >👤+</button>
                                    )}
                                    {/* TECNICO: Finalizar (so se atribuido a ele e EM_ATENDIMENTO) */}
                                    {role === 'TECNICO' && c.status === 'EM_ATENDIMENTO' && c.tecnico_id === user.id && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => { setFinalizarModal(c); setResolucao(''); setResolucaoImagem(null); }}
                                            title="Finalizar Chamado"
                                            style={{ background: 'rgba(107,203,119,0.15)', borderRadius: '6px', padding: '4px 8px' }}
                                        >✅</button>
                                    )}
                                    {/* ADMIN: Deletar */}
                                    {role === 'ADMIN' && (
                                        <button className="btn-icon" onClick={() => handleDeletar(c.id)} title="Excluir">🗑️</button>
                                    )}
                                    {/* Ver detalhes completos (inclui resolucao) */}
                                    {c.status === 'FINALIZADO' && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => abrirDetalhes(c)}
                                            title="Ver Detalhes e Resolucao"
                                            style={{ background: 'rgba(79,195,247,0.15)', borderRadius: '6px', padding: '4px 8px' }}
                                        >📄</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {chamados.length === 0 && (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Nenhum chamado encontrado</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: USUARIO cria chamado */}
            {modal === 'criar' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Novo Chamado</h2>
                        <form onSubmit={handleCriar}>
                            <div className="form-group">
                                <label className="form-label">Titulo</label>
                                <input className="form-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descricao</label>
                                <textarea className="form-textarea" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required
                                    placeholder="Descreva o problema detalhadamente..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Associar Equipamento (opcional)</label>
                                <select
                                    className="form-select"
                                    value={form.maquina_id}
                                    onChange={(e) => setForm({ ...form, maquina_id: e.target.value })}
                                >
                                    <option value="">-- Nenhum equipamento --</option>
                                    {maquinas.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome} {m.localizacao ? `(${m.localizacao})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Imagem (opcional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setImagemFile(e.target.files[0])}
                                    style={{ color: '#a0a0b0' }}
                                />
                                {imagemFile && <p style={{ color: '#6BCB77', fontSize: 12, marginTop: 4 }}>Arquivo: {imagemFile.name}</p>}
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)' }} onClick={() => setModal(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={enviando}>
                                    {enviando ? 'Enviando...' : 'Abrir Chamado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: ADMIN atribui tecnico */}
            {atribuirModal && (
                <div className="modal-overlay" onClick={() => setAtribuirModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Atribuir Tecnico</h2>
                        <p style={{ color: '#a0a0b0', marginBottom: 16 }}>
                            Chamado: <strong style={{ color: '#fff' }}>#{atribuirModal.id} - {atribuirModal.titulo}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">Selecione o Tecnico</label>
                            <select
                                className="form-select"
                                value={tecnicoSelecionado}
                                onChange={(e) => setTecnicoSelecionado(e.target.value)}
                            >
                                <option value="">-- Selecione --</option>
                                {tecnicos.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome} ({t.email})</option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)' }} onClick={() => setAtribuirModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleAtribuir} disabled={enviando}>
                                {enviando ? 'Atribuindo...' : 'Atribuir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: TECNICO finaliza com relatorio */}
            {finalizarModal && (
                <div className="modal-overlay" onClick={() => setFinalizarModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Finalizar Chamado</h2>
                        <p style={{ color: '#a0a0b0', marginBottom: 16 }}>
                            Chamado: <strong style={{ color: '#fff' }}>#{finalizarModal.id} - {finalizarModal.titulo}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">O que foi feito? (obrigatorio)</label>
                            <textarea
                                className="form-textarea"
                                value={resolucao}
                                onChange={(e) => setResolucao(e.target.value)}
                                required
                                placeholder="Descreva detalhadamente a resolucao do problema..."
                                style={{ minHeight: '120px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Foto da resolucao (opcional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setResolucaoImagem(e.target.files[0])}
                                style={{ color: '#a0a0b0' }}
                            />
                            {resolucaoImagem && <p style={{ color: '#6BCB77', fontSize: 12, marginTop: 4 }}>Arquivo: {resolucaoImagem.name}</p>}
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)' }} onClick={() => setFinalizarModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleFinalizar} disabled={enviando || !resolucao.trim()}>
                                {enviando ? 'Finalizando...' : 'Finalizar Chamado'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Detalhes do Chamado */}
            {detalheModal && (
                <div className="modal-overlay" onClick={() => setDetalheModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                        <h2 className="modal-title">Chamado #{detalheModal.id}</h2>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            {getStatusBadge(detalheModal.status)}
                            <span className={`badge badge-${detalheModal.prioridade.toLowerCase()}`}>{detalheModal.prioridade === 'NENHUMA' ? '-' : detalheModal.prioridade}</span>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 16 }}>{detalheModal.titulo}</h3>
                            <p style={{ color: '#c0c0d0', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detalheModal.descricao}</p>
                        </div>

                        {detalheModal.imagem_url && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ color: '#a0a0b0', fontSize: 12, display: 'block', marginBottom: 6 }}>📎 Imagem anexada:</label>
                                <img src={`${API_URL}${detalheModal.imagem_url}`} alt="Anexo" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #2a2a4a' }} />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                                <span style={{ color: '#a0a0b0', fontSize: 12 }}>Solicitante</span>
                                <p style={{ color: '#fff', margin: '4px 0 0', fontWeight: 600 }}>{detalheModal.usuario?.nome || '-'}</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                                <span style={{ color: '#a0a0b0', fontSize: 12 }}>Tecnico Atribuido</span>
                                <p style={{ color: '#fff', margin: '4px 0 0', fontWeight: 600 }}>{detalheModal.tecnico?.nome || 'Nao atribuido'}</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                                <span style={{ color: '#a0a0b0', fontSize: 12 }}>Criado em</span>
                                <p style={{ color: '#fff', margin: '4px 0 0' }}>{new Date(detalheModal.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                                <span style={{ color: '#a0a0b0', fontSize: 12 }}>Equipamento</span>
                                {detalheModal.maquina_id ? (
                                    <p
                                        style={{ color: '#4FC3F7', margin: '4px 0 0', cursor: 'pointer', fontWeight: 600 }}
                                        title="Clique para ver historico de chamados"
                                        onClick={async () => {
                                            if (equipHistorico) { setEquipHistorico(null); return; }
                                            try {
                                                const hist = await historicoChamadosMaquina(detalheModal.maquina_id);
                                                setEquipHistorico(hist.filter(c => c.id !== detalheModal.id));
                                            } catch { setEquipHistorico([]); }
                                        }}
                                    >
                                        {maquinas.find(m => m.id === detalheModal.maquina_id)?.nome || 'Equipamento'} 🔍
                                    </p>
                                ) : (
                                    <p style={{ color: '#fff', margin: '4px 0 0' }}>Nenhum</p>
                                )}
                            </div>
                        </div>

                        {/* Historico de chamados do equipamento */}
                        {equipHistorico !== null && (
                            <div style={{ background: 'rgba(79,195,247,0.06)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid rgba(79,195,247,0.15)' }}>
                                <h4 style={{ color: '#4FC3F7', margin: '0 0 10px', fontSize: 14 }}>📋 Chamados anteriores deste equipamento</h4>
                                {equipHistorico.length === 0 ? (
                                    <p style={{ color: '#666', margin: 0, fontSize: 13 }}>Nenhum outro chamado associado.</p>
                                ) : (
                                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                        {equipHistorico.map(h => (
                                            <div key={h.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>#{h.id} - {h.titulo}</span>
                                                    {getStatusBadge(h.status)}
                                                </div>
                                                {h.resolucao && (
                                                    <p style={{ color: '#6BCB77', fontSize: 12, margin: '4px 0 0' }}>✅ {h.resolucao}</p>
                                                )}
                                                {!h.resolucao && (
                                                    <p style={{ color: '#a0a0b0', fontSize: 12, margin: '4px 0 0' }}>Sem resolucao ainda</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {detalheModal.finalizado_at && (
                            <div style={{ background: 'rgba(107,203,119,0.08)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                                <span style={{ color: '#6BCB77', fontSize: 12 }}>Finalizado em {new Date(detalheModal.finalizado_at).toLocaleString('pt-BR')}</span>
                            </div>
                        )}

                        {detalheModal.resolucao && (
                            <div style={{ background: 'rgba(107,203,119,0.08)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                                <h4 style={{ color: '#6BCB77', margin: '0 0 8px', fontSize: 14 }}>✅ Resolucao</h4>
                                <p style={{ color: '#c0c0d0', margin: 0, whiteSpace: 'pre-wrap' }}>{detalheModal.resolucao}</p>
                                {detalheModal.resolucao_imagem_url && (
                                    <img src={`${API_URL}${detalheModal.resolucao_imagem_url}`} alt="Resolucao" style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 8, marginTop: 12, border: '1px solid #2a2a4a' }} />
                                )}
                            </div>
                        )}

                        {/* ADMIN: Atribuir tecnico direto no modal */}
                        {role === 'ADMIN' && detalheModal.status === 'ABERTO' && (
                            <div style={{ background: 'rgba(108,99,255,0.08)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                                <h4 style={{ color: '#6C63FF', margin: '0 0 10px', fontSize: 14 }}>👤 Atribuir Tecnico</h4>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select
                                        className="form-select"
                                        value={tecnicoSelecionado}
                                        onChange={(e) => setTecnicoSelecionado(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Selecione um tecnico...</option>
                                        {tecnicos.map(t => (
                                            <option key={t.id} value={t.id}>{t.nome} ({t.email})</option>
                                        ))}
                                    </select>
                                    <button
                                        className="btn btn-primary"
                                        disabled={!tecnicoSelecionado || enviando}
                                        onClick={async () => {
                                            setEnviando(true);
                                            try {
                                                await atribuirTecnico(detalheModal.id, parseInt(tecnicoSelecionado));
                                                setDetalheModal(null);
                                                setTecnicoSelecionado('');
                                                carregar();
                                            } catch (err) {
                                                alert(err.response?.data?.detail || 'Erro ao atribuir.');
                                            }
                                            setEnviando(false);
                                        }}
                                    >
                                        {enviando ? '...' : 'Atribuir'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ===== CHAT ===== */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid rgba(108,99,255,0.1)' }}>
                            <h4 style={{ color: '#6C63FF', margin: '0 0 12px', fontSize: 14 }}>💬 Chat</h4>
                            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                                {mensagens.length === 0 ? (
                                    <p style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 16 }}>Nenhuma mensagem ainda</p>
                                ) : mensagens.map(m => (
                                    <div key={m.id} style={{
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: m.autor_id === user?.id ? 'flex-end' : 'flex-start',
                                        marginBottom: 8
                                    }}>
                                        <span style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>
                                            {m.autor?.nome || 'Usuario'} • {new Date(m.created_at).toLocaleString('pt-BR')}
                                        </span>
                                        <div style={{
                                            background: m.autor_id === user?.id ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.05)',
                                            borderRadius: 10, padding: '8px 12px', maxWidth: '80%',
                                            border: m.mensagem.startsWith('[Editado]') ? '1px solid rgba(255,217,61,0.3)' : 'none'
                                        }}>
                                            <p style={{ margin: 0, fontSize: 13, color: m.mensagem.startsWith('[Editado]') ? '#FFD93D' : '#e0e0e0' }}>{m.mensagem}</p>
                                            {m.imagem_url && <img src={`${API_URL}${m.imagem_url}`} alt="" style={{ maxWidth: 150, borderRadius: 6, marginTop: 4 }} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {detalheModal.status !== 'FINALIZADO' && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        className="form-input"
                                        placeholder="Escreva uma mensagem..."
                                        value={novaMensagem}
                                        onChange={e => setNovaMensagem(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && novaMensagem.trim()) { handleEnviarMsg(); } }}
                                        style={{ flex: 1, padding: '8px 12px' }}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={handleEnviarMsg} disabled={!novaMensagem.trim()}>Enviar</button>
                                </div>
                            )}
                        </div>

                        {/* Edicao pelo usuario */}
                        {role === 'USUARIO' && detalheModal.usuario_id === user?.id && detalheModal.status !== 'FINALIZADO' && !editando && (
                            <button className="btn btn-sm" onClick={() => { setEditando(true); setEditForm({ titulo: detalheModal.titulo, descricao: detalheModal.descricao }); }}
                                style={{ background: 'rgba(255,217,61,0.15)', color: '#FFD93D', marginBottom: 12 }}>✏️ Editar Chamado</button>
                        )}
                        {editando && (
                            <div style={{ background: 'rgba(255,217,61,0.06)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Titulo</label>
                                    <input className="form-input" value={editForm.titulo} onChange={e => setEditForm({ ...editForm, titulo: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Descricao</label>
                                    <textarea className="form-textarea" value={editForm.descricao} onChange={e => setEditForm({ ...editForm, descricao: e.target.value })} rows={3}></textarea>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-danger btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
                                    <button className="btn btn-primary btn-sm" onClick={async () => {
                                        try {
                                            await editarChamadoUsuario(detalheModal.id, editForm);
                                            setEditando(false);
                                            setDetalheModal(null);
                                            carregar();
                                        } catch (err) { alert(err.response?.data?.detail || 'Erro ao editar'); }
                                    }}>Salvar</button>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={() => { setDetalheModal(null); setEditando(false); }}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
