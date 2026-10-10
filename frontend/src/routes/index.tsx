import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { AdminLayout } from '../layouts/AdminLayout.js';
import { KitchenLayout } from '../layouts/KitchenLayout.js';
import { PublicLayout } from '../layouts/PublicLayout.js';
import { WaiterLayout } from '../layouts/WaiterLayout.js';
import { LoginPage } from '../pages/Login.js';
import { RegisterPage } from '../pages/public/Register.js';
import { AdminSettingsPage } from '../pages/admin/Settings.js';
import { AdminTeamPage } from '../pages/admin/Team.js';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage.js';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.js';
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage.js';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage.js';
import { AdminAreasPage } from '../pages/admin/AdminAreasPage.js';
import { AdminTablesPage } from '../pages/admin/AdminTablesPage.js';
import { AdminReportsPage } from '../pages/admin/Reports.js';
import { DesignSystemPage } from '../pages/design/DesignSystemPage.js';
import { KitchenPage } from '../pages/kitchen/KitchenPage.js';
import { MenuPage } from '../pages/menu/MenuPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { WaiterPage } from '../pages/waiter/WaiterPage.js';

/**
 * Rotas da SPA conforme architecture.md:
 *  - Cliente: /menu/:establishmentSlug e /table/:token (mobile-first, aberto)
 *  - Auth:    /login (público; redireciona para a home do papel se logado)
 *  - Admin:   /admin/* (ADMIN/MANAGER)
 *  - Operação: /kitchen (KITCHEN/ADMIN/MANAGER) e /waiter (WAITER/ADMIN/MANAGER)
 *  - Dev:     /dev/design-system (showcase dos tokens/componentes)
 *
 * Papéis permitidos por área (espelha o authorize do backend):
 *  - Admin/Manager gerenciam tudo;
 *  - Waiter não acessa /admin (é redirecionado a /waiter pelo ProtectedRoute);
 *  - Kitchen não acessa /admin nem /waiter.
 */
const ADMIN_ROLES = ['ADMIN', 'MANAGER'] as const;
const OPERATION_ROLES = ['ADMIN', 'MANAGER'] as const;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/menu/balneario-demo" replace />} />

      {/* Autenticação */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Experiência do cliente (pública) */}
      <Route element={<PublicLayout />}>
        <Route path="/menu/:establishmentSlug" element={<MenuPage />} />
        <Route path="/table/:token" element={<MenuPage />} />
      </Route>

      {/* Painel administrativo — ADMIN/MANAGER */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="areas" element={<AdminAreasPage />} />
        <Route path="tables" element={<AdminTablesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        {/* Equipe: ADMIN gerencia tudo; MANAGER gere apenas WAITER/KITCHEN
            (o serviço do backend bloqueia gestores com 403 — FASE 24). */}
        <Route
          path="team"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <AdminTeamPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Operação */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['KITCHEN', ...OPERATION_ROLES]}>
            <KitchenLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<KitchenPage />} />
      </Route>
      <Route
        path="/waiter"
        element={
          <ProtectedRoute allowedRoles={['WAITER', ...OPERATION_ROLES]}>
            <WaiterLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<WaiterPage />} />
      </Route>

      {/* Showcase do design system (desenvolvimento) */}
      <Route path="/dev/design-system" element={<DesignSystemPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
