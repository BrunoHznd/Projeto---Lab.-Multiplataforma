/**
 * CI Support Web - Serviço de API
 * Cliente HTTP com Axios para o painel administrativo.
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor - adiciona token JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ci_support_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor - trata 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('ci_support_token');
            localStorage.removeItem('ci_support_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ===== AUTH =====
export const login = async (email, senha) => {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('ci_support_token', res.data.access_token);
    localStorage.setItem('ci_support_user', JSON.stringify(res.data.user));
    return res.data;
};

export const logout = () => {
    localStorage.removeItem('ci_support_token');
    localStorage.removeItem('ci_support_user');
};

export const getUser = () => {
    const u = localStorage.getItem('ci_support_user');
    return u ? JSON.parse(u) : null;
};

export const isAuthenticated = () => !!localStorage.getItem('ci_support_token');

// ===== CHAMADOS =====
export const listarChamados = (status) =>
    api.get('/chamados/', { params: status ? { status } : {} }).then(r => r.data);

export const obterChamado = (id) =>
    api.get(`/chamados/${id}`).then(r => r.data);

export const criarChamado = (dados) =>
    api.post('/chamados/', dados).then(r => r.data);

export const atualizarChamado = (id, dados) =>
    api.put(`/chamados/${id}`, dados).then(r => r.data);

export const deletarChamado = (id) =>
    api.delete(`/chamados/${id}`);

// ===== LOGS =====
export const listarLogs = (chamadoId) =>
    api.get(`/chamados/${chamadoId}/logs`).then(r => r.data);

export const adicionarLog = (chamadoId, mensagem) =>
    api.post(`/chamados/${chamadoId}/logs`, { mensagem }).then(r => r.data);

// ===== MONITORAMENTO =====
export const listarMaquinas = () =>
    api.get('/maquinas').then(r => r.data);

export const obterMaquina = (id) =>
    api.get(`/maquinas/${id}`).then(r => r.data);

export const atualizarMaquina = (id, dados) =>
    api.put(`/maquinas/${id}`, dados).then(r => r.data);

export const deletarMaquina = (id) =>
    api.delete(`/maquinas/${id}`);

// ===== USERS (via registro) =====
export const registrarUsuario = (dados) =>
    api.post('/auth/register', dados).then(r => r.data);

export default api;
