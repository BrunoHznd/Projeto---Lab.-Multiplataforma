/**
 * tiResolve - Serviço de API (Mobile)
 * Cliente HTTP com Axios, interceptors para JWT e funções de API.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getConfiguredApiUrl = () => {
    const fromEnv = process.env.TIRESOLVE_API_URL;
    if (fromEnv) return fromEnv;

    const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
    const fromExtra = extra?.TIRESOLVE_API_URL || extra?.apiUrl;
    if (fromExtra) return fromExtra;

    return null;
};

// URL do servidor de produção (via Nginx na porta 80)
const PRODUCTION_API_URL = 'http://67.211.211.231/api';

// Detecta IP automaticamente (apenas para desenvolvimento local com Expo Go)
const getAutoApiUrl = () => {
    // Dispositivo fisico em dev: usa IP do Expo para conectar ao servidor local
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (__DEV__ && debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:8000`;
    }
    // Emulador Android em dev
    if (__DEV__ && Platform.OS === 'android' && !Constants.isDevice) {
        return 'http://10.0.2.2:8000';
    }
    // Produção: usa servidor real
    return PRODUCTION_API_URL;
};

export const API_URL = getConfiguredApiUrl() || getAutoApiUrl();

// Salva API_URL no AsyncStorage para o background task acessar
AsyncStorage.setItem('@tiresolve_api_url', API_URL).catch(() => {});

// Instância Axios configurada
const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('@tiresolve_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expirado - remove dados e redireciona para login
            await AsyncStorage.multiRemove(['@tiresolve_token', '@tiresolve_user']);
        }
        return Promise.reject(error);
    }
);

// ==================== AUTH ====================

/**
 * Realiza login do usuário.
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise<object>} Dados do token e usuário
 */
/**
 * Testa a conexão com o servidor.
 * @returns {Promise<{ok: boolean, url: string, error?: string}>}
 */
export const testarConexao = async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${API_URL}/`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            return { ok: true, url: API_URL };
        }
        return { ok: false, url: API_URL, error: `HTTP ${response.status}` };
    } catch (err) {
        if (err.name === 'AbortError') {
            return { ok: false, url: API_URL, error: 'Timeout (10s)' };
        }
        return { ok: false, url: API_URL, error: err.message };
    }
};

export const login = async (email, senha) => {
    const response = await api.post('/auth/login', { email, senha });
    const { access_token, user } = response.data;

    // Salva token e dados do usuário localmente
    await AsyncStorage.setItem('@tiresolve_token', access_token);
    await AsyncStorage.setItem('@tiresolve_user', JSON.stringify(user));

    return response.data;
};

/**
 * Realiza registro de novo usuário.
 * @param {object} dados - Dados do usuário (nome, email, senha)
 * @returns {Promise<object>} Dados do usuário criado
 */
export const registrar = async (dados) => {
    const response = await api.post('/auth/register', dados);
    return response.data;
};

/**
 * Registra usuario com codigo da organizacao (fluxo QR Code).
 * @param {object} dados - { nome, email, senha, codigo_organizacao }
 * @returns {Promise<object>} Dados do token e usuário
 */
export const registrarComID = async (dados) => {
    const response = await api.post('/auth/registrar-com-id', dados);
    const { access_token, user } = response.data;

    await AsyncStorage.setItem('@tiresolve_token', access_token);
    await AsyncStorage.setItem('@tiresolve_user', JSON.stringify(user));

    return response.data;
};

/**
 * Realiza logout removendo dados locais.
 */
export const logout = async () => {
    await AsyncStorage.multiRemove(['@tiresolve_token', '@tiresolve_user']);
};

/**
 * Obtém dados do usuário logado do storage.
 * @returns {Promise<object|null>} Dados do usuário ou null
 */
export const getUsuarioLogado = async () => {
    const userData = await AsyncStorage.getItem('@tiresolve_user');
    return userData ? JSON.parse(userData) : null;
};

/**
 * Verifica se existe um token válido.
 * @returns {Promise<boolean>} True se autenticado
 */
export const isAuthenticated = async () => {
    const token = await AsyncStorage.getItem('@tiresolve_token');
    return !!token;
};

// ==================== UPLOAD ====================

/**
 * Faz upload de imagem para o servidor.
 * Usa fetch diretamente para suporte correto a FormData no React Native.
 * @param {string} uri - URI local da imagem
 * @returns {Promise<string>} URL da imagem salva no servidor
 */
export const uploadImagem = async (uri) => {
    const token = await AsyncStorage.getItem('@tiresolve_token');

    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
        uri,
        name: filename,
        type,
    });

    const response = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro no upload (${response.status})`);
    }

    const data = await response.json();
    return data.url;
};

