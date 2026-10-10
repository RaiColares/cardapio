import { Link, Outlet } from 'react-router-dom';
import { ClipboardList, LayoutDashboard } from 'lucide-react';

import { LogoutButton } from '../components/ui/LogoutButton.js';
import { useAuthStore } from '../stores/authStore.js';

/**
 * Shell do garçom: mobile/tablet, mapa de mesas e atendimento.
 * O cabeçalho concentra a saudação do usuário logado e o "Sair" para que
 * a sessão seja encerrável de qualquer tela (aparelhos compartilhados no
 * salão). Em telas menores a saudação é truncada para não quebrar o layout.
 */
export function WaiterLayout() {
  const userName = useAuthStore((state) => state.user?.name ?? '');
  const firstName = userName.split(' ')[0] ?? '';
  // GERENTE/ADMIN acessa o salão pelo painel — oferece o retorno sem
  // precisar de trocar de conta (FASE 24).
  const canAccessAdmin =
    useAuthStore((state) => state.role) === 'MANAGER' ||
    useAuthStore((state) => state.role) === 'ADMIN';

  return (
    <div className="flex min-h-dvh flex-col bg-sand-50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-stone-900 px-4 text-white">
        <ClipboardList className="size-5 shrink-0" aria-hidden="true" />
        <h1 className="font-display text-lg font-semibold">Garçom</h1>
        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold lg:inline-block">
            Mesas
          </span>
          {canAccessAdmin && (
            <Link
              to="/admin"
              title="Painel administrativo"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:px-3"
            >
              <LayoutDashboard className="size-5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Painel</span>
            </Link>
          )}
          {firstName && (
            <span
              className="inline-block min-w-0 max-w-[6rem] truncate text-sm font-medium text-white/90"
              title={userName}
            >
              Olá, {firstName}
            </span>
          )}
          <LogoutButton variant="onDark" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}
