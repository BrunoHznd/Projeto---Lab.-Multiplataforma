import React, { useState, useEffect } from 'react';
import {
    listarInventario, criarItemInventario, atualizarItemInventario,
    deletarItemInventario, uploadImagem, getUser, API_URL,
    baixarAgentInventario,
    listarCategoriasInventario, criarCategoriaInventario, deletarCategoriaInventario
} from '../services/api';

const ESTADO_INFO = {
    ATIVO: { label: 'Ativo', cor: '#6BCB77', icon: 'fa-circle-check' },
    INATIVO: { label: 'Inativo', cor: '#FF6B6B', icon: 'fa-circle-xmark' },
    EM_MANUTENCAO: { label: 'Em Manutenção', cor: '#FFD93D', icon: 'fa-wrench' },
};

export default function InventarioPage() {
    const [itens, setItens] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [modal, setModal] = useState(null);
    const [modalCategoria, setModalCategoria] = useState(false);
    const [novaCategoria, setNovaCategoria] = useState('');
    const [form, setForm] = useState({
        nome: '', descricao: '', data_compra: '', garantia_ate: '', campos_extras: {},
        incluir_em_infraestrutura: false, tipo_dispositivo: 'HARDWARE',
        categoria_inventario_id: '', marca: '', estado: 'ATIVO'
    });
    const [novosCampos, setNovosCampos] = useState([]);
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [detalheModal, setDetalheModal] = useState(null);
    const [salvandoCat, setSalvandoCat] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroGarantia, setFiltroGarantia] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('');
    const user = getUser();
    const role = user?.role;

    useEffect(() => { carregar(); }, []);

    const carregar = async () => {
        try {
            const [inv, cats] = await Promise.all([listarInventario(), listarCategoriasInventario()]);
            setItens(inv);
            setCategorias(cats);
        } catch { }
    };

    const formBase = () => ({
        nome: '', descricao: '', data_compra: '', garantia_ate: '', campos_extras: {},
        incluir_em_infraestrutura: false, tipo_dispositivo: 'HARDWARE',
        categoria_inventario_id: '', marca: '', estado: 'ATIVO'
    });

    const abrirCriar = () => {
        setForm(formBase());
        setNovosCampos([]);
        setFotoFile(null);
        setFotoPreview(null);
        setModal('criar');
    };

    const abrirEditar = (item) => {
        setForm({
            nome: item.nome,
            descricao: item.descricao || '',
            data_compra: item.data_compra ? item.data_compra.split('T')[0] : '',
            garantia_ate: item.garantia_ate ? item.garantia_ate.split('T')[0] : '',
            campos_extras: item.campos_extras || {},
            incluir_em_infraestrutura: !!item.agent_token,
            tipo_dispositivo: item.tipo_dispositivo || 'HARDWARE',
            categoria_inventario_id: item.categoria_inventario_id || '',
            marca: item.marca || '',
            estado: item.estado || 'ATIVO',
        });
        setNovosCampos(Object.entries(item.campos_extras || {}).map(([chave, valor]) => ({ chave, valor })));
        setFotoFile(null);
        setFotoPreview(null);
        setModal(item);
    };

    const salvarCategoria = async () => {
        if (!novaCategoria.trim()) return;
        setSalvandoCat(true);
        try {
            await criarCategoriaInventario({ nome: novaCategoria.trim() });
            setNovaCategoria('');
            const cats = await listarCategoriasInventario();
            setCategorias(cats);
        } catch (e) {
            const detail = e?.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Erro ao salvar categoria');
        } finally { setSalvandoCat(false); }
    };

    const excluirCategoria = async (id) => {
        if (!window.confirm('Remover categoria?')) return;
        try {
            await deletarCategoriaInventario(id);
            setCategorias(cats => cats.filter(c => c.id !== id));
        } catch (e) {
            alert(e?.response?.data?.detail || 'Erro ao remover');
        }
    };

    const adicionarCampo = () => setNovosCampos([...novosCampos, { chave: '', valor: '' }]);
    const removerCampo = (i) => setNovosCampos(novosCampos.filter((_, idx) => idx !== i));
    const setCampo = (i, field, val) => {
        const n = [...novosCampos];
        n[i][field] = val;
        setNovosCampos(n);
    };

    const salvar = async () => {
        if (!form.nome.trim()) { alert('Nome obrigatório'); return; }
        setEnviando(true);
        try {
            let foto_url = modal !== 'criar' ? modal?.foto_url : null;
            if (fotoFile) {
                const res = await uploadImagem(fotoFile);
                foto_url = res.url;
            }
            const extras = {};
            novosCampos.forEach(({ chave, valor }) => { if (chave.trim()) extras[chave.trim()] = valor; });
            const payload = {
                nome: form.nome,
                descricao: form.descricao || null,
                foto_url,
                campos_extras: extras,
                data_compra: form.data_compra || null,
                garantia_ate: form.garantia_ate || null,
                categoria_inventario_id: form.categoria_inventario_id ? parseInt(form.categoria_inventario_id) : null,
                marca: form.marca || null,
                estado: form.estado,
                incluir_em_infraestrutura: form.incluir_em_infraestrutura,
                tipo_dispositivo: form.tipo_dispositivo || null,
            };
            if (modal === 'criar') await criarItemInventario(payload);
            else await atualizarItemInventario(modal.id, payload);
            setModal(null);
            setFotoPreview(null);
            carregar();
        } catch (e) {
            const detail = e?.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Erro ao salvar');
        } finally { setEnviando(false); }
    };

    const excluir = async (id) => {
        if (!window.confirm('Remover item?')) return;
        try { await deletarItemInventario(id); carregar(); } catch (e) { alert(e?.response?.data?.detail || 'Erro'); }
    };

    const baixarAgent = async (item) => {
        try { await baixarAgentInventario(item.id, item.nome); } catch (e) { alert('Erro ao baixar agent'); }
    };

    // Stats (sempre sobre todos os itens, sem filtro)
    const total = itens.length;
    const ativos = itens.filter(i => i.estado === 'ATIVO').length;
    const manutencao = itens.filter(i => i.estado === 'EM_MANUTENCAO').length;
    const inativos = itens.filter(i => i.estado === 'INATIVO').length;

    // Filtragem
    const hoje = new Date();
    const itensFiltrados = itens.filter(item => {
        if (filtroEstado && item.estado !== filtroEstado) return false;
        if (filtroCategoria && String(item.categoria_inventario_id) !== filtroCategoria) return false;
        if (filtroMarca && (item.marca || '').toLowerCase() !== filtroMarca.toLowerCase()) return false;
        if (filtroGarantia === 'em_garantia') {
            if (!item.garantia_ate || new Date(item.garantia_ate) <= hoje) return false;
        } else if (filtroGarantia === 'expirada') {
            if (!item.garantia_ate || new Date(item.garantia_ate) > hoje) return false;
        } else if (filtroGarantia === 'sem_garantia') {
            if (item.garantia_ate) return false;
        }
        return true;
    });

    const marcasUnicas = [...new Set(itens.map(i => i.marca).filter(Boolean))].sort();

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Inventário</h1>
                    <p className="page-subtitle">Gestão de equipamentos e ativos de TI</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {role === 'ADMIN' && (
                        <button className="btn btn-secondary" onClick={() => setModalCategoria(true)}>
                            <i className="fa-solid fa-tags" style={{ marginRight: 6 }}></i>Categorias
                        </button>
                    )}
                    {(role === 'ADMIN' || role === 'TECNICO') && (
                        <button className="btn btn-primary" onClick={abrirCriar}>
                            <i className="fa-solid fa-plus" style={{ marginRight: 6 }}></i>Novo Item
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total de Itens', value: total, cor: '#6C63FF', icon: 'fa-box' },
                    { label: 'Ativos', value: ativos, cor: '#6BCB77', icon: 'fa-circle-check' },
                    { label: 'Em Manutenção', value: manutencao, cor: '#FFD93D', icon: 'fa-wrench' },
                    { label: 'Inativos', value: inativos, cor: '#FF6B6B', icon: 'fa-circle-xmark' },
                ].map(s => (
                    <div className="stat-card" key={s.label} style={{ '--cor-indicador': s.cor }}>
                        <span className="stat-icon"><i className={`fa-solid ${s.icon}`} style={{ color: s.cor }}></i></span>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                <span style={{ color: '#a0a0b0', fontSize: 13, fontWeight: 600, marginRight: 4 }}>
                    <i className="fa-solid fa-filter" style={{ marginRight: 6 }}></i>Filtros
                </span>
                <select
                    className="form-input"
                    style={{ width: 'auto', minWidth: 150, fontSize: 13, padding: '6px 10px' }}
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                >
                    <option value="">Todos os estados</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="EM_MANUTENCAO">Em Manutenção</option>
                </select>
                <select
                    className="form-input"
                    style={{ width: 'auto', minWidth: 170, fontSize: 13, padding: '6px 10px' }}
                    value={filtroGarantia}
                    onChange={e => setFiltroGarantia(e.target.value)}
                >
                    <option value="">Todas as garantias</option>
                    <option value="em_garantia">Em garantia</option>
                    <option value="expirada">Garantia expirada</option>
                    <option value="sem_garantia">Sem garantia</option>
                </select>
                <select
                    className="form-input"
                    style={{ width: 'auto', minWidth: 150, fontSize: 13, padding: '6px 10px' }}
                    value={filtroCategoria}
                    onChange={e => setFiltroCategoria(e.target.value)}
                >
                    <option value="">Todas as categorias</option>
                    {categorias.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
                </select>
                <select
                    className="form-input"
                    style={{ width: 'auto', minWidth: 140, fontSize: 13, padding: '6px 10px' }}
                    value={filtroMarca}
                    onChange={e => setFiltroMarca(e.target.value)}
                >
                    <option value="">Todas as marcas</option>
                    {marcasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {(filtroEstado || filtroGarantia || filtroCategoria || filtroMarca) && (
                    <button
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => { setFiltroEstado(''); setFiltroGarantia(''); setFiltroCategoria(''); setFiltroMarca(''); }}
                    >
                        <i className="fa-solid fa-xmark" style={{ marginRight: 5 }}></i>Limpar filtros
                    </button>
                )}
                {(filtroEstado || filtroGarantia || filtroCategoria || filtroMarca) && (
                    <span style={{ color: '#a0a0b0', fontSize: 12 }}>
                        {itensFiltrados.length} de {total} item{total !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Tabela */}
            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title"><i className="fa-solid fa-box"></i> Itens do Inventário</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 56 }}>Foto</th>
                                <th>Nome</th>
                                <th>Descrição</th>
                                <th>Categoria</th>
                                <th>Marca</th>
                                <th>Garantia</th>
                                <th>Estado</th>
                                <th>Extras</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 && (
                                <tr><td colSpan="9" style={{ textAlign: 'center', color: '#666', padding: 40 }}>
                                    {itens.length === 0 ? 'Nenhum item cadastrado' : 'Nenhum item corresponde aos filtros aplicados'}
                                </td></tr>
                            )}
                            {itensFiltrados.map(item => {
                                const estado = ESTADO_INFO[item.estado] || ESTADO_INFO.ATIVO;
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            {item.foto_url
                                                ? <img src={`${API_URL}${item.foto_url}`} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                                                : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(108,99,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-box" style={{ color: '#6C63FF', fontSize: 16 }}></i></div>
                                            }
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#fff' }}>{item.nome}</td>
                                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#a0a0b0' }}>{item.descricao || '-'}</td>
                                        <td>
                                            {item.categoria_nome
                                                ? <span style={{ background: 'rgba(108,99,255,.15)', color: '#a89bff', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{item.categoria_nome}</span>
                                                : <span style={{ color: '#555' }}>-</span>}
                                        </td>
                                        <td style={{ color: '#e0e0e0' }}>{item.marca || '-'}</td>
                                        <td>
                                            {item.garantia_ate
                                                ? <span style={{ color: new Date(item.garantia_ate) > new Date() ? '#6BCB77' : '#FF6B6B', fontSize: 12 }}>
                                                    {new Date(item.garantia_ate) > new Date() ? '✓ ' : '✗ '}
                                                    {new Date(item.garantia_ate).toLocaleDateString('pt-BR')}
                                                </span>
                                                : <span style={{ color: '#555' }}>-</span>}
                                        </td>
                                        <td>
                                            <span
                                                style={{ background: `${estado.cor}20`, color: estado.cor, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, width: 'fit-content', cursor: item.estado === 'EM_MANUTENCAO' && item.motivo_manutencao ? 'help' : 'default' }}
                                                title={item.estado === 'EM_MANUTENCAO' && item.motivo_manutencao ? `Motivo: ${item.motivo_manutencao}` : ''}
                                            >
                                                <i className={`fa-solid ${estado.icon}`}></i>{estado.label}
                                            </span>
                                        </td>
                                        <td>
                                            {item.campos_extras && Object.keys(item.campos_extras).length > 0
                                                ? <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setDetalheModal(item)}>Ver {Object.keys(item.campos_extras).length}</button>
                                                : <span style={{ color: '#555' }}>-</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-primary" onClick={() => abrirEditar(item)} title="Editar"><i className="fa-solid fa-pen"></i></button>
                                                {item.agent_token && (
                                                    <button className="btn btn-sm" style={{ background: 'rgba(107,203,119,.15)', color: '#6BCB77' }} onClick={() => baixarAgent(item)} title="Baixar Agent"><i className="fa-solid fa-download"></i></button>
                                                )}
                                                {role === 'ADMIN' && (
                                                    <button className="btn btn-sm" style={{ background: 'rgba(255,107,107,.12)', color: '#FF6B6B' }} onClick={() => excluir(item.id)} title="Remover"><i className="fa-solid fa-trash"></i></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Criar/Editar */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{modal === 'criar' ? 'Novo Item' : 'Editar Item'}</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Nome *</label>
                                <input className="form-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do equipamento" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Categoria</label>
                                    <select className="form-input" value={form.categoria_inventario_id} onChange={e => setForm({ ...form, categoria_inventario_id: e.target.value })}>
                                        <option value="">Sem categoria</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Marca</label>
                                    <input className="form-input" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Ex: Dell, HP, Cisco..." />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Estado</label>
                                <select className="form-input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                                    <option value="ATIVO">Ativo</option>
                                    <option value="INATIVO">Inativo</option>
                                    <option value="EM_MANUTENCAO">Em Manutenção</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <textarea className="form-input" rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do item..." style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Data de Compra</label>
                                    <input type="date" className="form-input" value={form.data_compra} onChange={e => setForm({ ...form, data_compra: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Garantia até</label>
                                    <input type="date" className="form-input" value={form.garantia_ate} onChange={e => setForm({ ...form, garantia_ate: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Foto</label>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                    background: 'rgba(108,99,255,0.1)', border: '1px dashed rgba(108,99,255,0.4)',
                                    borderRadius: 8, padding: '10px 14px', color: '#a89bff', fontSize: 13,
                                    transition: 'all .2s'
                                }}>
                                    <i className="fa-solid fa-image" style={{ fontSize: 18 }}></i>
                                    <span>{fotoFile ? fotoFile.name : (modal !== 'criar' && modal?.foto_url ? 'Clique para trocar a foto' : 'Clique para escolher uma foto')}</span>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                                        const f = e.target.files[0];
                                        if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); }
                                    }} />
                                </label>
                                {(fotoPreview || (modal !== 'criar' && modal?.foto_url && !fotoFile)) && (
                                    <img
                                        src={fotoPreview || `${API_URL}${modal.foto_url}`}
                                        alt="Preview"
                                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: '2px solid rgba(108,99,255,0.3)' }}
                                    />
                                )}
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <input type="checkbox" id="inf" checked={form.incluir_em_infraestrutura} onChange={e => setForm({ ...form, incluir_em_infraestrutura: e.target.checked })} />
                                    <label htmlFor="inf" style={{ cursor: 'pointer', color: '#e0e0e0' }}>Incluir em Infraestrutura</label>
                                </div>
                                {form.incluir_em_infraestrutura && (
                                    <select className="form-input" style={{ marginTop: 8 }} value={form.tipo_dispositivo} onChange={e => setForm({ ...form, tipo_dispositivo: e.target.value })}>
                                        <option value="HARDWARE">Hardware</option>
                                        <option value="REDE">Rede</option>
                                    </select>
                                )}
                            </div>
                            {/* Campos extras */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label className="form-label" style={{ margin: 0 }}>Campos Extras</label>
                                    <button className="btn btn-sm" onClick={adicionarCampo} style={{ fontSize: 12 }}><i className="fa-solid fa-plus"></i> Adicionar</button>
                                </div>
                                {novosCampos.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                        <input className="form-input" style={{ flex: 1 }} placeholder="Campo" value={c.chave} onChange={e => setCampo(i, 'chave', e.target.value)} />
                                        <input className="form-input" style={{ flex: 2 }} placeholder="Valor" value={c.valor} onChange={e => setCampo(i, 'valor', e.target.value)} />
                                        <button className="btn btn-sm" style={{ color: '#FF6B6B' }} onClick={() => removerCampo(i)}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={salvar} disabled={enviando}>
                                {enviando ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Categorias */}
            {modalCategoria && (
                <div className="modal-overlay" onClick={() => setModalCategoria(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <h3 className="modal-title"><i className="fa-solid fa-tags" style={{ marginRight: 8 }}></i>Categorias de Inventário</h3>
                            <button className="modal-close" onClick={() => setModalCategoria(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                <input
                                    className="form-input"
                                    placeholder="Nova categoria..."
                                    value={novaCategoria}
                                    onChange={e => setNovaCategoria(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && salvarCategoria()}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-primary" onClick={salvarCategoria} disabled={salvandoCat}>
                                    {salvandoCat ? '...' : <i className="fa-solid fa-plus"></i>}
                                </button>
                            </div>
                            {categorias.length === 0
                                ? <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>Nenhuma categoria cadastrada</div>
                                : categorias.map(c => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(108,99,255,.08)', borderRadius: 8, marginBottom: 6 }}>
                                        <span style={{ color: '#e0e0e0' }}><i className="fa-solid fa-tag" style={{ color: '#6C63FF', marginRight: 8 }}></i>{c.nome}</span>
                                        {role === 'ADMIN' && (
                                            <button className="btn btn-sm" style={{ color: '#FF6B6B', background: 'transparent', padding: '2px 6px' }} onClick={() => excluirCategoria(c.id)}>
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModalCategoria(false)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalhes campos extras */}
            {detalheModal && (
                <div className="modal-overlay" onClick={() => setDetalheModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Campos Extras — {detalheModal.nome}</h3>
                            <button className="modal-close" onClick={() => setDetalheModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            {Object.entries(detalheModal.campos_extras || {}).map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                    <span style={{ color: '#a0a0b0', fontSize: 13 }}>{k}</span>
                                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDetalheModal(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
