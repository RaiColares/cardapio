import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { AUTH_STORAGE_KEY } from '../stores/authStore.js';

/**
 * BaseURL da API. Por padrão aponta para o backend local; pode ser
 * sobrescrita por VITE_API_BASE_URL (ex.: proxy em produção).
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

/**
 * Erro normalizado de API.
 * O backend responde sempre com { success:false, error:{ code, message } }.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface ApiErrorPayload {
  error?: { code?: string; message?: string };
}

/** Localiza o token JWT persistido e o injeta no header Authorization. */
function attachAuth(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  let raw: string | null = null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { token?: string | null } };
      raw = parsed.state?.token ?? null;
    }
  } catch {
    raw = null;
  }

  if (raw && raw.length > 0) {
    config.headers.Authorization = `Bearer ${raw}`;
  }

  return config;
}

/**
 * Instância axios da SPA.
 * - Request: injeta Bearer token quando disponível.
 * - Response: normaliza erros da API para ApiError (code + message).
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(attachAuth);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status ?? 0;
    const code = error.response?.data?.error?.code ?? 'NETWORK_ERROR';
    const message =
      error.response?.data?.error?.message ??
      (status === 0
        ? 'Não foi possível conectar ao servidor. Tente novamente.'
        : `Erro inesperado (${status}).`);

    return Promise.reject(new ApiError(status, code, message));
  },
);
