import type { AuthEstablishment, AuthUser } from '../types/domain.js';
import { api } from './api.js';

/**
 * Serviço de sessão autenticada (FASE 27).
 *
 * `POST /auth/login` é executado inline na página de login (retorna
 * token + user + establishment). Este módulo expõe `GET /auth/me`, usado
 * no bootstrap para repor/atualizar o usuário e o branding do
 * estabelecimento a partir de uma sessão persistida.
 */

/** Sessão atual, conforme `GET /auth/me`. */
export interface CurrentSession {
  user: AuthUser;
  establishment: AuthEstablishment;
}

/**
 * GET /auth/me — usuário logado + branding do estabelecimento.
 *
 * O token é injetado pelo interceptor da api. Responde `401
 * SESSION_INVALID` quando o usuário/estabelecimento não existe mais
 * (ex.: exclusão definitiva do cliente pelo SUPER_ADMIN).
 */
export async function getCurrentSession(): Promise<CurrentSession> {
  const { data } = await api.get<{ success: true; data: CurrentSession }>('/auth/me');
  return data.data;
}
