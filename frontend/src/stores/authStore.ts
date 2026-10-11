import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthEstablishment, AuthUser, Role } from '../types/domain.js';

/** Chave do localStorage onde a sessão é persistida (usada pelo interceptor da api). */
export const AUTH_STORAGE_KEY = 'cardapio.auth';

interface LoginPayload {
  token: string;
  user: AuthUser;
  /** Branding do estabelecimento (FASE 27) — presente no login. */
  establishment: AuthEstablishment;
}

interface SessionPayload {
  user: AuthUser;
  establishment: AuthEstablishment;
}

interface AuthState {
  user: AuthUser | null;
  /** Branding do estabelecimento do usuário (nome + logo) — layouts consomem daqui. */
  establishment: AuthEstablishment | null;
  token: string | null;
  isAuthenticated: boolean;
  role: Role | null;
  setSession: (payload: LoginPayload) => void;
  /** Atualiza usuário + branding (bootstrap de `GET /auth/me`). */
  syncSession: (payload: SessionPayload) => void;
  /** Atualiza apenas o branding (ex.: após editar as configurações). */
  setEstablishment: (establishment: AuthEstablishment) => void;
  logout: () => void;
}

/**
 * Estado global da sessão (Zustand + persist em localStorage).
 *
 * Regra de arquitetura: a store NÃO chama a API — a página de login
 * envia as credenciais e, em sucesso, popula a sessão via setSession; o
 * `SessionSync` (bootstrap) complementa via `GET /auth/me`. O logout
 * apenas limpa o estado; o interceptor da api deixa de injetar o token
 * automaticamente.
 *
 * `establishment` (name + logoUrl) alimenta a marca dos layouts. É
 * persistido para sobreviver ao refresh; fica `null` em sessões antigas
 * gravadas antes da FASE 27 até o `SessionSync` repor os dados.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      establishment: null,
      token: null,
      isAuthenticated: false,
      role: null,

      setSession: ({ token, user, establishment }) =>
        set({ token, user, establishment, role: user.role, isAuthenticated: true }),

      syncSession: ({ user, establishment }) =>
        set({ user, establishment, role: user.role }),

      setEstablishment: (establishment) => set({ establishment }),

      logout: () =>
        set({
          user: null,
          establishment: null,
          token: null,
          role: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        establishment: state.establishment,
        token: state.token,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

/** Rota padrão de cada papel após o login (usada também pelo ProtectedRoute). */
export function homeForRole(role: Role | null): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin';
    case 'ADMIN':
    case 'MANAGER':
      return '/admin';
    case 'KITCHEN':
      return '/kitchen';
    case 'WAITER':
      return '/waiter';
    default:
      return '/login';
  }
}
