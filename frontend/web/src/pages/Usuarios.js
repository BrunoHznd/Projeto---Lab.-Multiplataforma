/**
 * tiResolve Web - Pagina de Usuarios
 * CRUD + QR Code para cadastro, edicao, stats, troca de senha.
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    registrarUsuario, editarUsuario, alterarSenha,
    statsUsuario, getUser, getOrg, API_URL
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
    const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'USUARIO' });
    const [editForm, setEditForm] = useState({ nome: '', role: '' });
    const [senhaForm, setSenhaForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' });

    const user = getUser();
    const org = getOrg();

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
        try {
            await registrarUsuario(form);
            setModal(false);
            setForm({ nome: '', email: '', senha: '', role: 'USUARIO' });
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao criar usuario.');
        }
    };

    const handleEditar = async (e) => {
        e.preventDefault();
        try {
            await editarUsuario(editModal.id, editForm);
            setEditModal(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao editar.');
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
                        🔒 Alterar Senha
                    </button>
                    {user?.role === 'ADMIN' && (
                        <>
                            <button className="btn" onClick={() => setQrModal(true)} style={{ background: 'rgba(107,203,119,0.15)', color: '#6BCB77' }}>
                                📱 Gerar QR Code
                            </button>
                            <button className="btn btn-primary" onClick={() => setModal(true)}>
                                ➕ Novo Usuario
                            </button>
                        </>
                    )}
                </div>
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
                            <th>Data de Cadastro</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id}>
                                <td>#{u.id}</td>
                                <td>{u.nome}</td>
                                <td style={{ color: '#a0a0b0' }}>{u.email}</td>
                                <td>
                                    <span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span>
                                </td>
                                <td>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                                <td>
                                    {u.role === 'USUARIO' && (
                                        <button className="btn-icon" onClick={() => abrirStats(u)} title="Ver tickets">📊</button>
                                    )}
                                    {user?.role === 'ADMIN' && (
                                        <button className="btn-icon" onClick={() => { setEditModal(u); setEditForm({ nome: u.nome, role: u.role }); }} title="Editar">✏️</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {usuarios.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Nenhum usuario</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Criar */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">➕ Novo Usuario</h2>
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
                        <h2 className="modal-title">✏️ Editar Usuario</h2>
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
                        <h2 className="modal-title">📊 Estatisticas</h2>
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
                        <h2 className="modal-title">📱 QR Code de Cadastro</h2>
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

            {/* Modal Alterar Senha */}
            {senhaModal && (
                <div className="modal-overlay" onClick={() => setSenhaModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <h2 className="modal-title">🔒 Alterar Senha</h2>
                        <form onSubmit={handleAlterarSenha}>
                            <div className="form-group">
                                <label className="form-label">Senha Atual</label>
                                <input className="form-input" type="password" value={senhaForm.senha_atual} onChange={e => setSenhaForm({ ...senhaForm, senha_atual: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nova Senha</label>
                                <input className="form-input" type="password" value={senhaForm.nova_senha} onChange={e => setSenhaForm({ ...senhaForm, nova_senha: e.target.value })} required minLength={6} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirmar Nova Senha</label>
                                <input className="form-input" type="password" value={senhaForm.confirmar} onChange={e => setSenhaForm({ ...senhaForm, confirmar: e.target.value })} required />
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
