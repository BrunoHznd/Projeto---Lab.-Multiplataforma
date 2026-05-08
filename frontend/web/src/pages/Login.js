/**
 * tiResolve Web - Pagina de Login
 * 2 opcoes: Login e Cadastrar com ID da Organizacao.
 * A criacao de novas organizacoes e exclusiva do SysAdmin.
 */

import React, { useState, useEffect } from 'react';
import { login, registrarComID, redefinirSenha } from '../services/api';

export default function LoginPage() {
    const [modo, setModo] = useState('login');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [nome, setNome] = useState('');
    const [codigoOrg, setCodigoOrg] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    // Redefinição de senha
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');

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
            const res = await login(email, senha);
            const role = res?.user?.role;
            if (role === 'SYSADMIN') window.location.href = '/sysadmin';
            else if (role === 'USUARIO') window.location.href = '/chamados';
            else window.location.href = '/dashboard';
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

    const handleRedefinirSenha = async (e) => {
        e.preventDefault();
        setErro(''); setSucesso('');
        if (novaSenha !== confirmarSenha) {
            setErro('As senhas não coincidem');
            return;
        }
        if (novaSenha.length < 6) {
            setErro('A nova senha deve ter no mínimo 6 caracteres');
            return;
        }
        setCarregando(true);
        try {
            await redefinirSenha(email, codigoOrg, novaSenha);
            setSucesso('Senha redefinida com sucesso! Você já pode entrar com a nova senha.');
            setSenha(''); setNovaSenha(''); setConfirmarSenha('');
            setModo('login');
        } catch (err) {
            setErro(err.response?.data?.detail || 'Não foi possível redefinir a senha');
        }
        setCarregando(false);
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: modo === 'login' ? 420 : 460 }}>
                <div className="login-icon"><i className="fa-solid fa-desktop"></i></div>
                <h1 className="login-title">tiResolve</h1>
                <p className="login-subtitle">
                    {modo === 'login' && 'Acesse sua conta'}
                    {modo === 'cadastro_id' && 'Cadastrar com ID da Organizacao'}
                    {modo === 'redefinir' && 'Redefinir minha senha'}
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
                        <button
                            type="button"
                            onClick={() => { setModo('redefinir'); setErro(''); setSucesso(''); }}
                            style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--cor-primaria)', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'center', fontFamily: 'inherit' }}
                        >
                            <i className="fa-solid fa-key" style={{ marginRight: 6 }}></i>Esqueci minha senha
                        </button>
                    </form>
                )}

                {/* ========== REDEFINIR SENHA ========== */}
                {modo === 'redefinir' && (
                    <form onSubmit={handleRedefinirSenha}>
                        <div style={{ background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#4FC3F7', fontSize: 12 }}>
                            <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                            Informe seu e-mail e o código da sua organização para definir uma nova senha.
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Código da Organização</label>
                            <input className="form-input" value={codigoOrg} onChange={(e) => setCodigoOrg(e.target.value.toUpperCase())} required placeholder="Ex: A1B2C3D4"
                                style={{ letterSpacing: '3px', textAlign: 'center', fontWeight: 700, fontSize: 18 }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nova Senha <span style={{ color: '#666', fontSize: 11 }}>(mínimo 6 caracteres)</span></label>
                            <input className="form-input" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={6} placeholder="••••••••" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirmar Nova Senha</label>
                            <input className="form-input" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required minLength={6} placeholder="••••••••" />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={carregando}>
                            {carregando ? 'Redefinindo...' : 'Redefinir Senha'}
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
                        <button
                            onClick={() => { setModo('cadastro_id'); setErro(''); }}
                            style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, color: 'var(--cor-primaria)', cursor: 'pointer', padding: '10px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}
                        >
                            <i className="fa-solid fa-key"></i> Cadastrar com ID da Organizacao
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
