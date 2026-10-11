import { useEffect } from 'react';

import { ApiError } from '../services/api.js';
import { getCurrentSession } from '../services/auth.js';
import { useAuthStore } from '../stores/authStore.js';

/**
 * Bootstrap da sessão autenticada (FASE 27).
 *
 * Com um token persistido, busca `GET /auth/me` uma vez por sessão para
 * repor/atualizar o usuário e o BRANDING do estabelecimento (name +
 * logoUrl) no authStore. Isso garante a marca correta nos layouts mesmo
 * para sessões antigas (gravadas antes deste contrato) e após o branding
 * mudar no servidor.
 *
 * Se o backend responder `401` (token inválido ou usuário/estabelecimento
 * removido), encerra a sessão local — evita manter uma sessão fantasma.
 * Outros erros (ex.: rede) são ignorados: a sessão persistida permanece.
 *
 * Não renderiza nada; é montado uma vez na raiz do app.
 */
export function SessionSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const syncSession = useAuthStore((s) => s.syncSession);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    let active = true;

    getCurrentSession()
      .then((session) => {
        if (active) {
          syncSession(session);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          logout();
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, token, syncSession, logout]);

  return null;
}
