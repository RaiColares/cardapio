import { Outlet } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

import { LogoutButton } from '../components/ui/LogoutButton.js';

/**
 * Shell do garçom: mobile/tablet, mapa de mesas e atendimento.
 * O cabeçalho concentra o "Sair" para que a sessão seja encerrável de
 * qualquer tela (aparelhos compartilhados no salão).
 */
export function WaiterLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-sand-50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-stone-900 px-4 text-white">
        <ClipboardList className="size-5" aria-hidden="true" />
        <h1 className="font-display text-lg font-semibold">Garçom</h1>
        <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
          Mesas
        </span>
        <LogoutButton variant="onDark" />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
