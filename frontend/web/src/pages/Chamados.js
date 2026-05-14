/**
 * tiResolve Web - Pagina de Chamados
 * Views diferenciadas por role:
 * - ADMIN: ve todos, atribui tecnico
 * - TECNICO: ve todos, finaliza os dele com relatorio
 * - USUARIO: ve apenas os dele, cria novos com imagem
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import {
    listarChamados, criarChamado, deletarChamado,
    listarTecnicos, atribuirTecnico, finalizarChamado,
    uploadImagem, getUser, listarMaquinas, historicoChamadosMaquina, API_URL,
    listarMensagens, enviarMensagem, editarChamadoUsuario, atualizarChamado,
    marcarManutencao
} from '../services/api';

const CATEGORIA_COLOR = {
    HARDWARE: '#FF6B6B', EMAIL: '#4FC3F7', IMPRESSORA: '#FFD93D',
    SERVIDOR: '#A78BFA', SOFTWARE: '#6C63FF', REDES: '#26C6DA',
    ACESSO: '#FF8A65', SEGURANCA: '#EF5350', OUTROS: '#9E9E9E'
};

export default function ChamadosPage() {
    const [chamados, setChamados] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [filtro, setFiltro] = useState('');
    const [modal, setModal] = useState(null);
    const [tecnicos, setTecnicos] = useState([]);
    const [form, setForm] = useState({ titulo: '', descricao: '', maquina_id: '' });
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
    const [visaoTecnico, setVisaoTecnico] = useState('meus');
    const [manutencaoModal, setManutencaoModal] = useState(null); // chamado selecionado
    const [motivoManutencao, setMotivoManutencao] = useState('');
    const [salvandoManutencao, setSalvandoManutencao] = useState(false);

    const user = getUser();
    const role = user?.role;
    const location = useLocation();
    const autoAbrirFeito = useRef(false);
    const detalheModalRef = useRef(null);

    // Mantém ref sincronizado para uso no callback do WS
    useEffect(() => { detalheModalRef.current = detalheModal; }, [detalheModal]);

    // WebSocket: atualiza em tempo real
    const handleWsEvent = useCallback((event, data) => {
        if (['chamado_criado', 'chamado_atribuido', 'chamado_finalizado',
             'chamado_editado', 'chamado_atualizado', 'chamado_deletado'].includes(event)) {
            carregar();
        }
        if (event === 'nova_mensagem' && detalheModalRef.current &&
            detalheModalRef.current.id === data?.chamado_id) {
            listarMensagens(data.chamado_id).then(setMensagens).catch(() => {});
        }
    }, []);
    useWebSocket(handleWsEvent);

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
            // Auto-abre ticket passado via ?abrir=ID (vindo do Dashboard)
            if (!autoAbrirFeito.current) {
                const params = new URLSearchParams(location.search);
                const abrirId = params.get('abrir');
                if (abrirId) {
                    autoAbrirFeito.current = true;
                    const alvo = dados.find(c => c.id === parseInt(abrirId));
                    if (alvo) abrirDetalhes(alvo);
                }
            }
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
            setForm({ titulo: '', descricao: '', maquina_id: '' });
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
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                    { value: '',               label: 'Todos',          icon: 'fa-list',                color: '#6C63FF' },
                    { value: 'ABERTO',         label: 'Aberto',         icon: 'fa-circle-exclamation',  color: '#FF6B6B' },
                    { value: 'EM_ATENDIMENTO', label: 'Em atendimento', icon: 'fa-clock',               color: '#FFD93D' },
                    { value: 'FINALIZADO',     label: 'Finalizados',    icon: 'fa-circle-check',        color: '#6BCB77' },
                ].map(f => {
                    const ativo = filtro === f.value;
                    return (
                        <button
                            key={f.value || 'todos'}
                            type="button"
                            onClick={() => setFiltro(f.value)}
                            style={{
                                padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                border: `1.5px solid ${ativo ? f.color : f.color + '55'}`,
                                background: ativo ? f.color + '22' : 'transparent',
                                color: f.color,
                                fontWeight: ativo ? 700 : 500, transition: 'all .15s',
                                display: 'inline-flex', alignItems: 'center', gap: 6
                            }}
                        >
                            <i className={`fa-solid ${f.icon}`}></i>
                            {f.label}
                        </button>
                    );
                })}

                {/* Toggle Meus / Geral — apenas TECNICO */}
                {role === 'TECNICO' && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, background: 'var(--cor-card)', border: '1px solid var(--cor-borda)', borderRadius: 8, padding: 3 }}>
                        <button
                            className={`btn btn-sm ${visaoTecnico === 'meus' ? 'btn-primary' : ''}`}
                            style={visaoTecnico !== 'meus' ? { background: 'transparent', color: 'var(--cor-texto-sec)', border: 'none' } : {}}
                            onClick={() => setVisaoTecnico('meus')}
                        >
                            <i className="fa-solid fa-user" style={{ marginRight: 5 }}></i>Meus Chamados
                        </button>
                        <button
                            className={`btn btn-sm ${visaoTecnico === 'geral' ? 'btn-primary' : ''}`}
                            style={visaoTecnico !== 'geral' ? { background: 'transparent', color: 'var(--cor-texto-sec)', border: 'none' } : {}}
                            onClick={() => setVisaoTecnico('geral')}
                        >
                            <i className="fa-solid fa-list" style={{ marginRight: 5 }}></i>Geral
                        </button>
                    </div>
                )}
            </div>

            {/* Tabela */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Titulo</th>
                            <th>Status</th>
                            <th>Categoria</th>
                            <th>Prioridade</th>
                            <th>Solicitante</th>
                            <th>Tecnico</th>
                            <th>Data</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(role === 'TECNICO' && visaoTecnico === 'meus'
                            ? chamados.filter(c => c.tecnico_id === user?.id)
                            : chamados
                        ).slice().sort((a, b) => {
                            const aSem = !a.tecnico_id && a.status === 'ABERTO' ? 1 : 0;
                            const bSem = !b.tecnico_id && b.status === 'ABERTO' ? 1 : 0;
                            return bSem - aSem;
                        }).map(c => {
                            const semTecnico = !c.tecnico_id && c.status === 'ABERTO';
                            return (
                            <tr key={c.id} style={semTecnico ? {
                                background: 'rgba(255,107,107,0.05)',
                                borderLeft: '3px solid #FF6B6B',
                                ...(role !== 'USUARIO' ? { animation: 'piscar-linha 2.5s ease-in-out infinite' } : {})
                            } : {}}>
                                <td>
                                    <span onClick={() => abrirDetalhes(c)} style={{ cursor: 'pointer', color: '#6C63FF', fontWeight: 600 }} title="Ver detalhes">#{c.id}</span>
                                </td>
                                <td>
                                    <span onClick={() => abrirDetalhes(c)} style={{ cursor: 'pointer' }} title="Ver detalhes">
                                        {c.titulo}
                                        {c.imagem_url && <span style={{ marginLeft: 6 }}><i className="fa-solid fa-paperclip"></i></span>}
                                    </span>
                                </td>
                                <td>{getStatusBadge(c.status)}</td>
                                <td>
                                    <span style={{
                                        background: (CATEGORIA_COLOR[c.categoria] || '#9E9E9E') + '22',
                                        color: CATEGORIA_COLOR[c.categoria] || '#9E9E9E',
                                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600
                                    }}>{c.categoria || 'OUTROS'}</span>
                                </td>
                                <td><span className={`badge badge-${(c.prioridade || 'NENHUMA').toLowerCase()}`}>{c.prioridade === 'NENHUMA' ? '-' : c.prioridade}</span></td>
                                <td>{c.usuario?.nome || '-'}</td>
                                <td>{c.tecnico?.nome || <span style={{ color: '#666' }}>Nao atribuido</span>}</td>
                                <td>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                                <td style={{ display: 'flex', gap: '4px' }}>
                                    {/* Badge sem técnico */}
                                    {semTecnico && role === 'ADMIN' && (
                                        <span title="Sem técnico" style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', borderRadius: 6, padding: '3px 7px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                        </span>
                                    )}
                                    {/* ADMIN: Atribuir tecnico (so se ABERTO) */}
                                    {role === 'ADMIN' && c.status === 'ABERTO' && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => { setAtribuirModal(c); setTecnicoSelecionado(''); }}
                                            title="Atribuir Tecnico"
                                            style={{ background: 'rgba(108,99,255,0.15)', color: '#6C63FF', borderRadius: '6px', padding: '4px 8px' }}
                                        ><i className="fa-solid fa-user-plus"></i></button>
                                    )}
                                    {/* TECNICO: Finalizar (so se atribuido a ele e EM_ATENDIMENTO) */}
                                    {role === 'TECNICO' && c.status === 'EM_ATENDIMENTO' && c.tecnico_id === user.id && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => { setFinalizarModal(c); setResolucao(''); setResolucaoImagem(null); }}
                                            title="Finalizar Chamado"
                                            style={{ background: 'rgba(107,203,119,0.15)', color: '#6BCB77', borderRadius: '6px', padding: '4px 8px' }}
                                        ><i className="fa-solid fa-circle-check"></i></button>
                                    )}
                                    {/* ADMIN: Deletar */}
                                    {role === 'ADMIN' && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleDeletar(c.id)}
                                            title="Excluir"
                                            style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', borderRadius: '6px', padding: '4px 8px' }}
                                        ><i className="fa-solid fa-trash"></i></button>
                                    )}
                                    {/* Ver detalhes completos (inclui resolucao) */}
                                    {c.status === 'FINALIZADO' && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => abrirDetalhes(c)}
                                            title="Ver Detalhes e Resolucao"
                                            style={{ background: 'rgba(79,195,247,0.15)', color: '#4FC3F7', borderRadius: '6px', padding: '4px 8px' }}
                                        ><i className="fa-solid fa-file-lines"></i></button>
                                    )}
                                </td>
                            </tr>
                            );
                        })}
                        {(role === 'TECNICO' && visaoTecnico === 'meus'
                            ? chamados.filter(c => c.tecnico_id === user?.id)
                            : chamados
                        ).length === 0 && ( 
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                {role === 'TECNICO' && visaoTecnico === 'meus'
                                    ? 'Nenhum chamado atribuído a você'
                                    : 'Nenhum chamado encontrado'}
                            </td></tr>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                    <input id="file-img-criar" type="file" accept="image/*" onChange={(e) => setImagemFile(e.target.files[0])} style={{ display: 'none' }} />
                                    <label htmlFor="file-img-criar" className="btn btn-sm" style={{ cursor: 'pointer', background: 'var(--cor-superficie)', color: 'var(--cor-texto)', border: '1px solid var(--cor-borda)', margin: 0 }}>
                                        <i className="fa-solid fa-paperclip" style={{ marginRight: 6 }}></i>Escolher arquivo
                                    </label>
                                    <span style={{ color: '#a0a0b0', fontSize: 12 }}>{imagemFile ? imagemFile.name : 'Nenhum arquivo escolhido'}</span>
                                </div>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                <input id="file-resolucao" type="file" accept="image/*" onChange={(e) => setResolucaoImagem(e.target.files[0])} style={{ display: 'none' }} />
                                <label htmlFor="file-resolucao" className="btn btn-sm" style={{ cursor: 'pointer', background: 'var(--cor-superficie)', color: 'var(--cor-texto)', border: '1px solid var(--cor-borda)', margin: 0 }}>
                                    <i className="fa-solid fa-camera" style={{ marginRight: 6 }}></i>Escolher arquivo
                                </label>
                                <span style={{ color: '#a0a0b0', fontSize: 12 }}>{resolucaoImagem ? resolucaoImagem.name : 'Nenhum arquivo escolhido'}</span>
                            </div>
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
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                            {getStatusBadge(detalheModal.status)}
                            <span style={{
                                background: (CATEGORIA_COLOR[detalheModal.categoria] || '#9E9E9E') + '22',
                                color: CATEGORIA_COLOR[detalheModal.categoria] || '#9E9E9E',
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600
                            }}><i className="fa-solid fa-file-lines"></i> {detalheModal.categoria || 'OUTROS'}</span>
                            <span className={`badge badge-${(detalheModal.prioridade || 'NENHUMA').toLowerCase()}`}>{detalheModal.prioridade === 'NENHUMA' ? 'Sem prioridade' : detalheModal.prioridade}</span>
                            {/* Selector de prioridade: ADMIN sempre, TECNICO so se atribuido */}
                            {detalheModal.status !== 'FINALIZADO' && (
                                role === 'ADMIN' || (role === 'TECNICO' && detalheModal.tecnico_id === user?.id)
                            ) && (
                                <select
                                    className="form-select"
                                    value={detalheModal.prioridade || 'NENHUMA'}
                                    style={{ width: 150, padding: '4px 8px', fontSize: 12 }}
                                    onChange={async (e) => {
                                        try {
                                            const upd = await atualizarChamado(detalheModal.id, { prioridade: e.target.value });
                                            setDetalheModal({ ...detalheModal, prioridade: upd.prioridade });
                                            carregar();
                                        } catch (err) {
                                            alert(err.response?.data?.detail || 'Erro ao alterar prioridade.');
                                        }
                                    }}
                                >
                                    <option value="NENHUMA">Sem prioridade</option>
                                    <option value="BAIXA">Baixa</option>
                                    <option value="MEDIA">Média</option>
                                    <option value="ALTA">Alta</option>
                                    <option value="CRITICA">Crítica</option>
                                </select>
                            )}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 16 }}>{detalheModal.titulo}</h3>
                            <p style={{ color: '#c0c0d0', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detalheModal.descricao}</p>
                        </div>

                        {detalheModal.imagem_url && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ color: '#a0a0b0', fontSize: 12, display: 'block', marginBottom: 6 }}><i className="fa-solid fa-paperclip"></i> Imagem anexada:</label>
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
                                        {maquinas.find(m => m.id === detalheModal.maquina_id)?.nome || 'Equipamento'} <i className="fa-solid fa-magnifying-glass"></i>
                                    </p>
                                ) : (
                                    <p style={{ color: '#fff', margin: '4px 0 0' }}>Nenhum</p>
                                )}
                            </div>
                        </div>

                        {/* Historico de chamados do equipamento */}
                        {equipHistorico !== null && (
                            <div style={{ background: 'rgba(79,195,247,0.06)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid rgba(79,195,247,0.15)' }}>
                                <h4 style={{ color: '#4FC3F7', margin: '0 0 10px', fontSize: 14 }}><i className="fa-solid fa-clipboard-list"></i> Chamados anteriores deste equipamento</h4>
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
                                                    <p style={{ color: '#6BCB77', fontSize: 12, margin: '4px 0 0' }}><i className="fa-solid fa-circle-check"></i> {h.resolucao}</p>
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
                                <h4 style={{ color: '#6BCB77', margin: '0 0 8px', fontSize: 14 }}><i className="fa-solid fa-circle-check"></i> Resolucao</h4>
                                <p style={{ color: '#c0c0d0', margin: 0, whiteSpace: 'pre-wrap' }}>{detalheModal.resolucao}</p>
                                {detalheModal.resolucao_imagem_url && (
                                    <img src={`${API_URL}${detalheModal.resolucao_imagem_url}`} alt="Resolucao" style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 8, marginTop: 12, border: '1px solid #2a2a4a' }} />
                                )}
                            </div>
                        )}

                        {/* ADMIN: Atribuir tecnico direto no modal */}
                        {role === 'ADMIN' && detalheModal.status === 'ABERTO' && (
                            <div style={{ background: 'rgba(108,99,255,0.08)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                                <h4 style={{ color: '#6C63FF', margin: '0 0 10px', fontSize: 14 }}><i className="fa-solid fa-user"></i> Atribuir Tecnico</h4>
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
                            <h4 style={{ color: '#6C63FF', margin: '0 0 12px', fontSize: 14 }}><i className="fa-solid fa-comments"></i> Chat</h4>
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
                                style={{ background: 'rgba(255,217,61,0.15)', color: '#FFD93D', marginBottom: 12 }}><i className="fa-solid fa-pen"></i> Editar Chamado</button>
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

                        <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {/* Botão Em Manutenção - dentro do detalhe */}
                            {(role === 'ADMIN' || (role === 'TECNICO' && detalheModal.tecnico_id === user?.id)) &&
                             detalheModal.status === 'EM_ATENDIMENTO' && detalheModal.maquina_id && (
                                <button
                                    className="btn"
                                    style={{ background: 'rgba(255,217,61,0.15)', color: '#FFD93D', border: '1px solid rgba(255,217,61,0.3)' }}
                                    onClick={() => { setManutencaoModal(detalheModal); setMotivoManutencao(''); }}
                                >
                                    <i className="fa-solid fa-wrench" style={{ marginRight: 6 }}></i>Em Manutenção
                                </button>
                            )}
                            <button className="btn btn-primary" onClick={() => { setDetalheModal(null); setEditando(false); }}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Em Manutenção */}
            {manutencaoModal && (
                <div className="modal-overlay" onClick={() => setManutencaoModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ color: '#FFD93D' }}>
                                <i className="fa-solid fa-wrench" style={{ marginRight: 8 }}></i>Equipamento em Manutenção
                            </h3>
                            <button className="modal-close" onClick={() => setManutencaoModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: '#a0a0b0', marginBottom: 12, fontSize: 14 }}>
                                Chamado <strong style={{ color: '#fff' }}>#{manutencaoModal.id} — {manutencaoModal.titulo}</strong>
                            </p>
                            <p style={{ color: '#a0a0b0', marginBottom: 14, fontSize: 13 }}>
                                Informe o motivo pelo qual o equipamento está sendo colocado em manutenção:
                            </p>
                            <textarea
                                className="form-input"
                                rows={3}
                                placeholder="Ex: Aguardando fonte para substituição, Enviado para assistência técnica..."
                                value={motivoManutencao}
                                onChange={e => setMotivoManutencao(e.target.value)}
                                style={{ resize: 'vertical' }}
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setManutencaoModal(null)}>Cancelar</button>
                            <button
                                className="btn"
                                style={{ background: '#FFD93D', color: '#1a1a2e', fontWeight: 700 }}
                                disabled={salvandoManutencao || !motivoManutencao.trim()}
                                onClick={async () => {
                                    setSalvandoManutencao(true);
                                    try {
                                        await marcarManutencao(manutencaoModal.id, motivoManutencao.trim());
                                        setManutencaoModal(null);
                                        setMotivoManutencao('');
                                        await carregar();
                                    } catch (e) {
                                        alert(e?.response?.data?.detail || 'Erro ao marcar manutenção');
                                    } finally { setSalvandoManutencao(false); }
                                }}
                            >
                                {salvandoManutencao ? 'Salvando...' : <><i className="fa-solid fa-wrench" style={{ marginRight: 6 }}></i>Confirmar Manutenção</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
