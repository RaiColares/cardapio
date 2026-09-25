import { Outlet } from 'react-router-dom';

/**
 * Shell da experiência do cliente (mobile-first).
 * Largura máxima de cardápio + seguro de área de notches.
 * O cabeçalho do estabelecimento é renderizado pelas páginas,
 * pois conhecem os dados do contexto (rota qr/estabelecimento).
 */
export function PublicLayout() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-sand-50 pb-[env(safe-area-inset-bottom)]">
      <Outlet />
    </div>
  );
}
