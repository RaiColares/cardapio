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
  /**
   * 'default' = sidebar clara (largura total);
   * 'onDark' = cabeçalhos escuros (Garçom/Cozinha), compacto.
   */
  variant?: 'default' | 'onDark';
}

/**
 * Aparência por contexto. As classes de dimensão/cor ficam aqui (e não no
 * base) para que o variant defina a largura/altura correta sem depender de
 * ordem de regras do Tailwind — `cn` não faz merge de utilitários.
 */
const variantClasses: Record<NonNullable<LogoutButtonProps['variant']>, string> = {
  default: 'h-11 w-full text-stone-600 hover:bg-red-50 hover:text-red-700',
  onDark: 'h-10 w-auto shrink-0 text-white/90 hover:bg-white/10 hover:text-white',
};

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
export function LogoutButton({ className, onLogout, variant = 'default' }: LogoutButtonProps) {
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
        'flex items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
        variantClasses[variant],
        className,
      )}
    >
      <LogOut className="size-5 shrink-0" aria-hidden="true" />
      Sair
    </button>
  );
}