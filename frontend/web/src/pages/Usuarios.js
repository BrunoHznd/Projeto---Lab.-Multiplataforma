/**
 * tiResolve Web - Pagina de Usuarios
 * CRUD + QR Code para cadastro, edicao, stats, troca de senha.
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    registrarUsuario, editarUsuario, alterarSenha,
    statsUsuario, excluirUsuario, getUser, getOrg, API_URL
} from '../services/api';
import api from '../services/api';

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [modal, setModal] = useState(false); // criar
    const [editModal, setEditModal] = useState(null);
    const [statsModal, setStatsModal] = useState(null);
    const [qrModal, setQrModal] = useState(false);
    const [senhaModal, setSenhaModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(null);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'USUARIO', habilidades: [], max_tickets: 10 });
    const [editForm, setEditForm] = useState({ nome: '', role: '', habilidades: [], max_tickets: 10 });
    const [filtroRoles, setFiltroRoles] = useState(['USUARIO', 'TECNICO', 'ADMIN']);

    const HABILIDADES = [
        { value: 'REDE', label: 'Rede' },
        { value: 'HARDWARE', label: 'Hardware' },
        { value: 'SOFTWARE', label: 'Software' },
        { value: 'SEGURANCA', label: 'Segurança' },
        { value: 'IMPRESSORA', label: 'Impressora' },
        { value: 'ACESSOS', label: 'Acessos' },
        { value: 'SERVIDOR', label: 'Servidor' },
        { value: 'OUTROS', label: 'Outros' },
    ];

    const toggleHab = (formObj, setFormObj, hab) => {
        const list = formObj.habilidades || [];
        const novo = list.includes(hab) ? list.filter(h => h !== hab) : [...list, hab];
        setFormObj({ ...formObj, habilidades: novo });
    };
    const [senhaForm, setSenhaForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' });
    const [showSenha, setShowSenha] = useState({ atual: false, nova: false, confirmar: false });

    const user = getUser();
    const org = getOrg();

    const toggleFiltroRole = (role) => {
        setFiltroRoles(prev =>
            prev.includes(role)
                ? prev.length > 1 ? prev.filter(r => r !== role) : prev
                : [...prev, role]
        );
    };

    const usuariosFiltrados = usuarios.filter(u => filtroRoles.includes(u.role));

    useEffect(() => { carregar(); }, []);

    const carregar = async () => {
        try {
            const res = await api.get('/auth/users');
            setUsuarios(res.data);
        } catch (err) { console.error(err); }
        setCarregando(false);
    };

    const handleCriar = async (e) => {
        e.preventDefault();
        if (form.role === 'TECNICO' && (!form.habilidades || form.habilidades.length < 1)) {
            alert('Tecnico deve ter pelo menos 1 habilidade.');
            return;
        }
        try {
            const payload = { ...form };
            if (payload.role !== 'TECNICO') { delete payload.habilidades; delete payload.max_tickets; }
            else payload.max_tickets = parseInt(payload.max_tickets, 10) || 10;
            await registrarUsuario(payload);
            setModal(false);
            setForm({ nome: '', email: '', senha: '', role: 'USUARIO', habilidades: [], max_tickets: 10 });
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao criar usuario.');
        }
    };

    const handleEditar = async (e) => {
        e.preventDefault();
        if (editForm.role === 'TECNICO' && (!editForm.habilidades || editForm.habilidades.length < 1)) {
            alert('Tecnico deve ter pelo menos 1 habilidade.');
            return;
        }
        try {
            const payload = { ...editForm };
            if (payload.role !== 'TECNICO') { delete payload.habilidades; delete payload.max_tickets; }
            else payload.max_tickets = parseInt(payload.max_tickets, 10) || 10;
            await editarUsuario(editModal.id, payload);
            setEditModal(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao editar.');
        }
    };

    const handleExcluir = async (userId) => {
        try {
            await excluirUsuario(userId);
            setDeleteModal(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao excluir usuario.');
        }
    };

    const handleAlterarSenha = async (e) => {
        e.preventDefault();
        if (senhaForm.nova_senha !== senhaForm.confirmar) {
            alert('As senhas nao coincidem!');
            return;
        }
        try {
            await alterarSenha(senhaForm.senha_atual, senhaForm.nova_senha);
            alert('Senha alterada com sucesso!');
            setSenhaModal(false);
            setSenhaForm({ senha_atual: '', nova_senha: '', confirmar: '' });
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao alterar senha.');
        }
    };

    const abrirStats = async (u) => {
        try {
            const data = await statsUsuario(u.id);
            setStatsModal(data);
        } catch { alert('Erro ao carregar stats'); }
    };

    const qrUrl = org ? `tiresolve://registro/${org.codigo_acesso}` : '';

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Usuarios</h1>
                    <p className="page-subtitle">Gerencie os usuarios do sistema</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => setSenhaModal(true)} style={{ background: 'rgba(255,217,61,0.15)', color: '#FFD93D' }}>
                        <i className="fa-solid fa-lock"></i> Alterar Senha
                    </button>
                    {user?.role === 'ADMIN' && (
                        <>
                            <button className="btn" onClick={() => setQrModal(true)} style={{ background: 'rgba(107,203,119,0.15)', color: '#6BCB77' }}>
                                <i className="fa-solid fa-qrcode"></i> Gerar QR Code
                            </button>
                            <button className="btn btn-primary" onClick={() => setModal(true)}>
                                <i className="fa-solid fa-plus"></i> Novo Usuario
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filtro de Roles */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[{ value: 'USUARIO', label: 'Usuários', icon: 'fa-user', color: '#6C63FF' },
                  { value: 'TECNICO', label: 'Técnicos', icon: 'fa-wrench', color: '#26C6DA' },
                  { value: 'ADMIN', label: 'Admin', icon: 'fa-crown', color: '#FFD93D' }].map(r => {
                    const ativo = filtroRoles.includes(r.value);
                    return (
                        <button key={r.value} type="button" onClick={() => toggleFiltroRole(r.value)}
                            style={{
                                padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                border: `1.5px solid ${ativo ? r.color : 'var(--cor-borda)'}`,
                                background: ativo ? r.color + '22' : 'transparent',
                                color: ativo ? r.color : 'var(--cor-texto-sec)',
                                fontWeight: ativo ? 700 : 400, transition: 'all .15s'
                            }}>
                            {ativo ? <><i className="fa-solid fa-check"></i> </> : ''}{r.label}
                        </button>
                    );
                })}
                <span style={{ alignSelf: 'center', fontSize: 12, color: '#666', marginLeft: 4 }}>
                    {usuariosFiltrados.length} usuário{usuariosFiltrados.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Tabela */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Papel</th>
                            <th>Limite Tickets</th>
                            <th>Data de Cadastro</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuariosFiltrados.map(u => (
                            <tr key={u.id}>
                                <td>#{u.id}</td>
                                <td>{u.nome}</td>
                                <td style={{ color: '#a0a0b0' }}>{u.email}</td>
                                <td>
                                    <span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {u.role === 'TECNICO'
                                        ? <span style={{ background: 'rgba(108,99,255,0.15)', color: '#6C63FF', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{u.max_tickets ?? 10}</span>
                                        : <span style={{ color: '#555' }}>—</span>}
                                </td>
                                <td>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                                <td>
                                    {u.role === 'USUARIO' && (
                                        <button className="btn-icon" onClick={() => abrirStats(u)} title="Ver tickets"><i className="fa-solid fa-chart-bar"></i></button>
                                    )}
                                    {user?.role === 'ADMIN' && (
                                        <>
                                            <button className="btn-icon" onClick={() => { setEditModal(u); setEditForm({ nome: u.nome, role: u.role, habilidades: u.habilidades || [], max_tickets: u.max_tickets ?? 10 }); }} title="Editar"><i className="fa-solid fa-pen"></i></button>
                                            {user?.id !== u.id && (
                                                <button className="btn-icon" onClick={() => setDeleteModal(u)} title="Excluir" style={{ color: '#ef4444' }}><i className="fa-solid fa-trash"></i></button>
                                            )}
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {usuariosFiltrados.length === 0 && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Nenhum usuario encontrado</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Criar */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title"><i className="fa-solid fa-plus"></i> Novo Usuario</h2>
                        <form onSubmit={handleCriar}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input className="form-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Senha</label>
                                <input className="form-input" type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required minLength={6} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Papel</label>
                                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="USUARIO">Usuario</option>
                                    <option value="TECNICO">Tecnico</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            {form.role === 'TECNICO' && (
                                <div className="form-group">
                                    <label className="form-label">Limite de Tickets em Atendimento</label>
                                    <input className="form-input" type="number" min="1" max="100" value={form.max_tickets}
                                        onChange={e => setForm({ ...form, max_tickets: e.target.value })} />
                                    <span style={{ fontSize: 11, color: '#a0a0b0' }}>Máximo de chamados simultâneos com status EM_ATENDIMENTO</span>
                                </div>
                            )}
                            {form.role === 'TECNICO' && (
                                <div className="form-group">
                                    <label className="form-label">Habilidades * (selecione pelo menos 1)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {HABILIDADES.map(h => {
                                            const ativo = (form.habilidades || []).includes(h.value);
                                            return (
                                                <button type="button" key={h.value}
                                                    onClick={() => toggleHab(form, setForm, h.value)}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: 16, fontSize: 12,
                                                        border: ativo ? '1px solid #6C63FF' : '1px solid var(--cor-borda)',
                                                        background: ativo ? 'rgba(108,99,255,0.18)' : 'transparent',
                                                        color: ativo ? '#6C63FF' : 'var(--cor-texto-sec)',
                                                        cursor: 'pointer', fontWeight: ativo ? 600 : 400
                                                    }}>
                                                    {ativo ? '✓ ' : ''}{h.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn btn-danger" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Criar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Usuario */}
            {editModal && (
                <div className="modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title"><i className="fa-solid fa-pen"></i> Editar Usuario</h2>
                        <form onSubmit={handleEditar}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input className="form-input" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Papel</label>
                                <select className="form-select" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                    <option value="USUARIO">Usuario</option>
                                    <option value="TECNICO">Tecnico</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            {editForm.role === 'TECNICO' && (
                                <div className="form-group">
                                    <label className="form-label">Limite de Tickets em Atendimento</label>
                                    <input className="form-input" type="number" min="1" max="100" value={editForm.max_tickets}
                                        onChange={e => setEditForm({ ...editForm, max_tickets: e.target.value })} />
                                    <span style={{ fontSize: 11, color: '#a0a0b0' }}>Máximo de chamados simultâneos com status EM_ATENDIMENTO</span>
                                </div>
                            )}
                            {editForm.role === 'TECNICO' && (
                                <div className="form-group">
                                    <label className="form-label">Habilidades * (selecione pelo menos 1)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {HABILIDADES.map(h => {
                                            const ativo = (editForm.habilidades || []).includes(h.value);
                                            return (
                                                <button type="button" key={h.value}
                                                    onClick={() => toggleHab(editForm, setEditForm, h.value)}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: 16, fontSize: 12,
                                                        border: ativo ? '1px solid #6C63FF' : '1px solid var(--cor-borda)',
                                                        background: ativo ? 'rgba(108,99,255,0.18)' : 'transparent',
                                                        color: ativo ? '#6C63FF' : 'var(--cor-texto-sec)',
                                                        cursor: 'pointer', fontWeight: ativo ? 600 : 400
                                                    }}>
                                                    {ativo ? '✓ ' : ''}{h.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn btn-danger" onClick={() => setEditModal(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Stats */}
            {statsModal && (
                <div className="modal-overlay" onClick={() => setStatsModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <h2 className="modal-title"><i className="fa-solid fa-chart-bar"></i> Estatisticas</h2>
                        <div style={{ textAlign: 'center', padding: 16 }}>
                            <h3 style={{ margin: '0 0 4px', color: '#fff' }}>{statsModal.nome}</h3>
                            <p style={{ color: '#a0a0b0', fontSize: 13, margin: '0 0 16px' }}>{statsModal.email}</p>
                            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                                <div style={{ background: 'rgba(108,99,255,0.1)', borderRadius: 10, padding: '16px 24px' }}>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: '#6C63FF' }}>{statsModal.total_chamados}</div>
                                    <div style={{ fontSize: 11, color: '#a0a0b0' }}>Total</div>
                                </div>
                                <div style={{ background: 'rgba(255,217,61,0.1)', borderRadius: 10, padding: '16px 24px' }}>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: '#FFD93D' }}>{statsModal.chamados_abertos}</div>
                                    <div style={{ fontSize: 11, color: '#a0a0b0' }}>Abertos</div>
                                </div>
                                <div style={{ background: 'rgba(107,203,119,0.1)', borderRadius: 10, padding: '16px 24px' }}>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: '#6BCB77' }}>{statsModal.chamados_finalizados}</div>
                                    <div style={{ fontSize: 11, color: '#a0a0b0' }}>Finalizados</div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={() => setStatsModal(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal QR Code */}
            {qrModal && (
                <div className="modal-overlay" onClick={() => setQrModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
                        <h2 className="modal-title"><i className="fa-solid fa-qrcode"></i> QR Code de Cadastro</h2>
                        <p style={{ color: '#a0a0b0', fontSize: 13, margin: '0 0 16px' }}>
                            Escaneie para se cadastrar como usuario na organizacao <b style={{ color: '#fff' }}>{org?.nome}</b>
                        </p>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'inline-block', margin: '0 auto 16px' }}>
                            <QRCodeSVG value={qrUrl} size={200} />
                        </div>
                        <p style={{ color: '#666', fontSize: 11, wordBreak: 'break-all' }}>{qrUrl}</p>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={() => setQrModal(false)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Excluir Confirmacao */}
            {deleteModal && (
                <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <h2 className="modal-title" style={{ color: '#ef4444' }}><i className="fa-solid fa-triangle-exclamation"></i> Confirmar Exclusão</h2>
                        <p style={{ color: '#a0a0b0', fontSize: 14, marginBottom: 16 }}>
                            Tem certeza que deseja excluir <b style={{ color: '#fff' }}>{deleteModal.nome}</b>?
                            <br/>Esta ação não pode ser desfeita.
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-primary" onClick={() => setDeleteModal(null)}>Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={() => handleExcluir(deleteModal.id)}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Alterar Senha */}
            {senhaModal && (
                <div className="modal-overlay" onClick={() => setSenhaModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <h2 className="modal-title"><i className="fa-solid fa-lock"></i> Alterar Senha</h2>
                        <form onSubmit={handleAlterarSenha}>
                            <div className="form-group">
                                <label className="form-label">Senha Atual</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showSenha.atual ? 'text' : 'password'} value={senhaForm.senha_atual} onChange={e => setSenhaForm({ ...senhaForm, senha_atual: e.target.value })} required style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowSenha(s => ({ ...s, atual: !s.atual }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#a0a0b0' }}>{showSenha.atual ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nova Senha <span style={{ color: '#666', fontSize: 11 }}>(mínimo 6 caracteres)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showSenha.nova ? 'text' : 'password'} value={senhaForm.nova_senha} onChange={e => setSenhaForm({ ...senhaForm, nova_senha: e.target.value })} required minLength={6} style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowSenha(s => ({ ...s, nova: !s.nova }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#a0a0b0' }}>{showSenha.nova ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirmar Nova Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showSenha.confirmar ? 'text' : 'password'} value={senhaForm.confirmar} onChange={e => setSenhaForm({ ...senhaForm, confirmar: e.target.value })} required style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowSenha(s => ({ ...s, confirmar: !s.confirmar }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#a0a0b0' }}>{showSenha.confirmar ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}</button>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-danger" onClick={() => setSenhaModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Alterar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
