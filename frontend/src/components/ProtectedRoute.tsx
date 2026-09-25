import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { homeForRole, useAuthStore } from '../stores/authStore.js';
import type { Role } from '../types/domain.js';

export interface ProtectedRouteProps {
  /** Papéis autorizados. Ausente = qualquer usuário autenticado. */
  allowedRoles?: Role[];
  children: ReactNode;
}

/**
 * Guarda de rota:
 *  - Não autenticado  -> redireciona para /login (preserva o destino em state).
 *  - Papel não autorizado -> redireciona para a home do próprio papel
 *    (ex.: WAITER tentando acessar /admin é levado a /waiter).
 *  - Autenticado e autorizado -> renderiza a rota.
 *
 * As permissões de verdade continuam no backend (authorize); este
 * wrapper apenas cuida da navegação e UX.
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: { pathname: location.pathname } }} />
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  // role nulo com sessão ativa é estado inconsistente — trata como não autenticado.
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
