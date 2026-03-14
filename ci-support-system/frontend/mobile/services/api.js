/**
 * tiResolve - Serviço de API (Mobile)
 * Cliente HTTP com Axios, interceptors para JWT e funções de API.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Detecta IP automaticamente
const getApiUrl = () => {
    // Emulador Android: usa 10.0.2.2 (alias para localhost do PC)
    if (Platform.OS === 'android' && !Constants.isDevice) {
        return 'http://10.0.2.2:8000';
    }
    // Dispositivo fisico: usa IP do Expo
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:8000`;
    }
    return 'http://localhost:8000';
};

export const API_URL = getApiUrl();

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

export default api;
