import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../stores/authStore.js';
import { useBillIntentStore } from '../../stores/billIntentStore.js';
import { cn } from '../../utils/cn.js';

export interface LogoutButtonProps {
  className?: string;
  /** Chamado após encerrar a sessão (ex.: fechar o drawer de navegação). */
  onLogout?: () => void;
}

/**
 * Botão "Sair" — encerra a sessão do painel.
 *
 * Não existe endpoint de logout na API (o JWT é stateless); o encerramento
 * é 100% no cliente e precisa ser COMPLETO, porque os painéis rodam em
 * aparelhos compartilhados (um tablet no salão):
 *
 *  1. `queryClient.clear()` descarta todo o cache do TanStack Query —
 *     sem isso, o próximo usuário a logar no mesmo aparelho veria mesas,
 *     comandas e dados financeiros do estabelecimento anterior;
 *  2. as intenções de pagamento (estado volátil do WS) são descartadas;
 *  3. `logout()` limpa o token/usuário persistidos (o interceptor do axios
 *     deixa de injetar o `Authorization`);
 *  4. redireciona para /login com `replace`, para o botão "voltar" do
 *     navegador não devolver à área protegida já deslogada.
 */
export function LogoutButton({ className, onLogout }: LogoutButtonProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  function handleLogout(): void {
    queryClient.clear();
    useBillIntentStore.setState({ intents: {} });
    logout();
    onLogout?.();
    navigate('/login', { replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-stone-600',
        'transition-colors hover:bg-red-50 hover:text-red-700',
        className,
      )}
    >
      <LogOut className="size-5 shrink-0" aria-hidden="true" />
      Sair
    </button>
  );
}