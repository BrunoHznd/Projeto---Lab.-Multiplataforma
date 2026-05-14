/**
 * tiResolve Web - Dashboard SysAdmin
 * Painel exclusivo para o administrador global do sistema.
 * Permite criar, visualizar, editar e remover organizações.
 */

import React, { useState, useEffect } from 'react';
import {
    sysadminListarOrgs, sysadminCriarOrg, sysadminEditarOrg,
    sysadminDeletarOrg, sysadminListarUsuariosOrg, sysadminTrocarSenhaUsuario,
    uploadImagem, API_URL
} from '../services/api';

export default function SysAdminPage() {
    const [orgs, setOrgs] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [modal, setModal] = useState(null);
    const [orgSelecionada, setOrgSelecionada] = useState(null);
    const [usuariosModal, setUsuariosModal] = useState(null);
    const [usuariosOrg, setUsuariosOrg] = useState([]);
    const [enviando, setEnviando] = useState(false);
    // Filtro por role (multi-seleção). Vazio = mostra todas as orgs.
    const [filtroRoles, setFiltroRoles] = useState([]);

    const toggleFiltroRole = (role) => {
        setFiltroRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const [formCriar, setFormCriar] = useState({
        nome_empresa: '', email_admin: '', senha_admin: '', nome_admin: '', logo_url: ''
    });
    const [formEditar, setFormEditar] = useState({ nome: '', logo_url: '' });
    const [logoFileCriar, setLogoFileCriar] = useState(null);
    const [logoPreviewCriar, setLogoPreviewCriar] = useState(null);
    const [logoFileEditar, setLogoFileEditar] = useState(null);
    const [logoPreviewEditar, setLogoPreviewEditar] = useState(null);

    // Modal de troca de senha de usuário (tipicamente o Admin da org)
    const [senhaModal, setSenhaModal] = useState(null); // {usuario, org}
    const [senhaForm, setSenhaForm] = useState({ nova_senha: '', confirmar: '' });
    const [showSenha, setShowSenha] = useState({ nova: false, conf: false });

    const abrirTrocarSenha = (usuario, org) => {
        setSenhaModal({ usuario, org });
        setSenhaForm({ nova_senha: '', confirmar: '' });
        setShowSenha({ nova: false, conf: false });
    };

    const handleTrocarSenha = async (e) => {
        e.preventDefault();
        if (senhaForm.nova_senha.length < 6) {
            alert('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (senhaForm.nova_senha !== senhaForm.confirmar) {
            alert('As senhas não coincidem.');
            return;
        }
        setEnviando(true);
        try {
            await sysadminTrocarSenhaUsuario(senhaModal.usuario.id, senhaForm.nova_senha);
            alert('Senha alterada com sucesso!');
            setSenhaModal(null);
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao alterar senha.');
        }
        setEnviando(false);
    };

    useEffect(() => { carregar(); }, []);

    const carregar = async () => {
        setCarregando(true);
        try {
            const dados = await sysadminListarOrgs();
            setOrgs(dados);
        } catch (err) {
            console.error(err);
        } finally {
            setCarregando(false);
        }
    };

    const handleLogoCriarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFileCriar(file);
            setLogoPreviewCriar(URL.createObjectURL(file));
        }
    };

    const handleLogoEditarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFileEditar(file);
            setLogoPreviewEditar(URL.createObjectURL(file));
        }
    };

    const handleCriar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            let logoUrl = formCriar.logo_url || undefined;
            if (logoFileCriar) {
                const up = await uploadImagem(logoFileCriar);
                logoUrl = up.url;
            }
            await sysadminCriarOrg({
                nome_empresa: formCriar.nome_empresa,
                email_admin: formCriar.email_admin,
                senha_admin: formCriar.senha_admin,
                nome_admin: formCriar.nome_admin || undefined,
                logo_url: logoUrl,
            });
            setModal(null);
            setFormCriar({ nome_empresa: '', email_admin: '', senha_admin: '', nome_admin: '', logo_url: '' });
            setLogoFileCriar(null);
            setLogoPreviewCriar(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao criar organização.');
        }
        setEnviando(false);
    };

    const abrirEditar = (org) => {
        setOrgSelecionada(org);
        setFormEditar({ nome: org.nome, logo_url: org.logo_url || '' });
        setLogoFileEditar(null);
        setLogoPreviewEditar(org.logo_url || null);
        setModal('editar');
    };

    const handleEditar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            let logoUrl = formEditar.logo_url || undefined;
            if (logoFileEditar) {
                const up = await uploadImagem(logoFileEditar);
                logoUrl = up.url;
            }
            await sysadminEditarOrg(orgSelecionada.id, {
                nome: formEditar.nome || undefined,
                logo_url: logoUrl,
            });
            setModal(null);
            setOrgSelecionada(null);
            setLogoFileEditar(null);
            setLogoPreviewEditar(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao editar organização.');
        }
        setEnviando(false);
    };

    const handleDeletar = async (org) => {
        if (!window.confirm(`Deseja realmente remover a organização "${org.nome}"?\nEsta ação é irreversível e removerá todos os dados.`)) return;
        try {
            await sysadminDeletarOrg(org.id);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao remover organização.');
        }
    };

    const abrirUsuarios = async (org) => {
        setUsuariosModal(org);
        setUsuariosOrg([]);
        try {
            const lista = await sysadminListarUsuariosOrg(org.id);
            setUsuariosOrg(lista);
        } catch (err) {
            setUsuariosOrg([]);
        }
    };

    const totalUsuarios = orgs.reduce((s, o) => s + o.total_usuarios, 0);
    const totalChamados = orgs.reduce((s, o) => s + o.total_chamados, 0);
    const totalAbertos = orgs.reduce((s, o) => s + o.chamados_abertos, 0);
    const totalAdmin = orgs.reduce((s, o) => s + (o.usuarios_admin || 0), 0);
    const totalTecnico = orgs.reduce((s, o) => s + (o.usuarios_tecnico || 0), 0);
    const totalComum = orgs.reduce((s, o) => s + (o.usuarios_comum || 0), 0);

    // Aplica o filtro de role à tabela: mostra apenas orgs que possuem pelo
    // menos 1 usuário em alguma das roles selecionadas. Sem filtro = todas.
    const orgsFiltradas = filtroRoles.length === 0 ? orgs : orgs.filter(o => (
        (filtroRoles.includes('ADMIN') && (o.usuarios_admin || 0) > 0) ||
        (filtroRoles.includes('TECNICO') && (o.usuarios_tecnico || 0) > 0) ||
        (filtroRoles.includes('USUARIO') && (o.usuarios_comum || 0) > 0)
    ));

    const getRoleBadge = (role) => {
        const map = {
            ADMIN: { bg: 'rgba(108,99,255,0.15)', color: '#6C63FF', label: 'Admin' },
            TECNICO: { bg: 'rgba(255,217,61,0.15)', color: '#FFD93D', label: 'Técnico' },
            USUARIO: { bg: 'rgba(107,203,119,0.15)', color: '#6BCB77', label: 'Usuário' },
            SYSADMIN: { bg: 'rgba(255,107,107,0.15)', color: '#FF6B6B', label: 'SysAdmin' },
        };
        const s = map[role] || { bg: '#333', color: '#fff', label: role };
        return (
            <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                {s.label}
            </span>
        );
    };

    if (carregando) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-shield-halved" style={{ color: '#FF6B6B' }}></i>
                        SysAdmin — Gestão Global
                    </h1>
                    <p className="page-subtitle">Gerencie todas as organizações da plataforma tiResolve</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModal('criar')}>
                    <i className="fa-solid fa-plus" style={{ marginRight: 6 }}></i>
                    Nova Organização
                </button>
            </div>

            {/* Cards globais */}
            <div className="stats-grid" style={{ marginBottom: 28 }}>
                <div className="stat-card" style={{ '--cor-indicador': '#6C63FF' }}>
                    <span className="stat-icon"><i className="fa-solid fa-building" style={{ color: '#6C63FF' }}></i></span>
                    <div className="stat-value">{orgs.length}</div>
                    <div className="stat-label">Organizações</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#4FC3F7' }}>
                    <span className="stat-icon"><i className="fa-solid fa-users" style={{ color: '#4FC3F7' }}></i></span>
                    <div className="stat-value">{totalUsuarios}</div>
                    <div className="stat-label">Usuários Totais</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#FFD93D' }}>
                    <span className="stat-icon"><i className="fa-solid fa-ticket" style={{ color: '#FFD93D' }}></i></span>
                    <div className="stat-value">{totalChamados}</div>
                    <div className="stat-label">Chamados Totais</div>
                </div>
                <div className="stat-card" style={{ '--cor-indicador': '#FF6B6B' }}>
                    <span className="stat-icon"><i className="fa-solid fa-circle-exclamation" style={{ color: '#FF6B6B' }}></i></span>
                    <div className="stat-value">{totalAbertos}</div>
                    <div className="stat-label">Chamados Abertos</div>
                </div>
            </div>

            {/* Filtro por role */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--cor-texto-sec)', marginRight: 4 }}>
                    <i className="fa-solid fa-filter"></i> Filtrar por role:
                </span>
                {[
                    { value: 'ADMIN', label: 'Usuário Admin', icon: 'fa-crown', color: '#6C63FF', count: totalAdmin },
                    { value: 'TECNICO', label: 'Usuário Técnico', icon: 'fa-wrench', color: '#FFD93D', count: totalTecnico },
                    { value: 'USUARIO', label: 'Usuário Comum', icon: 'fa-user', color: '#6BCB77', count: totalComum },
                ].map(r => {
                    const ativo = filtroRoles.includes(r.value);
                    return (
                        <button key={r.value} type="button" onClick={() => toggleFiltroRole(r.value)}
                            style={{
                                padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                border: `1.5px solid ${ativo ? r.color : 'var(--cor-borda)'}`,
                                background: ativo ? r.color + '22' : 'transparent',
                                color: ativo ? r.color : 'var(--cor-texto-sec)',
                                fontWeight: ativo ? 700 : 500, transition: 'all .15s',
                                display: 'inline-flex', alignItems: 'center', gap: 6
                            }}>
                            <i className={`fa-solid ${r.icon}`}></i>
                            {r.label}
                            <span style={{
                                background: ativo ? r.color + '33' : 'rgba(255,255,255,0.06)',
                                color: ativo ? r.color : 'var(--cor-texto-sec)',
                                padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700
                            }}>{r.count}</span>
                        </button>
                    );
                })}
                {filtroRoles.length > 0 && (
                    <button type="button" onClick={() => setFiltroRoles([])}
                        style={{ background: 'transparent', border: 'none', color: 'var(--cor-primaria)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Limpar filtro
                    </button>
                )}
            </div>

            {/* Tabela de organizações */}
            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">
                        <i className="fa-solid fa-building-columns"></i> Organizações ({orgs.length})
                    </h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Código de Acesso</th>
                            <th>Usuários</th>
                            <th title="Usuário Admin"><i className="fa-solid fa-crown" style={{ color: '#6C63FF', marginRight: 4 }}></i>Admin</th>
                            <th title="Usuário Técnico"><i className="fa-solid fa-wrench" style={{ color: '#FFD93D', marginRight: 4 }}></i>Técnico</th>
                            <th title="Usuário Comum"><i className="fa-solid fa-user" style={{ color: '#6BCB77', marginRight: 4 }}></i>Comum</th>
                            <th>Chamados</th>
                            <th>Abertos</th>
                            <th>Em Atend.</th>
                            <th>Finalizados</th>
                            <th>Criado em</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orgsFiltradas.map(org => (
                            <tr key={org.id}>
                                <td style={{ color: '#6C63FF', fontWeight: 600 }}>#{org.id}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {org.logo_url ? (
                                            <img src={`${API_URL}${org.logo_url}`} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                                        ) : (
                                            <i className="fa-solid fa-building" style={{ color: '#6C63FF', fontSize: 14 }}></i>
                                        )}
                                        <span style={{ fontWeight: 600 }}>{org.nome}</span>
                                    </div>
                                </td>
                                <td>
                                    <code style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>
                                        {org.codigo_acesso}
                                    </code>
                                </td>
                                <td>
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: 'rgba(79,195,247,0.1)', color: '#4FC3F7', border: '1px solid rgba(79,195,247,0.2)' }}
                                        onClick={() => abrirUsuarios(org)}
                                        title="Ver usuários"
                                    >
                                        <i className="fa-solid fa-users" style={{ marginRight: 4 }}></i>
                                        {org.total_usuarios}
                                    </button>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ color: '#6C63FF', fontWeight: (org.usuarios_admin || 0) > 0 ? 700 : 400 }}>
                                        {org.usuarios_admin || 0}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ color: '#FFD93D', fontWeight: (org.usuarios_tecnico || 0) > 0 ? 700 : 400 }}>
                                        {org.usuarios_tecnico || 0}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ color: '#6BCB77', fontWeight: (org.usuarios_comum || 0) > 0 ? 700 : 400 }}>
                                        {org.usuarios_comum || 0}
                                    </span>
                                </td>
                                <td>{org.total_chamados}</td>
                                <td>
                                    <span style={{ color: '#FF6B6B', fontWeight: org.chamados_abertos > 0 ? 700 : 400 }}>
                                        {org.chamados_abertos}
                                    </span>
                                </td>
                                <td><span style={{ color: '#FFD93D' }}>{org.chamados_em_atendimento}</span></td>
                                <td><span style={{ color: '#6BCB77' }}>{org.chamados_finalizados}</span></td>
                                <td style={{ color: 'var(--cor-texto-sec)', fontSize: 12 }}>
                                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF', border: '1px solid rgba(108,99,255,0.2)' }}
                                            onClick={() => abrirEditar(org)}
                                            title="Editar"
                                        >
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.2)' }}
                                            onClick={() => handleDeletar(org)}
                                            title="Remover"
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {orgsFiltradas.length === 0 && (
                            <tr>
                                <td colSpan="13" style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                                    {orgs.length === 0 ? 'Nenhuma organização cadastrada' : 'Nenhuma organização corresponde ao filtro selecionado'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Criar organização */}
            {modal === 'criar' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3><i className="fa-solid fa-plus" style={{ marginRight: 8, color: '#6C63FF' }}></i>Nova Organização</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleCriar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Nome da Empresa *</label>
                                <input className="form-input" value={formCriar.nome_empresa} required
                                    onChange={e => setFormCriar(p => ({ ...p, nome_empresa: e.target.value }))}
                                    placeholder="Ex: ACME Corp" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nome do Admin</label>
                                <input className="form-input" value={formCriar.nome_admin}
                                    onChange={e => setFormCriar(p => ({ ...p, nome_admin: e.target.value }))}
                                    placeholder="Deixe vazio para usar padrão" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email do Admin *</label>
                                <input className="form-input" type="email" value={formCriar.email_admin} required
                                    onChange={e => setFormCriar(p => ({ ...p, email_admin: e.target.value }))}
                                    placeholder="admin@empresa.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Senha do Admin *</label>
                                <input className="form-input" type="password" value={formCriar.senha_admin} required
                                    onChange={e => setFormCriar(p => ({ ...p, senha_admin: e.target.value }))}
                                    placeholder="Mínimo 6 caracteres" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Logo da Empresa</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    {logoPreviewCriar && (
                                        <img src={logoPreviewCriar} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--cor-borda)' }} />
                                    )}
                                    <label style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                                        borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        background: 'rgba(108,99,255,0.1)', color: '#6C63FF',
                                        border: '1.5px dashed rgba(108,99,255,0.4)', transition: 'all .2s'
                                    }}>
                                        <i className="fa-solid fa-cloud-arrow-up"></i>
                                        {logoFileCriar ? logoFileCriar.name : 'Selecionar arquivo'}
                                        <input type="file" accept="image/*" onChange={handleLogoCriarChange}
                                            style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" className="btn" style={{ background: 'var(--cor-card)', color: 'var(--cor-texto-sec)', border: '1px solid var(--cor-borda)' }} onClick={() => setModal(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={enviando}>
                                    {enviando ? 'Criando...' : 'Criar Organização'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Editar organização */}
            {modal === 'editar' && orgSelecionada && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3><i className="fa-solid fa-pen" style={{ marginRight: 8, color: '#6C63FF' }}></i>Editar Organização</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleEditar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Nome da Empresa</label>
                                <input className="form-input" value={formEditar.nome}
                                    onChange={e => setFormEditar(p => ({ ...p, nome: e.target.value }))}
                                    placeholder={orgSelecionada.nome} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Logo da Empresa</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    {logoPreviewEditar && (
                                        <img src={logoPreviewEditar.startsWith('/upload') ? (API_URL + logoPreviewEditar) : logoPreviewEditar} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--cor-borda)' }} />
                                    )}
                                    <label style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                                        borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        background: 'rgba(108,99,255,0.1)', color: '#6C63FF',
                                        border: '1.5px dashed rgba(108,99,255,0.4)', transition: 'all .2s'
                                    }}>
                                        <i className="fa-solid fa-cloud-arrow-up"></i>
                                        {logoFileEditar ? logoFileEditar.name : 'Selecionar arquivo'}
                                        <input type="file" accept="image/*" onChange={handleLogoEditarChange}
                                            style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" className="btn" style={{ background: 'var(--cor-card)', color: 'var(--cor-texto-sec)', border: '1px solid var(--cor-borda)' }} onClick={() => setModal(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={enviando}>
                                    {enviando ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Usuários da organização */}
            {usuariosModal && (
                <div className="modal-overlay" onClick={() => setUsuariosModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>
                                <i className="fa-solid fa-users" style={{ marginRight: 8, color: '#4FC3F7' }}></i>
                                {usuariosModal.nome} — Usuários
                            </h3>
                            <button className="modal-close" onClick={() => setUsuariosModal(null)}>✕</button>
                        </div>
                        {usuariosOrg.length === 0 ? (
                            <p style={{ color: 'var(--cor-texto-sec)', textAlign: 'center', padding: '24px 0' }}>Nenhum usuário cadastrado</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--cor-texto-sec)', fontSize: 12, borderBottom: '1px solid var(--cor-borda)' }}>Nome</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--cor-texto-sec)', fontSize: 12, borderBottom: '1px solid var(--cor-borda)' }}>Email</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--cor-texto-sec)', fontSize: 12, borderBottom: '1px solid var(--cor-borda)' }}>Role</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--cor-texto-sec)', fontSize: 12, borderBottom: '1px solid var(--cor-borda)' }}>Criado em</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--cor-texto-sec)', fontSize: 12, borderBottom: '1px solid var(--cor-borda)' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosOrg.map(u => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--cor-borda)' }}>
                                            <td style={{ padding: '10px 12px', fontSize: 13 }}>{u.nome}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--cor-texto-sec)' }}>{u.email}</td>
                                            <td style={{ padding: '10px 12px' }}>{getRoleBadge(u.role)}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--cor-texto-sec)' }}>
                                                {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <button
                                                    type="button"
                                                    title="Trocar senha"
                                                    onClick={() => abrirTrocarSenha(u, usuariosModal)}
                                                    style={{
                                                        background: 'rgba(255,217,61,0.12)', color: '#FFD93D',
                                                        border: '1px solid rgba(255,217,61,0.25)', borderRadius: 6,
                                                        padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    }}
                                                >
                                                    <i className="fa-solid fa-key"></i> Trocar senha
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Trocar senha do usuário (Admin da org) */}
            {senhaModal && (
                <div className="modal-overlay" onClick={() => setSenhaModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3>
                                <i className="fa-solid fa-key" style={{ marginRight: 8, color: '#FFD93D' }}></i>
                                Trocar senha de {senhaModal.usuario.nome}
                            </h3>
                            <button className="modal-close" onClick={() => setSenhaModal(null)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--cor-texto-sec)', fontSize: 12, margin: '0 0 14px' }}>
                            <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                            Defina uma nova senha para <b>{senhaModal.usuario.email}</b> ({senhaModal.org?.nome}).
                        </p>
                        <form onSubmit={handleTrocarSenha} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Nova Senha <span style={{ color: '#666', fontSize: 11 }}>(mínimo 6 caracteres)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showSenha.nova ? 'text' : 'password'}
                                        value={senhaForm.nova_senha} required minLength={6}
                                        onChange={e => setSenhaForm(p => ({ ...p, nova_senha: e.target.value }))}
                                        style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowSenha(s => ({ ...s, nova: !s.nova }))}
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#a0a0b0' }}>
                                        <i className={`fa-solid ${showSenha.nova ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirmar Nova Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showSenha.conf ? 'text' : 'password'}
                                        value={senhaForm.confirmar} required minLength={6}
                                        onChange={e => setSenhaForm(p => ({ ...p, confirmar: e.target.value }))}
                                        style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowSenha(s => ({ ...s, conf: !s.conf }))}
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#a0a0b0' }}>
                                        <i className={`fa-solid ${showSenha.conf ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" className="btn" style={{ background: 'var(--cor-card)', color: 'var(--cor-texto-sec)', border: '1px solid var(--cor-borda)' }} onClick={() => setSenhaModal(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={enviando}>
                                    {enviando ? 'Salvando...' : 'Alterar Senha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
