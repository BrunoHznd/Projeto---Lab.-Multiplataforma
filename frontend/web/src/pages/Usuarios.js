/**
 * tiResolve Web - Pagina de Usuarios
 * CRUD + QR Code para cadastro, edicao, stats, troca de senha.
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    registrarUsuario, editarUsuario, alterarSenha,
    statsUsuario, excluirUsuario, getUser, getOrg, API_URL,
    uploadImagem, atualizarLogoOrg, adminTrocarSenhaUsuario
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
    const [logoModal, setLogoModal] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [enviandoLogo, setEnviandoLogo] = useState(false);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'USUARIO', habilidades: [], max_tickets: 10 });
    const [editForm, setEditForm] = useState({ nome: '', role: '', habilidades: [], max_tickets: 10 });
    const [filtroRoles, setFiltroRoles] = useState(['USUARIO', 'TECNICO', 'ADMIN']);

    const HABILIDADES = [
        { value: 'REDE', label: 'Rede', icon: 'fa-network-wired', color: '#4FC3F7' },
        { value: 'HARDWARE', label: 'Hardware', icon: 'fa-microchip', color: '#FF9F43' },
        { value: 'SOFTWARE', label: 'Software', icon: 'fa-code', color: '#6BCB77' },
        { value: 'SEGURANCA', label: 'Segurança', icon: 'fa-shield-halved', color: '#FF6B6B' },
        { value: 'IMPRESSORA', label: 'Impressora', icon: 'fa-print', color: '#A78BFA' },
        { value: 'ACESSOS', label: 'Acessos', icon: 'fa-key', color: '#FFD93D' },
        { value: 'SERVIDOR', label: 'Servidor', icon: 'fa-server', color: '#26C6DA' },
        { value: 'OUTROS', label: 'Outros', icon: 'fa-ellipsis', color: '#9CA3AF' },
    ];

    const HABILIDADE_INFO = HABILIDADES.reduce((acc, h) => { acc[h.value] = h; return acc; }, {});

    const renderHabilidadesPicker = (formObj, setFormObj) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {HABILIDADES.map(h => {
                const ativo = (formObj.habilidades || []).includes(h.value);
                return (
                    <button type="button" key={h.value}
                        onClick={() => toggleHab(formObj, setFormObj, h.value)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                            border: ativo ? `1.5px solid ${h.color}` : '1.5px solid var(--cor-borda)',
                            background: ativo
                                ? `linear-gradient(135deg, ${h.color}33, ${h.color}1a)`
                                : 'rgba(255,255,255,0.02)',
                            color: ativo ? h.color : 'var(--cor-texto-sec)',
                            cursor: 'pointer', transition: 'all .18s ease',
                            boxShadow: ativo ? `0 2px 12px ${h.color}33` : 'none',
                            transform: ativo ? 'translateY(-1px)' : 'none',
                        }}
                        onMouseEnter={e => { if (!ativo) e.currentTarget.style.borderColor = h.color + '99'; }}
                        onMouseLeave={e => { if (!ativo) e.currentTarget.style.borderColor = 'var(--cor-borda)'; }}
                    >
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: 8,
                            background: ativo ? h.color + '33' : 'rgba(255,255,255,0.04)',
                            color: h.color, fontSize: 13,
                        }}>
                            <i className={`fa-solid ${h.icon}`}></i>
                        </span>
                        <span style={{ flex: 1, textAlign: 'left' }}>{h.label}</span>
                        {ativo && <i className="fa-solid fa-check" style={{ fontSize: 11, color: h.color }}></i>}
                    </button>
                );
            })}
        </div>
    );

    const toggleHab = (formObj, setFormObj, hab) => {
        const list = formObj.habilidades || [];
        const novo = list.includes(hab) ? list.filter(h => h !== hab) : [...list, hab];
        setFormObj({ ...formObj, habilidades: novo });
    };
    const [senhaForm, setSenhaForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' });
    const [showSenha, setShowSenha] = useState({ atual: false, nova: false, confirmar: false });

    // Admin trocando a senha de outro usuário da própria organização
    const [senhaUserModal, setSenhaUserModal] = useState(null); // usuario alvo
    const [senhaUserForm, setSenhaUserForm] = useState({ nova_senha: '', confirmar: '' });
    const [showSenhaUser, setShowSenhaUser] = useState({ nova: false, conf: false });

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

    const abrirTrocarSenhaUsuario = (u) => {
        setSenhaUserModal(u);
        setSenhaUserForm({ nova_senha: '', confirmar: '' });
        setShowSenhaUser({ nova: false, conf: false });
    };

    const handleTrocarSenhaUsuario = async (e) => {
        e.preventDefault();
        if (senhaUserForm.nova_senha.length < 6) {
            alert('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (senhaUserForm.nova_senha !== senhaUserForm.confirmar) {
            alert('As senhas não coincidem.');
            return;
        }
        try {
            await adminTrocarSenhaUsuario(senhaUserModal.id, senhaUserForm.nova_senha);
            alert('Senha alterada com sucesso!');
            setSenhaUserModal(null);
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao alterar senha.');
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

    // Gera uma URL web valida que qualquer leitor de QR consegue abrir.
    // Ao abrir, o Login.js detecta ?org=CODIGO e pre-preenche o cadastro.
    const qrUrl = org ? `${window.location.origin}/login?org=${org.codigo_acesso}` : '';

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
                            <button className="btn" onClick={() => { setLogoModal(true); setLogoFile(null); setLogoPreview(org?.logo_url ? `${API_URL}${org.logo_url}` : null); }} style={{ background: 'rgba(108,99,255,0.15)', color: '#6C63FF' }}>
                                <i className="fa-solid fa-image"></i> Logo
                            </button>
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
                                        <button className="btn-icon" onClick={() => abrirStats(u)} title="Ver tickets" style={{ color: '#4FC3F7' }}><i className="fa-solid fa-chart-bar"></i></button>
                                    )}
                                    {user?.role === 'ADMIN' && (
                                        <>
                                            <button className="btn-icon" onClick={() => { setEditModal(u); setEditForm({ nome: u.nome, role: u.role, habilidades: u.habilidades || [], max_tickets: u.max_tickets ?? 10 }); }} title="Editar" style={{ color: '#6C63FF' }}><i className="fa-solid fa-pen"></i></button>
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
                                    <label className="form-label">
                                        <i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: 6, color: '#6C63FF' }}></i>
                                        Habilidades Técnicas <span style={{ color: '#a0a0b0', fontSize: 11, fontWeight: 400 }}>(selecione pelo menos 1)</span>
                                    </label>
                                    {renderHabilidadesPicker(form, setForm)}
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
                                    <label className="form-label">
                                        <i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: 6, color: '#6C63FF' }}></i>
                                        Habilidades Técnicas <span style={{ color: '#a0a0b0', fontSize: 11, fontWeight: 400 }}>(selecione pelo menos 1)</span>
                                    </label>
                                    {renderHabilidadesPicker(editForm, setEditForm)}
                                </div>
                            )}
                            {user?.id !== editModal.id && (
                                <div style={{
                                    marginTop: 8, padding: '12px 14px', borderRadius: 10,
                                    background: 'rgba(255,217,61,0.06)', border: '1px solid rgba(255,217,61,0.18)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: 32, height: 32, borderRadius: 8,
                                            background: 'rgba(255,217,61,0.15)', color: '#FFD93D', fontSize: 14,
                                        }}>
                                            <i className="fa-solid fa-key"></i>
                                        </span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Senha de acesso</div>
                                            <div style={{ fontSize: 11, color: '#a0a0b0' }}>Defina uma nova senha para este usuário</div>
                                        </div>
                                    </div>
                                    <button type="button"
                                        onClick={() => { const u = editModal; setEditModal(null); abrirTrocarSenhaUsuario(u); }}
                                        style={{
                                            background: 'rgba(255,217,61,0.15)', color: '#FFD93D',
                                            border: '1px solid rgba(255,217,61,0.3)', borderRadius: 8,
                                            padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                        }}>
                                        <i className="fa-solid fa-key" style={{ marginRight: 6 }}></i>Trocar Senha
                                    </button>
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

            {/* Modal Logo */}
            {logoModal && (
                <div className="modal-overlay" onClick={() => setLogoModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
                        <h2 className="modal-title"><i className="fa-solid fa-image"></i> Logo da Empresa</h2>
                        <p style={{ color: '#a0a0b0', fontSize: 13, margin: '0 0 20px' }}>
                            Selecione uma imagem para a logo de <b style={{ color: '#fff' }}>{org?.nome}</b>
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            {logoPreview && (
                                <img src={logoPreview} alt="Preview logo" style={{
                                    width: 80, height: 80, borderRadius: 12, objectFit: 'cover',
                                    border: '3px solid var(--cor-borda)', background: 'var(--cor-superficie)'
                                }} />
                            )}
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                                borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                                background: 'rgba(108,99,255,0.1)', color: '#6C63FF',
                                border: '2px dashed rgba(108,99,255,0.4)', transition: 'all .2s'
                            }}>
                                <i className="fa-solid fa-cloud-arrow-up"></i>
                                {logoFile ? logoFile.name : 'Selecionar imagem'}
                                <input type="file" accept="image/*" onChange={(e) => {
                                    const f = e.target.files[0];
                                    if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
                                }} style={{ display: 'none' }} />
                            </label>
                        </div>
                        <div className="modal-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-danger" onClick={() => setLogoModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-primary" disabled={!logoFile || enviandoLogo} onClick={async () => {
                                setEnviandoLogo(true);
                                try {
                                    const up = await uploadImagem(logoFile);
                                    const orgAtualizada = await atualizarLogoOrg(up.url);
                                    localStorage.setItem('tiresolve_org', JSON.stringify(orgAtualizada));
                                    setLogoModal(false);
                                    window.location.reload();
                                } catch (err) {
                                    alert(err.response?.data?.detail || 'Erro ao atualizar logo.');
                                }
                                setEnviandoLogo(false);
                            }}>
                                {enviandoLogo ? 'Salvando...' : 'Salvar Logo'}
                            </button>
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

            {/* Modal: Admin troca a senha de outro usuario da org */}
            {senhaUserModal && (
                <div className="modal-overlay" onClick={() => setSenhaUserModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h2 className="modal-title">
                            <i className="fa-solid fa-key" style={{ color: '#FFD93D' }}></i>
                            Trocar senha de {senhaUserModal.nome}
                        </h2>
                        <p style={{ color: '#a0a0b0', fontSize: 12, margin: '0 0 14px' }}>
                            <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                            Defina uma nova senha para <b style={{ color: '#fff' }}>{senhaUserModal.email}</b>.
                        </p>
                        <form onSubmit={handleTrocarSenhaUsuario}>
                            <div className="form-group">
                                <label className="form-label">Nova Senha <span style={{ color: '#666', fontSize: 11 }}>(minimo 6 caracteres)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showSenhaUser.nova ? 'text' : 'password'}
                                        value={senhaUserForm.nova_senha} required minLength={6}
                                        onChange={e => setSenhaUserForm(p => ({ ...p, nova_senha: e.target.value }))}
                                        style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowSenhaUser(s => ({ ...s, nova: !s.nova }))}
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#a0a0b0' }}>
                                        <i className={`fa-solid ${showSenhaUser.nova ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirmar Nova Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showSenhaUser.conf ? 'text' : 'password'}
                                        value={senhaUserForm.confirmar} required minLength={6}
                                        onChange={e => setSenhaUserForm(p => ({ ...p, confirmar: e.target.value }))}
                                        style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowSenhaUser(s => ({ ...s, conf: !s.conf }))}
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#a0a0b0' }}>
                                        <i className={`fa-solid ${showSenhaUser.conf ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-danger" onClick={() => setSenhaUserModal(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Alterar Senha</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
