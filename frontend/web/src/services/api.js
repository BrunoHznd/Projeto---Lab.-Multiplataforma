/**
 * tiResolve Web - Servico de API
 * Cliente HTTP com Axios para o painel.
 */

import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor - adiciona token JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('tiresolve_token');
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
            localStorage.removeItem('tiresolve_token');
            localStorage.removeItem('tiresolve_user');
            localStorage.removeItem('tiresolve_org');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ===== AUTH =====
export const login = async (email, senha) => {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('tiresolve_token', res.data.access_token);
    localStorage.setItem('tiresolve_user', JSON.stringify(res.data.user));
    if (res.data.organizacao) {
        localStorage.setItem('tiresolve_org', JSON.stringify(res.data.organizacao));
    }
    return res.data;
};

export const criarOrganizacao = async (dados) => {
    const res = await api.post('/auth/criar-organizacao', dados);
    localStorage.setItem('tiresolve_token', res.data.access_token);
    localStorage.setItem('tiresolve_user', JSON.stringify(res.data.user));
    if (res.data.organizacao) {
        localStorage.setItem('tiresolve_org', JSON.stringify(res.data.organizacao));
    }
    return res.data;
};

export const registrarComID = async (dados) => {
    const res = await api.post('/auth/registrar-com-id', dados);
    localStorage.setItem('tiresolve_token', res.data.access_token);
    localStorage.setItem('tiresolve_user', JSON.stringify(res.data.user));
    if (res.data.organizacao) {
        localStorage.setItem('tiresolve_org', JSON.stringify(res.data.organizacao));
    }
    return res.data;
};

export const logout = () => {
    localStorage.removeItem('tiresolve_token');
    localStorage.removeItem('tiresolve_user');
    localStorage.removeItem('tiresolve_org');
};

export const getUser = () => {
    const u = localStorage.getItem('tiresolve_user');
    return u ? JSON.parse(u) : null;
};

export const getOrg = () => {
    const o = localStorage.getItem('tiresolve_org');
    return o ? JSON.parse(o) : null;
};

export const isAuthenticated = () => !!localStorage.getItem('tiresolve_token');

// ===== CHAMADOS =====
export const listarChamados = (status) =>
    api.get('/chamados/', { params: status ? { status } : {} }).then(r => r.data);

export const obterChamado = (id) =>
    api.get(`/chamados/${id}`).then(r => r.data);

export const criarChamado = (dados) =>
    api.post('/chamados/', dados).then(r => r.data);

export const editarChamadoUsuario = (id, dados) =>
    api.put(`/chamados/${id}/editar`, dados).then(r => r.data);

export const atualizarChamado = (id, dados) =>
    api.put(`/chamados/${id}`, dados).then(r => r.data);

export const deletarChamado = (id) =>
    api.delete(`/chamados/${id}`);

// ===== FLUXO POR ROLE =====
export const listarTecnicos = () =>
    api.get('/chamados/tecnicos').then(r => r.data);

export const atribuirTecnico = (chamadoId, tecnicoId) =>
    api.put(`/chamados/${chamadoId}/atribuir`, { tecnico_id: tecnicoId }).then(r => r.data);

export const finalizarChamado = (chamadoId, resolucao, imagemUrl = null) =>
    api.put(`/chamados/${chamadoId}/finalizar`, {
        resolucao,
        imagem_url: imagemUrl
    }).then(r => r.data);

// ===== CHAT / MENSAGENS =====
export const listarMensagens = (chamadoId) =>
    api.get(`/chamados/${chamadoId}/mensagens`).then(r => r.data);

export const enviarMensagem = (chamadoId, mensagem, imagemUrl = null) =>
    api.post(`/chamados/${chamadoId}/mensagens`, { mensagem, imagem_url: imagemUrl }).then(r => r.data);

// ===== UPLOAD =====
export const uploadImagem = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

// ===== MONITORAMENTO / EQUIPAMENTOS =====
export const listarMaquinas = (tipo = null) => {
    let url = '/maquinas';
    if (tipo) url += `?tipo=${tipo}`;
    return api.get(url).then(r => r.data);
};

export const obterMaquina = (id) =>
    api.get(`/maquinas/${id}`).then(r => r.data);

export const criarMaquina = (dados) =>
    api.post('/maquinas', dados).then(r => r.data);

export const atualizarMaquina = (id, dados) =>
    api.put(`/maquinas/${id}`, dados).then(r => r.data);

export const deletarMaquina = (id) =>
    api.delete(`/maquinas/${id}`);

export const historicoChamadosMaquina = (maquinaId) =>
    api.get(`/maquinas/${maquinaId}/chamados`).then(r => r.data);

export const downloadAgentHardware = () =>
    api.get('/maquinas/download-agent/hardware', { responseType: 'blob' }).then(r => r);

export const downloadAgentRede = () =>
    api.get('/maquinas/download-agent/rede', { responseType: 'blob' }).then(r => r);

// ===== GRUPOS =====
export const listarGrupos = () =>
    api.get('/grupos').then(r => r.data);

export const criarGrupo = (dados) =>
    api.post('/grupos', dados).then(r => r.data);

export const atualizarGrupo = (id, dados) =>
    api.put(`/grupos/${id}`, dados).then(r => r.data);

export const deletarGrupo = (id) =>
    api.delete(`/grupos/${id}`);

// ===== INVENTARIO =====
export const listarInventario = () =>
    api.get('/inventario').then(r => r.data);

export const criarItemInventario = (dados) =>
    api.post('/inventario', dados).then(r => r.data);

export const atualizarItemInventario = (id, dados) =>
    api.put(`/inventario/${id}`, dados).then(r => r.data);

export const deletarItemInventario = (id) =>
    api.delete(`/inventario/${id}`);

// ===== USERS =====
export const registrarUsuario = (dados) =>
    api.post('/auth/register', dados).then(r => r.data);

export const editarUsuario = (userId, dados) =>
    api.put(`/auth/users/${userId}`, dados).then(r => r.data);

export const alterarSenha = (senhaAtual, novaSenha) =>
    api.put('/auth/alterar-senha', { senha_atual: senhaAtual, nova_senha: novaSenha }).then(r => r.data);

export const statsUsuario = (userId) =>
    api.get(`/auth/users/${userId}/stats`).then(r => r.data);

export const excluirUsuario = (userId) =>
    api.delete(`/auth/users/${userId}`);

export default api;
