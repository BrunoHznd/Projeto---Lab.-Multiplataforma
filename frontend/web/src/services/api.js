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

// Baixa o agent vinculado a um item do inventario (forca download como arquivo).
export const baixarAgentInventario = async (id) => {
    const response = await api.get(`/inventario/${id}/download-agent`, {
        responseType: 'blob',
    });
    const cd = response.headers['content-disposition'] || '';
    const match = cd.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `tiresolve_agent_inv${id}.py`;
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

// Categorias de Inventario
export const listarCategoriasInventario = () =>
    api.get('/inventario/categorias').then(r => r.data);

export const criarCategoriaInventario = (dados) =>
    api.post('/inventario/categorias', dados).then(r => r.data);

export const deletarCategoriaInventario = (id) =>
    api.delete(`/inventario/categorias/${id}`);

// Marcar equipamento como Em Manutencao (via chamado)
export const marcarManutencao = (chamadoId, motivo) =>
    api.put(`/chamados/${chamadoId}/manutencao`, { motivo }).then(r => r.data);

// ===== USERS =====
export const registrarUsuario = (dados) =>
    api.post('/auth/register', dados).then(r => r.data);

export const editarUsuario = (userId, dados) =>
    api.put(`/auth/users/${userId}`, dados).then(r => r.data);

export const alterarSenha = (senhaAtual, novaSenha) =>
    api.put('/auth/alterar-senha', { senha_atual: senhaAtual, nova_senha: novaSenha }).then(r => r.data);

export const redefinirSenha = (email, codigoOrganizacao, novaSenha) =>
    api.post('/auth/redefinir-senha', {
        email,
        codigo_organizacao: codigoOrganizacao,
        nova_senha: novaSenha,
    }).then(r => r.data);

export const statsUsuario = (userId) =>
    api.get(`/auth/users/${userId}/stats`).then(r => r.data);

export const excluirUsuario = (userId) =>
    api.delete(`/auth/users/${userId}`);

// ADMIN troca a senha de qualquer usuario da propria organizacao
export const adminTrocarSenhaUsuario = (userId, novaSenha) =>
    api.put(`/auth/users/${userId}/senha`, { nova_senha: novaSenha }).then(r => r.data);

// ===== ORGANIZACAO =====
export const atualizarLogoOrg = (logo_url) =>
    api.put('/auth/organizacao/logo', { logo_url }).then(r => r.data);

// ===== SYSADMIN =====
export const sysadminListarOrgs = () =>
    api.get('/sysadmin/organizacoes').then(r => r.data);

export const sysadminCriarOrg = (dados) =>
    api.post('/sysadmin/organizacoes', dados).then(r => r.data);

export const sysadminEditarOrg = (id, dados) =>
    api.put(`/sysadmin/organizacoes/${id}`, dados).then(r => r.data);

export const sysadminDeletarOrg = (id) =>
    api.delete(`/sysadmin/organizacoes/${id}`);

export const sysadminListarUsuariosOrg = (orgId) =>
    api.get(`/sysadmin/organizacoes/${orgId}/usuarios`).then(r => r.data);

export const sysadminCriarSysAdmin = (dados) =>
    api.post('/sysadmin/criar-sysadmin', dados).then(r => r.data);

// SYSADMIN troca a senha de qualquer usuario (tipicamente do Admin de uma org)
export const sysadminTrocarSenhaUsuario = (userId, novaSenha) =>
    api.put(`/sysadmin/usuarios/${userId}/senha`, { nova_senha: novaSenha }).then(r => r.data);

export default api;
