import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, UserRound, Waves } from 'lucide-react';
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
import { cn } from '../../utils/cn.js';

/**
 * Validação espelha o registerEstablishmentSchema do backend:
 * - name/ownerName: 2..150 caracteres
 * - slug: minúsculo, 3..120, apenas letras/números/hífens entre segmentos
 * - ownerEmail: e-mail válido, em minúsculas, máx. 255
 * - ownerPassword: 8..128 (mínimo do backend) + campo de confirmação (UX local)
 *
 * O backend permanece a autoridade: conflitos de slug/e-mail viram 409
 * e são mapeados para o campo correspondente aqui no formulário.
 */
const registerFormSchema = z.object({
  name: z
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
  ownerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .max(255, 'E-mail muito longo.'),
  ownerPassword: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
  confirmPassword: z.string().min(1, 'Confirme a senha.'),
}).refine((values) => values.ownerPassword === values.confirmPassword, {
  message: 'As senhas não conferem.',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

type RegisterStep = 'restaurant' | 'owner';

const STEP_LABELS: Record<RegisterStep, string> = {
  restaurant: 'Dados do restaurante',
  owner: 'Dados do dono',
};

/**
 * Onboarding público (SaaS): cria o estabelecimento em 2 blocos.
 *
 * Fluxo: preenche os dados do restaurante -> avança (valida os 2 campos) ->
 * preenche os dados do dono -> envia POST /establishments/register.
 * Em sucesso (201): Toast amigável e redirecionamento para /login.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { showToast } = useToast();

  const [step, setStep] = useState<RegisterStep>('restaurant');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      ownerName: '',
      ownerEmail: '',
      ownerPassword: '',
      confirmPassword: '',
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
          setStep('restaurant');
          return;
        }
        if (error.code === 'EMAIL_ALREADY_IN_USE') {
          setError('ownerEmail', { message: error.message });
          return;
        }
        setServerError(error.message);
        return;
      }
      setServerError('Não foi possível criar o restaurante. Tente novamente.');
    },
  });

  const advanceToOwner = async (): Promise<void> => {
    setServerError(null);
    const valid = await trigger(['name', 'slug']);
    if (valid) {
      setStep('owner');
    }
  };

  const goBackToRestaurant = (): void => {
    setServerError(null);
    setStep('restaurant');
  };

  const onSubmit = (values: RegisterFormValues): void => {
    setServerError(null);
    registerMutation.mutate({
      name: values.name,
      slug: values.slug,
      ownerName: values.ownerName,
      ownerEmail: values.ownerEmail,
      ownerPassword: values.ownerPassword,
    });
  };

  if (isAuthenticated) {
    const role = useAuthStore.getState().role;
    return <Navigate to={homeForRole(role)} replace />;
  }

  const isSubmitting = registerMutation.isPending;

  return (
    <div className="flex min-h-dvh justify-center bg-sand-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-700 text-white">
            <Waves className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Crie o seu restaurante</h1>
          <p className="mt-1 text-sm text-stone-500">
            O proprietário (admin) e o estabelecimento são criados juntos.
          </p>
        </div>

        {/* Indicador de progresso do onboarding */}
        <ol className="mb-6 flex items-center gap-2" aria-label="Etapas do cadastro">
          {(['restaurant', 'owner'] as const).map((item, index) => {
            const StepIcon = item === 'restaurant' ? Building2 : UserRound;
            const isCurrent = step === item;
            // Com apenas 2 etapas, "concluída" só se aplica à primeira
            // enquanto o usuário está na segunda.
            const isDone = item === 'restaurant' && step === 'owner';
            const isLast = index === 1;

            return (
              <li key={item} className={cn('flex items-center gap-2', !isLast && 'flex-1')}>
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
                    isCurrent
                      ? 'bg-primary-700 text-white'
                      : isDone
                        ? 'bg-green-100 text-green-800'
                        : 'bg-stone-200 text-stone-500',
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <StepIcon className="size-4" aria-hidden="true" />
                  )}
                  {STEP_LABELS[item]}
                </span>
                {!isLast && <span className="h-px flex-1 bg-stone-300" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="rounded-3xl border border-stone-200 bg-white p-6 shadow-pop"
        >
          {step === 'restaurant' ? (
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <legend className="sr-only">Dados do restaurante</legend>
              <Input
                id="register-name"
                label="Nome do restaurante"
                placeholder="Ex.: Balneário Praia Azul"
                error={errors.name?.message}
                disabled={isSubmitting}
                autoComplete="organization"
                autoFocus
                {...register('name')}
              />
              <Input
                id="register-slug"
                label="Endereço do cardápio"
                hint="Link público do menu — ex.: http://app.local/menu/balneario-praia-azul"
                placeholder="balneario-praia-azul"
                error={errors.slug?.message}
                disabled={isSubmitting}
                autoCapitalize="none"
                autoComplete="off"
                {...register('slug')}
              />
              {serverError && <Alert variant="danger">{serverError}</Alert>}
              <Button
                type="button"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                onClick={() => void advanceToOwner()}
              >
                Continuar
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </fieldset>
          ) : (
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <legend className="sr-only">Dados do dono</legend>
              <Input
                id="register-owner-name"
                label="Seu nome"
                placeholder="Ex.: Carlos Proprietário"
                error={errors.ownerName?.message}
                disabled={isSubmitting}
                autoComplete="name"
                autoFocus
                {...register('ownerName')}
              />
              <Input
                id="register-owner-email"
                label="E-mail de acesso"
                placeholder="voce@restaurante.com"
                error={errors.ownerEmail?.message}
                disabled={isSubmitting}
                autoComplete="email"
                type="email"
                {...register('ownerEmail')}
              />
              <Input
                id="register-owner-password"
                label="Senha"
                hint="Mínimo de 8 caracteres."
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                error={errors.ownerPassword?.message}
                disabled={isSubmitting}
                {...register('ownerPassword')}
              />
              <Input
                id="register-confirm-password"
                label="Confirmar senha"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                disabled={isSubmitting}
                {...register('confirmPassword')}
              />
              {serverError && <Alert variant="danger">{serverError}</Alert>}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={goBackToRestaurant}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Voltar
                </Button>
                <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
                  {isSubmitting ? 'Criando…' : 'Criar conta'}
                </Button>
              </div>
              <p className="text-center text-xs text-stone-400">
                Ao criar a conta você concorda que o proprietário terá acesso de administrador.
              </p>
            </fieldset>
          )}
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
