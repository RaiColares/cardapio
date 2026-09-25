import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser, Role } from '../types/domain.js';

/** Chave do localStorage onde a sessão é persistida (usada pelo interceptor da api). */
export const AUTH_STORAGE_KEY = 'cardapio.auth';

interface LoginPayload {
  token: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  role: Role | null;
  setSession: (payload: LoginPayload) => void;
  logout: () => void;
}

/**
 * Estado global da sessão (Zustand + persist em localStorage).
 *
 * Regra de arquitetura: a store NÃO chama a API — a página de login
 * envia as credenciais e, em sucesso, popula a sessão via setSession.
 * O logout apenas limpa o estado; o interceptor da api deixa de
 * injetar o token automaticamente.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,

      setSession: ({ token, user }) =>
        set({ token, user, role: user.role, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, role: null, isAuthenticated: false }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
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
