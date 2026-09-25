import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Waves } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '../components/ui/Alert.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { api, ApiError } from '../services/api.js';
import { homeForRole, useAuthStore } from '../stores/authStore.js';
import type { AuthUser } from '../types/domain.js';

/**
 * Validação idêntica à do backend (loginSchema):
 * e-mail válido e senha com mínimo de 8 caracteres.
 */
const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail.')
    .email('E-mail inválido.')
    .max(255, 'E-mail muito longo.'),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface LocationState {
  from?: { pathname?: string };
}

/**
 * Página de autenticação (mobile-first, mas com layout centralizado
 * que funciona bem em desktop).
 *
 * Fluxo: RHF + Zod validam no cliente; a mutation chama POST /auth/login;
 * em sucesso popula a store (persist em localStorage) e redireciona
 * para a home do papel. A senha do seed é admin@balneario.dev / admin12345.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginFormValues) =>
      api
        .post<{ success: true; data: LoginResponse }>('/auth/login', credentials)
        .then((response) => response.data.data),
    onSuccess: (data) => {
      setSession({ token: data.token, user: data.user });
      const from = (location.state as LocationState | null)?.from?.pathname;
      navigate(from ?? homeForRole(data.user.role), { replace: true });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Não foi possível entrar. Tente novamente.');
      }
    },
  });

  if (isAuthenticated) {
    const role = useAuthStore.getState().role;
    return <Navigate to={homeForRole(role)} replace />;
  }

  const onSubmit = (values: LoginFormValues) => {
    setServerError(null);
    loginMutation.mutate(values);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sand-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-700 text-white">
            <Waves className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Acesso à plataforma</h1>
          <p className="mt-1 text-sm text-stone-500">
            Painel de administração e operação do balneário.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="rounded-3xl border border-stone-200 bg-white p-6 shadow-pop"
        >
          <div className="flex flex-col gap-4">
            <Input
              id="login-email"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@balneario.dev"
              error={errors.email?.message}
              disabled={loginMutation.isPending}
              {...register('email')}
            />

            <Input
              id="login-password"
              label="Senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              disabled={loginMutation.isPending}
              {...register('password')}
            />

            {serverError && <Alert variant="danger">{serverError}</Alert>}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Ainda não tem um restaurante?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary-700 hover:text-primary-600 hover:underline"
          >
            Criar conta
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-stone-400">
          O acesso é restrito aos usuários cadastrados do estabelecimento.
        </p>
      </div>
    </div>
  );
}
