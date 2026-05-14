/**
 * tiResolve Desktop - Serviço de API
 */

import axios from 'axios';

// Em producao (Electron empacotado), usa o IP do servidor.
// Em desenvolvimento, usa localhost ou REACT_APP_API_URL.
const isElectronProd = typeof window !== 'undefined' && window.electronAPI?.isElectron && !window.location.href.startsWith('http://localhost');
const API_URL = isElectronProd
    ? 'http://67.211.211.231/api'
    : (process.env.REACT_APP_API_URL || 'http://localhost:8000');

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('tiresolve_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('tiresolve_token');
            localStorage.removeItem('tiresolve_user');
            // HashRouter: usa hash para navegar corretamente no Electron
            window.location.hash = '#/login';
        }
        return Promise.reject(error);
    }
);

export const login = async (email, senha) => {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('tiresolve_token', res.data.access_token);
    localStorage.setItem('tiresolve_user', JSON.stringify(res.data.user));
    return res.data;
};

export const logout = () => {
    localStorage.removeItem('tiresolve_token');
    localStorage.removeItem('tiresolve_user');
};

export const getUser = () => {
    const u = localStorage.getItem('tiresolve_user');
    return u ? JSON.parse(u) : null;
};

export const isAuthenticated = () => !!localStorage.getItem('tiresolve_token');

export const listarChamados = (status) =>
    api.get('/chamados/', { params: status ? { status } : {} }).then(r => r.data);

export const obterChamado = (id) =>
    api.get(`/chamados/${id}`).then(r => r.data);

export const atualizarChamado = (id, dados) =>
    api.put(`/chamados/${id}`, dados).then(r => r.data);

export const listarLogs = (chamadoId) =>
    api.get(`/chamados/${chamadoId}/logs`).then(r => r.data);

export const adicionarLog = (chamadoId, mensagem) =>
    api.post(`/chamados/${chamadoId}/logs`, { mensagem }).then(r => r.data);

export const listarMaquinas = () =>
    api.get('/maquinas').then(r => r.data);

export const obterMaquina = (id) =>
    api.get(`/maquinas/${id}`).then(r => r.data);

export default api;
