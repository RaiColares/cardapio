import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Building2, Menu } from 'lucide-react';

import { Avatar } from '../components/ui/Avatar.js';
import { Drawer } from '../components/ui/Drawer.js';
import { EstablishmentBrand } from '../components/ui/EstablishmentBrand.js';
import { LogoutButton } from '../components/ui/LogoutButton.js';
import { useAuthStore } from '../stores/authStore.js';
import { cn } from '../utils/cn.js';

/**
 * Painel de ADMINISTRAÇÃO DA PLATAFORMA (FASE 27) — exclusivo SUPER_ADMIN.
 *
 * Espelha a estrutura do AdminLayout (sidebar desktop / drawer mobile),
 * mas com escopo GLOBAL: aqui o operador é a própria plataforma SaaS, não
 * um estabelecimento. A rota /super-admin é protegida e o backend reforça
 * a RBAC estrita (GET/PATCH /admin/* aceitam somente SUPER_ADMIN).
 *
 * Por enquanto há um único item de navegação (Clientes). A marca do
 * cabeçalho vem do estabelecimento do usuário logado (authStore) — o
 * mesmo branding dinâmico dos demais layouts; o rótulo da seção
 * ("Plataforma") identifica o contexto de administração da plataforma.
 */
export function SuperAdminLayout() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const establishment = useAuthStore((s) => s.establishment);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderItem = (to: string, label: string, Icon: typeof Building2) => (
    <NavLink
      key={to}
      to={to}
      end
      onClick={() => setMobileNavOpen(false)}
      className={({ isActive }) =>
        cn(
          'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-primary-700 text-white'
            : 'text-stone-600 hover:bg-sand-100 hover:text-stone-900',
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {label}
    </NavLink>
  );

  const nav = (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
        aria-label="Navegação da plataforma"
      >
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Gestão
        </p>
        {renderItem('/super-admin', 'Clientes', Building2)}
      </nav>

      {/* Rodapé: usuário logado + sair (mesmo bloco do AdminLayout) */}
      <div className="mt-auto border-t border-stone-200 pt-3">
        {user && (
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-900">{user.name}</p>
              {role && <p className="truncate text-xs text-stone-500">Super Administrador</p>}
            </div>
          </div>
        )}
        <LogoutButton onLogout={() => setMobileNavOpen(false)} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-sand-50">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <EstablishmentBrand
            name={establishment?.name}
            logoUrl={establishment?.logoUrl}
          />
        </div>
        {nav}
      </aside>

      {/* Topbar mobile */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
            className="rounded-xl p-2 text-stone-600 hover:bg-sand-100"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="font-display font-semibold text-stone-900">Plataforma</span>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title="Plataforma"
        placement="right"
      >
        {nav}
      </Drawer>
    </div>
  );
}