import { SessionSync } from './components/SessionSync.js';
import { ToastProvider } from './components/ui/Toast.js';
import { AppRoutes } from './routes/index.js';

/**
 * Composição raiz da SPA.
 * ToastProvider é estado local de UI (regras: estado local para interações).
 * SessionSync repõe o branding do estabelecimento a partir de GET /auth/me.
 */
export function App() {
  return (
    <ToastProvider>
      <SessionSync />
      <AppRoutes />
    </ToastProvider>
  );
}
