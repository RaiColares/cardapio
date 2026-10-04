import { Outlet } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

import { LogoutButton } from '../components/ui/LogoutButton.js';

/**
 * Shell da cozinha: alto contraste, foco operacional, sem distrações.
 * Prioriza tablet/desktop. O "Sair" fica no cabeçalho para encerrar a
 * sessão de qualquer tela.
 */
export function KitchenLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-stone-900 px-4 text-white">
        <ChefHat className="size-5" aria-hidden="true" />
        <h1 className="font-display text-lg font-semibold">Cozinha</h1>
        <span className="ml-auto hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold sm:inline-block">
          Painel operacional
        </span>
        <LogoutButton variant="onDark" className="ml-auto sm:ml-0" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
