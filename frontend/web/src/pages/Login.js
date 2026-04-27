/**
 * tiResolve Web - Pagina de Login
 * 3 opcoes: Login, Cadastrar com ID, Sou Novo Na Plataforma
 */

import React, { useState, useEffect } from 'react';
import { login, criarOrganizacao, registrarComID, uploadImagem } from '../services/api';

export default function LoginPage() {
    const [modo, setModo] = useState('login');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [nome, setNome] = useState('');
    const [nomeEmpresa, setNomeEmpresa] = useState('');
    const [codigoOrg, setCodigoOrg] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    // Auto-preencher org code do QR Code (URL ?org=CODIGO)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const orgCode = params.get('org');
        if (orgCode) {
            setCodigoOrg(orgCode.toUpperCase());
            setModo('cadastro_id');
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setCarregando(true); setErro('');
        try {
            await login(email, senha);
            window.location.href = '/chamados';
        } catch (err) {
            setErro(err.response?.data?.detail || 'Email ou senha incorretos');
        }
        setCarregando(false);
    };

    const handleCadastroID = async (e) => {
        e.preventDefault();
        setCarregando(true); setErro('');
        try {
            await registrarComID({ email, senha, nome, codigo_organizacao: codigoOrg });
            window.location.href = '/chamados';
        } catch (err) {
            setErro(err.response?.data?.detail || 'Erro ao cadastrar');
        }
        setCarregando(false);
    };

    const handleNovaOrg = async (e) => {
        e.preventDefault();
        setCarregando(true); setErro('');
        try {
            // Cria org primeiro (logo depois - precisa do token)
            const res = await criarOrganizacao({
                nome_empresa: nomeEmpresa,
                email_admin: email,
                senha_admin: senha,
                logo_url: null
            });
            // Agora com token, faz upload do logo se houver
            if (logoFile) {
                try {
                    const upload = await uploadImagem(logoFile);
                    // TODO: atualizar logo da org via endpoint
                } catch { /* logo é opcional, segue sem */ }
            }
            window.location.href = '/dashboard';
        } catch (err) {
            setErro(err.response?.data?.detail || 'Erro ao criar organizacao');
        }
        setCarregando(false);
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: modo === 'login' ? 420 : 460 }}>
                <div className="login-icon">🖥️</div>
                <h1 className="login-title">tiResolve</h1>
                <p className="login-subtitle">
                    {modo === 'login' && 'Acesse sua conta'}
                    {modo === 'cadastro_id' && 'Cadastrar com ID da Organizacao'}
                    {modo === 'nova_org' && 'Criar Nova Organizacao'}
                </p>

                {erro && (
                    <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#FF6B6B', fontSize: 13 }}>
                        {erro}
                    </div>
                )}
                {sucesso && (
                    <div style={{ background: 'rgba(107,203,119,0.1)', border: '1px solid rgba(107,203,119,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#6BCB77', fontSize: 13 }}>
                        {sucesso}
                    </div>
                )}

                {/* ========== LOGIN ========== */}
                {modo === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Senha</label>
                            <input className="form-input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder="••••••••" />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={carregando}>
                            {carregando ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                )}

                {/* ========== CADASTRO COM ID ========== */}
                {modo === 'cadastro_id' && (
                    <form onSubmit={handleCadastroID}>
                        <div className="form-group">
                            <label className="form-label">Nome Completo</label>
                            <input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Seu nome" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Senha</label>
                            <input className="form-input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder="••••••••" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Codigo da Organizacao</label>
                            <input className="form-input" value={codigoOrg} onChange={(e) => setCodigoOrg(e.target.value.toUpperCase())} required placeholder="Ex: A1B2C3D4"
                                style={{ letterSpacing: '3px', textAlign: 'center', fontWeight: 700, fontSize: 18 }} />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={carregando}>
                            {carregando ? 'Cadastrando...' : 'Cadastrar'}
                        </button>
                    </form>
                )}

                {/* ========== NOVA ORGANIZACAO ========== */}
                {modo === 'nova_org' && (
                    <form onSubmit={handleNovaOrg}>
                        <div className="form-group">
                            <label className="form-label">Nome da Empresa</label>
                            <input className="form-input" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} required placeholder="Ex: FATEC Praia Grande" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email do Super Admin</label>
                            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@empresa.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Senha</label>
                            <input className="form-input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder="••••••••" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Logo da Empresa (opcional)</label>
                            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} style={{ color: '#a0a0b0' }} />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={carregando}>
                            {carregando ? 'Criando...' : 'Criar Organizacao'}
                        </button>
                    </form>
                )}

                {/* ========== BOTOES DE MODO ========== */}
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {modo !== 'login' && (
                        <button
                            onClick={() => { setModo('login'); setErro(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--cor-primaria)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                        >
                            ← Voltar ao Login
                        </button>
                    )}
                    {modo === 'login' && (
                        <>
                            <button
                                onClick={() => { setModo('cadastro_id'); setErro(''); }}
                                style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, color: 'var(--cor-primaria)', cursor: 'pointer', padding: '10px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}
                            >
                                🔑 Cadastrar com ID da Organizacao
                            </button>
                            <button
                                onClick={() => { setModo('nova_org'); setErro(''); }}
                                style={{ background: 'rgba(107,203,119,0.1)', border: '1px solid rgba(107,203,119,0.2)', borderRadius: 10, color: '#6BCB77', cursor: 'pointer', padding: '10px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}
                            >
                                🏢 Sou Novo Na Plataforma
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
