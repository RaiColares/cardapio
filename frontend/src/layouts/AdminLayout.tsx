import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Menu,
  Settings,
  Tags,
  Users,
  UtensilsCrossed,
  Waves,
} from 'lucide-react';

import { Avatar } from '../components/ui/Avatar.js';
import { Drawer } from '../components/ui/Drawer.js';
import { useAuthStore } from '../stores/authStore.js';
import type { Role } from '../types/domain.js';
import { cn } from '../utils/cn.js';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end: boolean;
  /** Papéis que enxergam o item (espelha as proteções de rota). */
  roles: Role[];
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/orders', label: 'Pedidos', icon: ClipboardList, end: false, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/reports', label: 'Relatórios', icon: BarChart3, end: false, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/products', label: 'Produtos', icon: UtensilsCrossed, end: false, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/categories', label: 'Categorias', icon: Tags, end: false, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/areas', label: 'Áreas', icon: MapPin, end: false, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/tables', label: 'Mesas', icon: LayoutGrid, end: false, roles: ['ADMIN', 'MANAGER'] },
  // Equipe é exclusiva de ADMIN; Configurações é ADMIN/MANAGER.
  { to: '/admin/team', label: 'Equipe', icon: Users, end: false, roles: ['ADMIN'] },
  { to: '/admin/settings', label: 'Configurações', icon: Settings, end: false, roles: ['ADMIN', 'MANAGER'] },
];

/**
 * Painel administrativo: sidebar em desktop (>lg), drawer no mobile.
 * Os itens do menu são filtrados pela role do usuário logado — o mesmo
 * critério de autorização do backend (ADMIN gerencia tudo; MANAGER não
 * vê "Equipe", que continua acessível apenas ao ADMIN).
 */
export function AdminLayout() {
  const role = useAuthStore((s) => s.role);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleItems = navItems.filter((item) => (role ? item.roles.includes(role) : false));

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Navegação administrativa">
      {visibleItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
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
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-sand-50">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-stone-200 bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-700 text-white">
            <Waves className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold text-stone-900">Balneário</span>
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
          <span className="font-display font-semibold text-stone-900">Administração</span>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title="Administração"
        placement="right"
      >
        {nav}
      </Drawer>
    </div>
  );
}
