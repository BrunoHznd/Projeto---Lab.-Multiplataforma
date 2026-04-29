/**
 * tiResolve Desktop - Login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);
        try {
            await login(email, senha);
            navigate('/kanban');
        } catch (error) {
            setErro(error.response?.data?.detail || 'Email ou senha incorretos.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-in">
                <div className="login-icon"><i className="fa-solid fa-wrench"></i></div>
                <h1 className="login-title">tiResolve</h1>
                <p className="login-subtitle">Painel Técnico - Centro de Informática</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" placeholder="tecnico@fatec.sp.gov.br" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <input type="password" className="form-input" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                    </div>
                    {erro && <div style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}><i className="fa-solid fa-triangle-exclamation"></i> {erro}</div>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={carregando}>
                        {carregando ? 'Entrando...' : <><i className="fa-solid fa-right-to-bracket"></i> Entrar</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
