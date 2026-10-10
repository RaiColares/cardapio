import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Waves } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import { registerEstablishment } from '../../services/establishments.js';
import { homeForRole, useAuthStore } from '../../stores/authStore.js';

/**
 * Validação espelha estritamente o registerSchema do backend (FASE 25):
 * - establishmentName: 2..150 caracteres
 * - slug: minúsculo, 3..120, apenas letras/números/hífens entre segmentos
 * - ownerName: 2..150 caracteres
 * - email: e-mail válido, em minúsculas, máx. 255
 * - password: 6..128 (mínimo de 6 do contrato SaaS)
 *
 * O backend permanece a autoridade: conflitos de slug/e-mail viram 400 e
 * são mapeados para o campo correspondente aqui no formulário.
 */
const registerFormSchema = z.object({
  establishmentName: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(150, 'O nome deve ter no máximo 150 caracteres.'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'O slug deve ter no mínimo 3 caracteres.')
    .max(120, 'O slug deve ter no máximo 120 caracteres.')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use apenas letras minúsculas, números e hífens (ex.: balneario-praia-azul).',
    ),
  ownerName: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(150, 'O nome deve ter no máximo 150 caracteres.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .max(255, 'E-mail muito longo.'),
  password: z
    .string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

/**
 * Página de cadastro (onboarding SaaS) — mobile-first, com o mesmo
 * layout centralizado da página de Login.
 *
 * Fluxo: RHF + Zod validam no cliente; a mutation chama POST /auth/register;
 * em sucesso exibe um aviso (toast) e redireciona para /login.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      establishmentName: '',
      slug: '',
      ownerName: '',
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  const registerMutation = useMutation({
    mutationFn: registerEstablishment,
    onSuccess: () => {
      showToast(
        'success',
        'Restaurante criado com sucesso! Faça login para começar a configurar.',
      );
      navigate('/login', { replace: true });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.code === 'SLUG_ALREADY_IN_USE') {
          setError('slug', { message: error.message });
          return;
        }
        if (error.code === 'EMAIL_ALREADY_IN_USE') {
          setError('email', { message: error.message });
          return;
        }
        setServerError(error.message);
        return;
      }
      setServerError('Não foi possível criar o restaurante. Tente novamente.');
    },
  });

  if (isAuthenticated) {
    const role = useAuthStore.getState().role;
    return <Navigate to={homeForRole(role)} replace />;
  }

  const onSubmit = (values: RegisterFormValues): void => {
    setServerError(null);
    registerMutation.mutate(values);
  };

  const isSubmitting = registerMutation.isPending;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sand-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-700 text-white">
            <Waves className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Crie o seu restaurante</h1>
          <p className="mt-1 text-sm text-stone-500">
            O proprietário (admin) e o estabelecimento são criados juntos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="rounded-3xl border border-stone-200 bg-white p-6 shadow-pop"
        >
          <div className="flex flex-col gap-4">
            <Input
              id="register-establishment-name"
              label="Nome do restaurante"
              placeholder="Ex.: Balneário Praia Azul"
              error={errors.establishmentName?.message}
              disabled={isSubmitting}
              autoComplete="organization"
              autoFocus
              {...register('establishmentName')}
            />

            <Input
              id="register-slug"
              label="URL do cardápio (slug)"
              hint="Apenas letras minúsculas, números e hífen — ex.: balneario-praia-azul"
              placeholder="balneario-praia-azul"
              error={errors.slug?.message}
              disabled={isSubmitting}
              autoCapitalize="none"
              autoComplete="off"
              {...register('slug')}
            />

            <Input
              id="register-owner-name"
              label="Nome do proprietário"
              placeholder="Ex.: Carlos Proprietário"
              error={errors.ownerName?.message}
              disabled={isSubmitting}
              autoComplete="name"
              {...register('ownerName')}
            />

            <Input
              id="register-email"
              label="E-mail"
              type="email"
              placeholder="voce@restaurante.com"
              error={errors.email?.message}
              disabled={isSubmitting}
              autoComplete="email"
              {...register('email')}
            />

            <Input
              id="register-password"
              label="Senha"
              hint="Mínimo de 6 caracteres."
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.password?.message}
              disabled={isSubmitting}
              {...register('password')}
            />

            {serverError && <Alert variant="danger">{serverError}</Alert>}

            <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
              {isSubmitting ? 'Criando…' : 'Criar conta'}
            </Button>

            <p className="text-center text-xs text-stone-400">
              Ao criar a conta você concorda que o proprietário terá acesso de administrador.
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Já tem uma conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary-700 hover:text-primary-600 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}