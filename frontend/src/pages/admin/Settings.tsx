import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Input } from '../../components/ui/Input.js';
import { Loading } from '../../components/ui/Loading.js';
import { Switch } from '../../components/ui/Switch.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import {
  getEstablishmentSettings,
  updateEstablishmentSettings,
} from '../../services/establishments.js';

/**
 * Validação espelha o updateEstablishmentSettingsSchema do backend:
 * - name: 2..150
 * - logoUrl: URL válida (até 500), vazia = remove o logo
 * - serviceFeeRate: 0..100 com no máximo 2 casas decimais
 *
 * O backend é a autoridade; a taxa enviada aqui é apenas persistida.
 */
const settingsFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(150, 'O nome deve ter no máximo 150 caracteres.'),
  logoUrl: z
    .string()
    .trim()
    .max(500, 'URL de imagem muito longa.')
    .refine(
      (value) => value === '' || z.string().url().safeParse(value).success,
      'URL de imagem inválida.',
    ),
  serviceFeeEnabled: z.boolean(),
  serviceFeeRate: z
    .number({ invalid_type_error: 'A taxa de serviço deve ser um número.' })
    .min(0, 'A taxa de serviço não pode ser negativa.')
    .max(100, 'A taxa de serviço deve ser no máximo 100%.')
    .refine((value) => {
      const [, decimals] = String(value).split('.');
      return decimals === undefined || decimals.length <= 2;
    }, 'A taxa de serviço deve ter no máximo 2 casas decimais.'),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

/**
 * Configurações do estabelecimento (ADMIN/MANAGER).
 *
 * Carrega GET /establishments/me, permite editar nome, logo e a taxa de
 * serviço (%). Salva via PUT /establishments/me e invalida a query para
 * que qualquer outra tela reflita os novos valores.
 */
export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const settingsQuery = useQuery({
    queryKey: ['establishment-settings'],
    queryFn: getEstablishmentSettings,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: '',
      logoUrl: '',
      serviceFeeEnabled: false,
      serviceFeeRate: 0,
    },
  });

  const serviceFeeEnabled = watch('serviceFeeEnabled');

  // Popula o formulário assim que os dados carregam / são invalidados.
  useEffect(() => {
    if (settingsQuery.data) {
      reset({
        name: settingsQuery.data.name,
        logoUrl: settingsQuery.data.logoUrl ?? '',
        serviceFeeEnabled: settingsQuery.data.serviceFeeEnabled,
        serviceFeeRate: settingsQuery.data.serviceFeeRate,
      });
    }
  }, [settingsQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      updateEstablishmentSettings({
        name: values.name,
        logoUrl: values.logoUrl.trim() === '' ? null : values.logoUrl.trim(),
        serviceFeeEnabled: values.serviceFeeEnabled,
        serviceFeeRate: values.serviceFeeRate,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['establishment-settings'] });
      showToast('success', 'Configurações salvas.');
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível salvar as configurações.',
      );
    },
  });

  const saving = saveMutation.isPending;

  const onSubmit = (values: SettingsFormValues): void => {
    saveMutation.mutate(values);
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-900">Configurações</h1>
        <p className="mt-1 text-sm text-stone-500">
          Dados públicos e regras de cobrança do estabelecimento.
        </p>
      </div>

      {settingsQuery.isLoading && <Loading label="Carregando configurações…" />}

      {settingsQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar as configurações">
          {settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : 'Erro inesperado.'}
        </Alert>
      )}

      {settingsQuery.isSuccess && (
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sand-100 text-stone-500">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-stone-800">Identificação</p>
            </div>

            <Input
              id="settings-name"
              label="Nome do restaurante"
              error={errors.name?.message}
              disabled={saving}
              {...register('name')}
            />

            <Input
              id="settings-logo-url"
              label="URL do logo"
              hint="Deixe vazio para remover o logo atual."
              placeholder="https://cdn.exemplo.com/logo.png"
              error={errors.logoUrl?.message}
              disabled={saving}
              autoCapitalize="none"
              {...register('logoUrl')}
            />

            <div className="h-px bg-stone-100" aria-hidden="true" />

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Taxa de serviço</p>
                  <p className="text-xs text-stone-500">
                    Percentual aplicado ao total dos pedidos (0–100%).
                  </p>
                </div>
                <Switch
                  checked={serviceFeeEnabled}
                  disabled={saving}
                  aria-label="Habilitar taxa de serviço"
                  onChange={(checked) => {
                    setValue('serviceFeeEnabled', checked, { shouldDirty: true });
                    if (!checked) {
                      setValue('serviceFeeRate', 0, { shouldDirty: true });
                    }
                  }}
                />
              </div>

              <Input
                id="settings-service-fee-rate"
                label="Percentual (%)"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                placeholder="10"
                error={errors.serviceFeeRate?.message}
                disabled={saving}
                readOnly={!serviceFeeEnabled}
                className={!serviceFeeEnabled ? 'opacity-50' : undefined}
                aria-disabled={!serviceFeeEnabled || undefined}
                {...register('serviceFeeRate', { valueAsNumber: true })}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <Button
                type="submit"
                size="lg"
                loading={saving}
                disabled={!isDirty}
                className="min-w-40"
              >
                {!saving && <Save className="size-4" aria-hidden="true" />}
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
