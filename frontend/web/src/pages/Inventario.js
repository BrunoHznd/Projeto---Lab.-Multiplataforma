/**
 * tiResolve Web - Pagina de Inventario
 * CRUD de itens com campos dinamicos, garantia e fotos.
 * Acesso: ADMIN e TECNICO.
 */

import React, { useState, useEffect } from 'react';
import {
    listarInventario, criarItemInventario, atualizarItemInventario,
    deletarItemInventario, uploadImagem, getUser, API_URL
} from '../services/api';

export default function InventarioPage() {
    const [itens, setItens] = useState([]);
    const [modal, setModal] = useState(null); // null | 'criar' | item (editar)
    const [form, setForm] = useState({ nome: '', descricao: '', garantia: false, garantia_ate: '', campos_extras: {} });
    const [novosCampos, setNovosCampos] = useState([]);
    const [fotoFile, setFotoFile] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [detalheModal, setDetalheModal] = useState(null);
    const user = getUser();
    const role = user?.role;

    useEffect(() => { carregar(); }, []);

    const carregar = async () => {
        try { setItens(await listarInventario()); } catch { }
    };

    const abrirCriar = () => {
        setForm({ nome: '', descricao: '', garantia: false, garantia_ate: '', campos_extras: {} });
        setNovosCampos([]);
        setFotoFile(null);
        setModal('criar');
    };

    const abrirEditar = (item) => {
        setForm({
            nome: item.nome,
            descricao: item.descricao || '',
            garantia: item.garantia,
            garantia_ate: item.garantia_ate ? item.garantia_ate.split('T')[0] : '',
            campos_extras: item.campos_extras || {}
        });
        setNovosCampos(Object.entries(item.campos_extras || {}).map(([chave, valor]) => ({ chave, valor })));
        setFotoFile(null);
        setModal(item);
    };

    const adicionarCampo = () => {
        setNovosCampos([...novosCampos, { chave: '', valor: '' }]);
    };

    const removerCampo = (i) => {
        setNovosCampos(novosCampos.filter((_, idx) => idx !== i));
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            let fotoUrl = modal !== 'criar' ? modal.foto_url : null;
            if (fotoFile) {
                const upload = await uploadImagem(fotoFile);
                fotoUrl = upload.url;
            }

            // Montar campos extras
            const extras = {};
            novosCampos.forEach(c => { if (c.chave.trim()) extras[c.chave.trim()] = c.valor; });

            const dados = {
                nome: form.nome,
                descricao: form.descricao || null,
                foto_url: fotoUrl,
                garantia: form.garantia,
                garantia_ate: form.garantia && form.garantia_ate ? new Date(form.garantia_ate).toISOString() : null,
                campos_extras: extras
            };

            if (modal === 'criar') {
                await criarItemInventario(dados);
            } else {
                await atualizarItemInventario(modal.id, dados);
            }
            setModal(null);
            carregar();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao salvar');
        }
        setEnviando(false);
    };

    const handleDeletar = async (id) => {
        if (!window.confirm('Remover este item do inventario?')) return;
        try { await deletarItemInventario(id); carregar(); }
        catch { alert('Erro ao remover'); }
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1 className="page-title">📦 Inventario</h1>
                <p className="page-subtitle">Gestao de equipamentos e ativos da organizacao</p>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Itens do Inventario ({itens.length})</h3>
                    <button className="btn btn-primary btn-sm" onClick={abrirCriar}>+ Novo Item</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Foto</th>
                            <th>Nome</th>
                            <th>Descricao</th>
                            <th>Garantia</th>
                            <th>Campos Extras</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens.map(item => (
                            <tr key={item.id}>
                                <td>
                                    {item.foto_url ? (
                                        <img src={`${API_URL}${item.foto_url}`} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: 24 }}>📦</span>
                                    )}
                                </td>
                                <td style={{ fontWeight: 600, cursor: 'pointer', color: '#6C63FF' }} onClick={() => setDetalheModal(item)}>{item.nome}</td>
                                <td style={{ color: '#a0a0b0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descricao || '-'}</td>
                                <td>
                                    {item.garantia ? (
                                        <span className="badge badge-finalizado">
                                            ✅ {item.garantia_ate ? `Ate ${new Date(item.garantia_ate).toLocaleDateString('pt-BR')}` : 'Sim'}
                                        </span>
                                    ) : (
                                        <span className="badge badge-aberto">❌ Nao</span>
                                    )}
                                </td>
                                <td>
                                    {item.campos_extras && Object.keys(item.campos_extras).length > 0 ? (
                                        Object.entries(item.campos_extras).map(([k, v]) => (
                                            <span key={k} style={{ display: 'inline-block', background: 'rgba(108,99,255,0.1)', borderRadius: 6, padding: '2px 8px', margin: '2px', fontSize: 11, color: '#a0a0b0' }}>
                                                <b style={{ color: '#fff' }}>{k}:</b> {v}
                                            </span>
                                        ))
                                    ) : '-'}
                                </td>
                                <td>
                                    <button className="btn-icon" onClick={() => abrirEditar(item)} title="Editar">✏️</button>
                                    {role === 'ADMIN' && (
                                        <button className="btn-icon" onClick={() => handleDeletar(item.id)} title="Remover">🗑️</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {itens.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Nenhum item no inventario</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Criar/Editar */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{modal === 'criar' ? '📦 Novo Item' : '✏️ Editar Item'}</h2>
                        <form onSubmit={handleSalvar}>
                            <div className="form-group">
                                <label className="form-label">Nome do Equipamento *</label>
                                <input className="form-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descricao</label>
                                <textarea className="form-textarea" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2}></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Foto</label>
                                <input type="file" accept="image/*" onChange={e => setFotoFile(e.target.files[0])} style={{ color: '#a0a0b0' }} />
                                {modal !== 'criar' && modal.foto_url && !fotoFile && (
                                    <img src={`${API_URL}${modal.foto_url}`} alt="" style={{ width: 60, height: 60, borderRadius: 8, marginTop: 8, objectFit: 'cover' }} />
                                )}
                            </div>

                            {/* Garantia */}
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#a0a0b0', fontSize: 13, fontWeight: 600 }}>
                                    <input type="checkbox" checked={form.garantia} onChange={e => setForm({ ...form, garantia: e.target.checked })} />
                                    Possui Garantia
                                </label>
                                {form.garantia && (
                                    <input type="date" className="form-input" style={{ width: 180 }} value={form.garantia_ate} onChange={e => setForm({ ...form, garantia_ate: e.target.value })} placeholder="Ate quando" />
                                )}
                            </div>

                            {/* Campos Extras Dinamicos */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Campos Extras
                                    <button type="button" className="btn btn-primary btn-sm" onClick={adicionarCampo} style={{ padding: '4px 10px', fontSize: 11 }}>+ Adicionar Campo</button>
                                </label>
                                {novosCampos.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <input className="form-input" placeholder="Chave (ex: Marca)" value={c.chave} onChange={e => {
                                            const copy = [...novosCampos]; copy[i].chave = e.target.value; setNovosCampos(copy);
                                        }} style={{ flex: 1 }} />
                                        <input className="form-input" placeholder="Valor (ex: Dell)" value={c.valor} onChange={e => {
                                            const copy = [...novosCampos]; copy[i].valor = e.target.value; setNovosCampos(copy);
                                        }} style={{ flex: 1 }} />
                                        <button type="button" className="btn-icon" onClick={() => removerCampo(i)} style={{ color: '#FF6B6B' }}>✕</button>
                                    </div>
                                ))}
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-danger" onClick={() => setModal(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={enviando}>
                                    {enviando ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalhes */}
            {detalheModal && (
                <div className="modal-overlay" onClick={() => setDetalheModal(null)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">📦 {detalheModal.nome}</h2>
                        {detalheModal.foto_url && (
                            <img src={`${API_URL}${detalheModal.foto_url}`} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
                        )}
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Descricao</span>
                                <p style={{ margin: '4px 0 0', color: '#e0e0e0' }}>{detalheModal.descricao || 'Sem descricao'}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Garantia</span>
                                <p style={{ margin: '4px 0 0', color: detalheModal.garantia ? '#6BCB77' : '#FF6B6B' }}>
                                    {detalheModal.garantia ? `Sim${detalheModal.garantia_ate ? ` — Ate ${new Date(detalheModal.garantia_ate).toLocaleDateString('pt-BR')}` : ''}` : 'Nao'}
                                </p>
                            </div>
                            {detalheModal.campos_extras && Object.keys(detalheModal.campos_extras).length > 0 && (
                                <div>
                                    <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Campos Extras</span>
                                    <div style={{ marginTop: 6 }}>
                                        {Object.entries(detalheModal.campos_extras).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <span style={{ color: '#a0a0b0', fontWeight: 600 }}>{k}</span>
                                                <span style={{ color: '#fff' }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ fontSize: 11, color: '#555' }}>
                                Adicionado em {new Date(detalheModal.created_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="modal-actions" style={{ marginTop: 16 }}>
                            <button className="btn" onClick={() => { setDetalheModal(null); abrirEditar(detalheModal); }} style={{ background: 'rgba(255,217,61,0.15)', color: '#FFD93D' }}>✏️ Editar</button>
                            <button className="btn btn-primary" onClick={() => setDetalheModal(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