// ==================== CHAMADOS ====================

/**
 * Lista chamados do usuário.
 * @param {string} [status] - Filtro por status (ABERTO, EM_ATENDIMENTO, FINALIZADO)
 * @returns {Promise<Array>} Lista de chamados
 */
export const listarChamados = async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/chamados/', { params });
    return response.data;
};

/**
 * Obtém detalhes de um chamado.
 * @param {number} id - ID do chamado
 * @returns {Promise<object>} Dados do chamado
 */
export const obterChamado = async (id) => {
    const response = await api.get(`/chamados/${id}`);
    return response.data;
};

/**
 * Cria um novo chamado.
 * @param {object} dados - Dados do chamado (titulo, descricao, prioridade)
 * @returns {Promise<object>} Chamado criado
 */
export const criarChamado = async (dados) => {
    const response = await api.post('/chamados/', dados);
    return response.data;
};

/**
 * Atualiza um chamado existente.
 * @param {number} id - ID do chamado
 * @param {object} dados - Dados a atualizar
 * @returns {Promise<object>} Chamado atualizado
 */
export const atualizarChamado = async (id, dados) => {
    const response = await api.put(`/chamados/${id}`, dados);
    return response.data;
};

// ==================== LOGS ====================

/**
 * Lista logs de um chamado.
 * @param {number} chamadoId - ID do chamado
 * @returns {Promise<Array>} Lista de logs
 */
export const listarLogs = async (chamadoId) => {
    const response = await api.get(`/chamados/${chamadoId}/logs`);
    return response.data;
};

/**
 * Adiciona um log a um chamado.
 * @param {number} chamadoId - ID do chamado
 * @param {string} mensagem - Texto do log
 * @returns {Promise<object>} Log criado
 */
export const adicionarLog = async (chamadoId, mensagem) => {
    const response = await api.post(`/chamados/${chamadoId}/logs`, { mensagem });
    return response.data;
};

// ==================== NOTIFICAÇÕES ====================

/**
 * Lista notificações do usuário.
 * @param {boolean} naoLidas - Se true, filtra apenas não lidas
 * @returns {Promise<Array>} Lista de notificações
 */
export const listarNotificacoes = async (naoLidas = false) => {
    const params = naoLidas ? { nao_lidas: true } : {};
    const response = await api.get('/notificacoes/', { params });
    return response.data;
};

/**
 * Retorna contagem de notificações não lidas.
 * @returns {Promise<number>} Contagem
 */
export const contagemNaoLidas = async () => {
    const response = await api.get('/notificacoes/contagem');
    return response.data.nao_lidas;
};

/**
 * Marca uma notificação como lida.
 * @param {number} id - ID da notificação
 * @returns {Promise<object>} Notificação atualizada
 */
export const marcarNotificacaoLida = async (id) => {
    const response = await api.put(`/notificacoes/${id}/lida`);
    return response.data;
};

/**
 * Marca todas as notificações como lidas.
 * @returns {Promise<object>} Resultado
 */
export const marcarTodasLidas = async () => {
    const response = await api.put('/notificacoes/ler-todas');
    return response.data;
};

// ==================== PUSH TOKEN ====================

/**
 * Envia o Expo Push Token ao backend para receber notificações push.
 * @param {string} pushToken - Token Expo do dispositivo
 * @returns {Promise<object>} Resultado
 */
export const enviarPushToken = async (pushToken) => {
    const response = await api.post('/auth/push-token', { push_token: pushToken });
    return response.data;
};

export default api;
