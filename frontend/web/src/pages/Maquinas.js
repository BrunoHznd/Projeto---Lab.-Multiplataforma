/**
 * tiResolve Web - Pagina de Maquinas/Equipamentos
 * Gestao de equipamentos e rede: criar, editar, monitorar hardware e rede separados por abas.
 */

import React, { useState, useEffect } from 'react';
import {
    listarMaquinas, deletarMaquina, atualizarMaquina, criarMaquina,
    historicoChamadosMaquina, getUser, downloadAgentHardware, downloadAgentRede,
    listarGrupos, criarGrupo, deletarGrupo
} from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

const Speedometer = ({ value, label, color }) => {
    const max = 1000;
    const clampedValue = Math.min(Math.max(value, 0), max);
    const percentage = clampedValue / max;
    const radius = 40;
    const circumference = Math.PI * radius;
    const dashoffset = circumference - (percentage * circumference);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#161b2a', padding: '20px 10px', borderRadius: '12px', flex: 1, minWidth: '150px' }}>
            <div style={{ alignSelf: 'flex-start', color: '#fff', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <span>{label.toUpperCase()}</span>
                <span style={{ color: '#a0a0b0', fontWeight: 'normal', fontSize: '12px' }}>Mbps</span>
            </div>
            <svg viewBox="0 0 100 55" style={{ width: '120px', zIndex: 1 }}>
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#252a3b" strokeWidth="10" strokeLinecap="round" />
                <line x1="15" y1="50" x2="20" y2="50" stroke="#a0a0b0" strokeWidth="2" />
                <text x="32" y="32" fill="#a0a0b0" fontSize="8" textAnchor="middle">1000</text>
                <text x="75" y="32" fill="#a0a0b0" fontSize="8" textAnchor="middle">750</text>
                <text x="95" y="52" fill="#a0a0b0" fontSize="8" textAnchor="middle">500</text>
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" 
                    strokeDasharray={circumference} strokeDashoffset={dashoffset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div style={{ marginTop: '-15px', color: '#fff', fontSize: '26px', fontWeight: '900', textShadow: '0px 2px 4px rgba(0,0,0,0.5)', zIndex: 2 }}>
                {value.toFixed(2)}
            </div>
            <div style={{ color: color, fontSize: '12px', fontWeight: 'bold', opacity: 0.8 }}>Mbps</div>
        </div>
    );
};

export default function MaquinasPage() {
    const [maquinas, setMaquinas] = useState([]);
    const [redes, setRedes] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [editModal, setEditModal] = useState(null);
    const [criarModal, setCriarModal] = useState(false);
    const [historicoModal, setHistoricoModal] = useState(null);
    const [historicoChamados, setHistoricoChamados] = useState([]);
    const [editForm, setEditForm] = useState({ nome: '', ip: '', grupo_id: '' });
    const [criarForm, setCriarForm] = useState({ nome: '', ip: '', grupo_id: '' });
    const [modalGrupo, setModalGrupo] = useState(false);
    const [nomeGrupo, setNomeGrupo] = useState('');
    const [enviando, setEnviando] = useState(false);
    
    // Abas disponíveis: HARDWARE, REDE, GRUPOS
    const [abaAtual, setAbaAtual] = useState('HARDWARE');

    const user = getUser();
    const isAdminOrTec = user?.role === 'ADMIN' || user?.role === 'TECNICO';

    useEffect(() => {
        carregarTudo();
    }, [abaAtual]);

    const carregarTudo = async () => {
        setCarregando(true);
        try {
            const gps = await listarGrupos();
            setGrupos(gps);

            if (abaAtual === 'HARDWARE') {
                const dadosHw = await listarMaquinas('HARDWARE');
                setMaquinas(dadosHw);
            } else if (abaAtual === 'REDE') {
                const dadosRede = await listarMaquinas('REDE');
                setRedes(dadosRede);
            }
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setCarregando(false);
        }
    };

    const handleEditar = async () => {
        setEnviando(true);
        try {
            await atualizarMaquina(editModal.id, {
                ...editForm,
                grupo_id: editForm.grupo_id ? parseInt(editForm.grupo_id) : null
            });
            setEditModal(null);
            carregarTudo();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao atualizar.');
        }
        setEnviando(false);
    };

    const handleCriar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            await criarMaquina({
                ...criarForm,
                tipo: 'HARDWARE', // Criação manual é tratada como hardware aqui ou depende da implementação.
                grupo_id: criarForm.grupo_id ? parseInt(criarForm.grupo_id) : null
            });
            setCriarModal(false);
            setCriarForm({ nome: '', ip: '', grupo_id: '' });
            carregarTudo();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao criar equipamento.');
        }
        setEnviando(false);
    };

    const handleCriarGrupo = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            await criarGrupo({ nome: nomeGrupo });
            setModalGrupo(false);
            setNomeGrupo('');
            carregarTudo();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao criar grupo.');
        }
        setEnviando(false);
    }

    const deletarItemGrupo = async (id) => {
        if (!window.confirm('Excluir este grupo? Máquinas vinculadas perderão essa categorização.')) return;
        try {
            await deletarGrupo(id);
            carregarTudo();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao excluir.');
        }
    }

    const abrirEditar = (m) => {
        setEditForm({ nome: m.nome, ip: m.ip || '', grupo_id: m.grupo_id || '' });
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
        if (!window.confirm('Remover este item?')) return;
        try {
            await deletarMaquina(id);
            carregarTudo();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao remover.');
        }
    };
    
    const downloadAgent = async (tipo) => {
        try {
            const res = tipo === 'HARDWARE' ? await downloadAgentHardware() : await downloadAgentRede();
            const blob = new Blob([res.data], { type: 'text/x-python' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const disposition = res.headers['content-disposition'] || '';
            const match = disposition.match(/filename=(.+)/);
            a.href = url;
            a.download = match ? match[1] : `tiresolve_agent_${tipo.toLowerCase()}.py`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(`Erro ao baixar agent de ${tipo}`);
        }
    };

    const online = maquinas.filter(m => m.ultimo_status === 'ONLINE').length;
    const offline = maquinas.filter(m => m.ultimo_status === 'OFFLINE').length;

    // Agrupa CPU/Memória por Grupo para o gráfico
    const dadosGrafico = (() => {
        const agrupado = {};
        maquinas.forEach(m => {
            const nomeGrupo = m.grupo ? m.grupo.nome : 'Sem Grupo';
            if (!agrupado[nomeGrupo]) {
                agrupado[nomeGrupo] = { cpuTotal: 0, memTotal: 0, count: 0 };
            }
            agrupado[nomeGrupo].cpuTotal += m.cpu_uso;
            agrupado[nomeGrupo].memTotal += m.memoria_uso;
            agrupado[nomeGrupo].count += 1;
        });
        return Object.entries(agrupado).map(([nome, v]) => ({
            nome: nome.length > 14 ? nome.slice(0, 14) + '…' : nome,
            CPU: parseFloat((v.cpuTotal / v.count).toFixed(1)),
            Memoria: parseFloat((v.memTotal / v.count).toFixed(1)),
        }));
    })();

    const getStatusBadge = (status) => {
        const map = {
            'ABERTO': { bg: 'rgba(255,107,107,0.15)', color: '#FF6B6B', label: 'Aberto' },
            'EM_ATENDIMENTO': { bg: 'rgba(255,217,61,0.15)', color: '#FFD93D', label: 'Em Atendimento' },
            'FINALIZADO': { bg: 'rgba(107,203,119,0.15)', color: '#6BCB77', label: 'Finalizado' },
        };
        const s = map[status] || { bg: '#333', color: '#fff', label: status };
        return <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{s.label}</span>;
    };

    if (carregando && grupos.length === 0 && maquinas.length === 0 && redes.length === 0) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Infraestrutura</h1>
                    <p className="page-subtitle">Monitore os nós da rede, computadores e organize em grupos.</p>
                </div>
                {isAdminOrTec && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="btn" onClick={() => downloadAgent('HARDWARE')} style={{ background: 'rgba(108,99,255,0.15)', color: '#6C63FF' }}>
                            <i className="fa-solid fa-download"></i> Agent Hardware
                        </button>
                        <button className="btn" onClick={() => downloadAgent('REDE')} style={{ background: 'rgba(79,195,247,0.15)', color: '#4FC3F7' }}>
                            <i className="fa-solid fa-download"></i> Agent Rede
                        </button>
                    </div>
                )}
            </div>

            {/* Guias (Tabs) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--cor-borda)', paddingBottom: '10px' }}>
                <button className={`btn ${abaAtual === 'HARDWARE' ? 'btn-primary' : ''}`} 
                        style={abaAtual !== 'HARDWARE' ? { background: 'transparent', color: '#a0a0b0' } : {}}
                        onClick={() => setAbaAtual('HARDWARE')}>
                    <i className="fa-solid fa-laptop"></i> Computadores (Hardware)
                </button>
                <button className={`btn ${abaAtual === 'REDE' ? 'btn-primary' : ''}`}
                        style={abaAtual !== 'REDE' ? { background: 'transparent', color: '#a0a0b0' } : {}}
                        onClick={() => setAbaAtual('REDE')}>
                    <i className="fa-solid fa-globe"></i> Conexões de Rede
                </button>
                <button className={`btn ${abaAtual === 'GRUPOS' ? 'btn-primary' : ''}`}
                        style={abaAtual !== 'GRUPOS' ? { background: 'transparent', color: '#a0a0b0' } : {}}
                        onClick={() => setAbaAtual('GRUPOS')}>
                    <i className="fa-solid fa-folder-open"></i> Grupos de Infraestrutura
                </button>
            </div>

            {abaAtual === 'HARDWARE' && (
                <>
                    {/* Indicadores */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="stat-card" style={{ '--cor-indicador': '#6C63FF' }}>
                            <span className="stat-icon"><i className="fa-solid fa-desktop"></i></span>
                            <div className="stat-value">{maquinas.length}</div>
                            <div className="stat-label">Total Cadastrado</div>
                        </div>
                        <div className="stat-card" style={{ '--cor-indicador': '#6BCB77' }}>
                            <span className="stat-icon"><i className="fa-solid fa-circle" style={{ color: '#6BCB77' }}></i></span>
                            <div className="stat-value">{online}</div>
                            <div className="stat-label">No momento Online</div>
                        </div>
                        <div className="stat-card" style={{ '--cor-indicador': '#FF6B6B' }}>
                            <span className="stat-icon"><i className="fa-solid fa-circle" style={{ color: '#FF6B6B' }}></i></span>
                            <div className="stat-value">{offline}</div>
                            <div className="stat-label">No momento Offline</div>
                        </div>
                    </div>

                    {/* Grafico por Grupo */}
                    {dadosGrafico.length > 0 && (
                        <div className="chart-card" style={{ marginBottom: '24px' }}>
                            <h3 className="chart-title"><i className="fa-solid fa-chart-bar"></i> Média CPU e Memória por Grupo</h3>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h2>Lista de Computadores</h2>
                        {isAdminOrTec && <button className="btn btn-primary" onClick={() => setCriarModal(true)}>+ Adicionar Manualmente</button>}
                    </div>

                    {/* Tabela de Hardware */}
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome do Dispositivo</th>
                                    <th>Grupo</th>
                                    <th>IP / Rede</th>
                                    <th>Status</th>
                                    <th>CPU Uso</th>
                                    <th>RAM Uso</th>
                                    <th>Último Report</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {maquinas.map(m => (
                                    <tr key={m.id}>
                                        <td style={{ fontWeight: 600 }}>{m.nome}</td>
                                        <td>
                                            {m.grupo ? 
                                                <span style={{background: 'rgba(255,255,255,0.1)', padding:'2px 8px', borderRadius: '4px', fontSize: '12px'}}>{m.grupo.nome}</span> 
                                            : <span style={{color: '#666', fontSize: '12px'}}>Sem Grupo</span>}
                                        </td>
                                        <td><code style={{ color: '#4FC3F7', background: 'rgba(79,195,247,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{m.ip || '-'}</code></td>
                                        <td>
                                            <span className={`badge badge-${m.ultimo_status.toLowerCase()}`}>
                                                {m.ultimo_status === 'ONLINE' ? <i className="fa-solid fa-circle" style={{ color: '#6BCB77' }}></i> : <i className="fa-solid fa-circle" style={{ color: '#FF6B6B' }}></i>} {m.ultimo_status}
                                            </span>
                                        </td>
                                        <td style={{minWidth: '100px'}}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '40px', height: '6px', borderRadius: '3px', background: 'var(--cor-borda)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${m.cpu_uso}%`, height: '100%', background: m.cpu_uso > 80 ? '#FF6B6B' : m.cpu_uso > 50 ? '#FFD93D' : '#6BCB77', borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#a0a0b0' }}>{Math.round(m.cpu_uso)}%</span>
                                            </div>
                                        </td>
                                        <td style={{minWidth: '100px'}}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '40px', height: '6px', borderRadius: '3px', background: 'var(--cor-borda)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${m.memoria_uso}%`, height: '100%', background: m.memoria_uso > 80 ? '#FF6B6B' : m.memoria_uso > 50 ? '#FFD93D' : '#6BCB77', borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#a0a0b0' }}>{Math.round(m.memoria_uso)}%</span>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '12px', color: '#a0a0b0' }}>
                                            {m.ultima_verificacao ? new Date(m.ultima_verificacao).toLocaleString('pt-BR') : 'Nunca'}
                                        </td>
                                        <td style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn-icon" onClick={() => abrirHistorico(m)} title="Historico de Chamados"
                                                style={{ background: 'rgba(79,195,247,0.15)', borderRadius: '6px', padding: '4px 8px' }}><i className="fa-solid fa-clipboard-list"></i></button>
                                            {isAdminOrTec && (
                                                <button className="btn-icon" onClick={() => abrirEditar(m)} title="Editar"
                                                    style={{ background: 'rgba(108,99,255,0.15)', borderRadius: '6px', padding: '4px 8px' }}><i className="fa-solid fa-pen"></i></button>
                                            )}
                                            {user?.role === 'ADMIN' && (
                                                <button className="btn-icon" onClick={() => handleDeletar(m.id)} title="Remover"><i className="fa-solid fa-trash"></i></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {maquinas.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                            <div className="empty-state">
                                                <div className="empty-icon"><i className="fa-solid fa-desktop"></i></div>
                                                <p className="empty-text">Nenhum equipamento cadastrado.<br /><small>Execute o agent no computador alvo para registrá-lo automaticamente.</small></p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {abaAtual === 'REDE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {redes.length > 0 ? redes.map(m => (
                        <div key={`rede_${m.id}`} className="stat-card" style={{ display: 'block', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--cor-borda)', paddingBottom: '12px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {m.nome}
                                        {isAdminOrTec && <button className="btn-icon" onClick={() => abrirEditar(m)} title="Editar Nome ou Grupo" style={{ fontSize: '14px', marginTop: '-2px' }}><i className="fa-solid fa-pen"></i></button>}
                                    </h3>
                                    <div style={{ color: '#a0a0b0', fontSize: '14px', marginTop: '6px' }}>
                                        {m.grupo && <span style={{background: 'rgba(108,99,255,0.15)', color:'#B388FF', padding:'2px 8px', borderRadius: '4px', fontSize: '12px', marginRight: '10px'}}>{m.grupo.nome}</span>}
                                        <span style={{background: 'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius: '4px', fontSize: '12px', marginRight: '10px'}}><i className="fa-solid fa-globe"></i> IP Público: {m.ip || '-'}</span>
                                        <span style={{fontSize: '12px'}}><i className="fa-solid fa-clock"></i> Visto última vez: {m.ultima_verificacao ? new Date(m.ultima_verificacao).toLocaleString('pt-BR') : 'Nunca'}</span>
                                    </div>
                                </div>
                                <div style={{display:'flex', alignItems: 'center', gap: '8px'}}>
                                    <span className={`badge badge-${m.ultimo_status.toLowerCase()}`}>
                                        {m.ultimo_status === 'ONLINE' ? <><i className="fa-solid fa-circle" style={{ color: '#6BCB77' }}></i> ONLINE</> : <><i className="fa-solid fa-circle" style={{ color: '#FF6B6B' }}></i> OFFLINE</>}
                                    </span>
                                    {user?.role === 'ADMIN' && <button className="btn-icon" onClick={() => handleDeletar(m.id)}><i className="fa-solid fa-trash"></i></button>}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                <Speedometer value={m.download_speed || 0} label="Download" color="#4FC3F7" />
                                <Speedometer value={m.upload_speed || 0} label="Upload" color="#B388FF" />
                            </div>
                        </div>
                    )) : (
                        <div className="empty-state" style={{ background: 'var(--cor-superficie)', padding: '50px', borderRadius: '12px' }}>
                            <div className="empty-icon"><i className="fa-solid fa-globe"></i></div>
                            <p className="empty-text">Nenhuma rede monitorada.<br /><small>Execute o Agent de Rede em algum ponto da rede para começar o monitoramento de velocidade de link.</small></p>
                        </div>
                    )}
                </div>
            )}

            {abaAtual === 'GRUPOS' && (
                <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <h2>Grupos de Infraestrutura</h2>
                            <p style={{color: '#a0a0b0', fontSize: '14px'}}>Organize suas filiais, salas de laboratório ou departamentos.</p>
                        </div>
                        {isAdminOrTec && <button className="btn btn-primary" onClick={() => {setNomeGrupo(''); setModalGrupo(true);}}>+ Criar Grupo</button>}
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nome do Grupo</th>
                                    <th>Criado a</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grupos.map(g => (
                                    <tr key={g.id}>
                                        <td>#{g.id}</td>
                                        <td style={{fontWeight: '600'}}>{g.nome}</td>
                                        <td style={{color: '#a0a0b0'}}>{new Date(g.created_at).toLocaleDateString()}</td>
                                        <td style={{display:'flex', gap:'8px'}}>
                                            {user?.role === 'ADMIN' && <button className="btn-icon" onClick={() => deletarItemGrupo(g.id)}><i className="fa-solid fa-trash"></i> Deletar</button>}
                                        </td>
                                    </tr>
                                ))}
                                {grupos.length === 0 && (
                                    <tr><td colSpan="4" style={{textAlign:'center', padding:'30px', color: '#666'}}>Nenhum grupo criado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Editar Equipamento/Rede */}
            {editModal && (
                <div className="modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Editar {editModal.tipo === 'REDE' ? 'Rede' : 'Equipamento'}</h2>
                        <p style={{ color: '#a0a0b0', marginBottom: 16 }}>
                            ID do Sistema: <strong style={{ color: '#fff' }}>#{editModal.id}</strong> {editModal.identificador_agente ? `| ID Agent: ${editModal.identificador_agente}` : ''}
                        </p>
                        <div className="form-group">
                            <label className="form-label">{editModal.tipo === 'REDE' ? 'Nome de Exibição da Rede' : 'Nome'}</label>
                            <input className="form-input" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} required />
                            {editModal.tipo === 'REDE' && <small style={{color:'#666'}}>O nome mudará visualmente mas o agent não perderá comunicação com essa rede.</small>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Grupo (Localização / Setor)</label>
                            <select className="form-input" value={editForm.grupo_id} onChange={(e) => setEditForm({ ...editForm, grupo_id: e.target.value })}>
                                <option value="">Sem Grupo</option>
                                {grupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.nome}</option>
                                ))}
                            </select>
                        </div>
                        {editModal.tipo !== 'REDE' && (
                            <div className="form-group">
                                <label className="form-label">Endereço IP (Override opcional)</label>
                                <input className="form-input" value={editForm.ip} onChange={(e) => setEditForm({ ...editForm, ip: e.target.value })} placeholder="192.168.1.100" />
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" className="btn" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)' }} onClick={() => setEditModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEditar} disabled={enviando}>
                                {enviando ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Criar Equipamento Manual */}
            {criarModal && (
                <div className="modal-overlay" onClick={() => setCriarModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Novo Equipamento Manual</h2>
                        <form onSubmit={handleCriar}>
                            <div className="form-group">
                                <label className="form-label">Nome do Equipamento</label>
                                <input className="form-input" value={criarForm.nome} onChange={(e) => setCriarForm({ ...criarForm, nome: e.target.value })} required placeholder="Ex: PC-LAB1-01" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Grupo</label>
                                <select className="form-input" value={criarForm.grupo_id} onChange={(e) => setCriarForm({ ...criarForm, grupo_id: e.target.value })}>
                                    <option value="">Sem Grupo</option>
                                    {grupos.map(g => (
                                        <option key={g.id} value={g.id}>{g.nome}</option>
                                    ))}
                                </select>
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

            {/* Modal: Criar Grupo */}
            {modalGrupo && (
                <div className="modal-overlay" onClick={() => setModalGrupo(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
                        <h2 className="modal-title">Novo Grupo</h2>
                        <form onSubmit={handleCriarGrupo}>
                            <div className="form-group">
                                <label className="form-label">Nome do Grupo</label>
                                <input className="form-input" value={nomeGrupo} onChange={(e) => setNomeGrupo(e.target.value)} required placeholder="Ex: Matriz - RH" autoFocus />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-texto-sec)' }} onClick={() => setModalGrupo(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={enviando || !nomeGrupo.trim()}>Criar Grupo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Historico de Chamados */}
            {historicoModal && (
                <div className="modal-overlay" onClick={() => setHistoricoModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <h2 className="modal-title">Historico de Chamados</h2>
                        <p style={{ color: '#a0a0b0', marginBottom: 16 }}>
                            Equipamento: <strong style={{ color: '#fff' }}>{historicoModal.nome}</strong>
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
