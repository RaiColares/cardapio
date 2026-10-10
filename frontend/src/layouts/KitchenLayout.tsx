import { Link, Outlet } from 'react-router-dom';
import { ChefHat, LayoutDashboard } from 'lucide-react';

import { LogoutButton } from '../components/ui/LogoutButton.js';
import { useAuthStore } from '../stores/authStore.js';

/**
 * Shell da cozinha: alto contraste, foco operacional, sem distrações.
 * Prioriza tablet/desktop. O cabeçalho mostra quem está logado ("Olá,
 * [Nome]") junto do "Sair", para encerrar a sessão de qualquer tela.
 */
export function KitchenLayout() {
  const userName = useAuthStore((state) => state.user?.name ?? '');
  const firstName = userName.split(' ')[0] ?? '';
  // GERENTE/ADMIN acessa a cozinha pelo painel — oferece o retorno sem
  // precisar de trocar de conta (FASE 24).
  const canAccessAdmin =
    useAuthStore((state) => state.role) === 'MANAGER' ||
    useAuthStore((state) => state.role) === 'ADMIN';

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-stone-900 px-4 text-white">
        <ChefHat className="size-5 shrink-0" aria-hidden="true" />
        <h1 className="font-display text-lg font-semibold">Cozinha</h1>
        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold lg:inline-block">
            Painel operacional
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
