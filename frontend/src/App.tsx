import { ToastProvider } from './components/ui/Toast.js';
import { AppRoutes } from './routes/index.js';

/**
 * Composição raiz da SPA.
 * ToastProvider é estado local de UI (regras: estado local para interações).
 */
export function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
