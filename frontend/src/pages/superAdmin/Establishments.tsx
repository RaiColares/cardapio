import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, KeyRound, MailPlus, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Input } from '../../components/ui/Input.js';
import { Loading } from '../../components/ui/Loading.js';
import { Modal } from '../../components/ui/Modal.js';
import { Switch } from '../../components/ui/Switch.js';
import { Table, TBody, TD, THead, TH, TRow } from '../../components/ui/Table.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import {
  authorizeClientEmail,
  deleteEstablishment,
  listEstablishments,
  updateClientPassword,
  updateClientStatus,
} from '../../services/superAdmin.js';
import { useAuthStore } from '../../stores/authStore.js';
import type { PlatformClient } from '../../types/domain.js';

/**
 * Política de senha espelhada do backend (FASE 25/27): mínimo 6, máximo
 * 128. O backend revalida com o mesmo schema — o frontend apenas antecipa
 * o erro de UX, nunca decide a regra.
 */
const passwordSchema = z.object({
  password: z
    .string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const emptyForm: PasswordFormValues = { password: '' };

/**
 * Validação do e-mail a ser autorizado — espelha o `emailSchema`
 * compartilhado do backend (trim + minúsculas + formato + max 255). O
 * backend é a autoridade: normalização idêntica garante que o e-mail
 * autorizado nunca exista em caixa diferente.
 */
const authorizeEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .max(255, 'E-mail muito longo.'),
});

type AuthorizeEmailFormValues = z.infer<typeof authorizeEmailSchema>;

const emptyAuthorizeForm: AuthorizeEmailFormValues = { email: '' };

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateFormat.format(date);
}

/**
 * Painel "Clientes" da plataforma (FASE 27) — exclusivo SUPER_ADMIN.
 *
 * Consome GET /admin/establishments (escopo global, sem tenant) e exibe a
 * base de clientes cadastrados. Ações: "Autorizar e-mail" (POST
 * /admin/authorized-emails — habilita o onboarding de um e-mail sem conta),
 * switch de status (PATCH /admin/establishments/:id/status — suspende/
 * reativa o cliente pelo interruptor operacional `isActive`, com atualização
 * otimista da listagem), "Alterar senha" (PATCH /admin/establishments/:id/
 * password — redefine a credencial do usuário proprietário ADMIN) e
 * "Excluir" (DELETE /admin/establishments/:id — exclusão DEFINITIVA, com
 * confirmação explícita em modal). O estabelecimento do próprio SUPER_ADMIN
 * não pode ser excluído (anti-lockout): o botão fica desabilitado.
 * Todos os estados assíncronos são tratados: loading, sucesso, erro e vazio.
 */
export function PlatformEstablishmentsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentEstablishmentId = useAuthStore((s) => s.user?.establishmentId);
  const [passwordTarget, setPasswordTarget] = useState<PlatformClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformClient | null>(null);
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  // Listagem dos clientes (o token SUPER_ADMIN é injetado pelo interceptor).
  const establishmentsQuery = useQuery({
    queryKey: ['admin', 'establishments'],
    queryFn: listEstablishments,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: emptyForm,
  });

  // Campo limpo a cada abertura (ou troca de cliente no modal).
  useEffect(() => {
    if (passwordTarget) {
      reset(emptyForm);
    }
  }, [passwordTarget, reset]);

  const {
    register: registerAuthorize,
    handleSubmit: handleAuthorizeSubmit,
    reset: resetAuthorizeEmail,
    formState: { errors: authorizeEmailErrors },
  } = useForm<AuthorizeEmailFormValues>({
    resolver: zodResolver(authorizeEmailSchema),
    defaultValues: emptyAuthorizeForm,
  });

  // Campo limpo a cada abertura do modal de autorização.
  useEffect(() => {
    if (authorizeOpen) {
      resetAuthorizeEmail(emptyAuthorizeForm);
    }
  }, [authorizeOpen, resetAuthorizeEmail]);

  const resetPasswordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) => {
      if (!passwordTarget) {
        return Promise.reject(new Error('Cliente não selecionado.'));
      }
      return updateClientPassword(passwordTarget.id, values.password);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'establishments'] });
      showToast('success', result.message ?? 'Senha do cliente atualizada.');
      setPasswordTarget(null);
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível alterar a senha.',
      );
    },
  });

  const saving = resetPasswordMutation.isPending;

  // POST /admin/authorized-emails — autoriza um e-mail para o onboarding.
  const authorizeMutation = useMutation({
    mutationFn: (values: AuthorizeEmailFormValues) => authorizeClientEmail(values.email),
    onSuccess: (result) => {
      // A autorização não altera a listagem, mas o cache é invalidado para
      // manter a página consistente após a ação.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'establishments'] });
      showToast('success', result.message ?? 'E-mail autorizado para cadastro.');
      setAuthorizeOpen(false);
    },
    onError: (error: unknown) => {
      // 409 EMAIL_ALREADY_AUTHORIZED chega aqui com a mensagem do backend.
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível autorizar o e-mail.',
      );
    },
  });

  const authorizing = authorizeMutation.isPending;

  // PATCH /admin/establishments/:id/status — suspensão/reativação (isActive).
  // Atualização otimista do cache + rollback no erro; o switch é desabilitado
  // durante a requisição e a query é invalidada ao concluir.
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateClientStatus(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'establishments'] });
      const previous = queryClient.getQueryData<PlatformClient[]>([
        'admin',
        'establishments',
      ]);
      queryClient.setQueryData<PlatformClient[]>(
        ['admin', 'establishments'],
        (current) =>
          current?.map((client) => (client.id === id ? { ...client, isActive } : client)),
      );
      setStatusLoadingId(id);
      return { previous };
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData<PlatformClient[]>(
          ['admin', 'establishments'],
          context.previous,
        );
      }
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível atualizar o status.',
      );
    },
    onSuccess: (result) => {
      showToast('success', result.message ?? 'Status do cliente atualizado.');
    },
    onSettled: () => {
      setStatusLoadingId(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'establishments'] });
    },
  });

  // DELETE /admin/establishments/:id — exclusão DEFINITIVA do cliente.
  // Disparado apenas por confirmação explícita no modal; ao concluir,
  // invalida a listagem (a linha some) e exibe o feedback.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEstablishment(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'establishments'] });
      showToast('success', result.message ?? 'Cliente excluído definitivamente.');
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      // 409 CANNOT_DELETE_OWN_ESTABLISHMENT e demais erros chegam com a
      // mensagem do backend (o modal permanece aberto para nova tentativa).
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível excluir o cliente.',
      );
    },
  });

  const deleting = deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Clientes</h1>
          <p className="mt-1 text-sm text-stone-500">
            Estabelecimentos cadastrados na plataforma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {establishmentsQuery.isSuccess && (
            <p className="text-sm font-medium text-stone-500">
              <span className="font-semibold text-stone-900">
                {establishmentsQuery.data.length}
              </span>{' '}
              cliente{establishmentsQuery.data.length === 1 ? '' : 's'}
            </p>
          )}
          <Button
            variant="primary"
            title="Autorizar um e-mail a concluir o cadastro na plataforma"
            onClick={() => setAuthorizeOpen(true)}
          >
            <MailPlus className="size-4" aria-hidden="true" />
            Autorizar e-mail
          </Button>
        </div>
      </div>

      {establishmentsQuery.isLoading && <Loading label="Carregando clientes…" />}

      {establishmentsQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar os clientes">
          {establishmentsQuery.error instanceof Error
            ? establishmentsQuery.error.message
            : 'Erro inesperado.'}
        </Alert>
      )}

      {establishmentsQuery.isSuccess && establishmentsQuery.data.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={Building2}
            title="Nenhum cliente cadastrado"
            description="Os estabelecimentos autorizados aparecerão aqui assim que concluírem o onboarding."
          />
        </Card>
      )}

      {establishmentsQuery.isSuccess && establishmentsQuery.data.length > 0 && (
        <Card padded={false}>
          <Table>
            <THead>
              <tr>
                <TH>Cliente</TH>
                <TH>Proprietário</TH>
                <TH>Status</TH>
                <TH>Cadastrado em</TH>
                <TH className="text-right">Ações</TH>
              </tr>
            </THead>
            <TBody>
              {establishmentsQuery.data.map((client) => (
                <TRow key={client.id}>
                  <TD>
                    <div className="flex flex-col">
                      <span className="font-semibold text-stone-900">{client.name}</span>
                      <span className="text-xs text-stone-500">/{client.slug}</span>
                    </div>
                  </TD>
                  <TD>
                    <span className="text-xs text-stone-600">
                      {client.ownerEmail ?? '—'}
                    </span>
                  </TD>
                  <TD>
                    {client.status === 'INACTIVE' ? (
                      // Cadastro desativado: o login já é bloqueado pelo
                      // status, independente do interruptor operacional.
                      <Badge variant="danger">Cadastro inativo</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={client.isActive}
                          disabled={statusLoadingId !== null}
                          aria-label={`${client.isActive ? 'Suspender' : 'Reativar'} ${client.name}`}
                          onChange={(checked) =>
                            statusMutation.mutate({ id: client.id, isActive: checked })
                          }
                        />
                        <span
                          className={
                            client.isActive
                              ? 'whitespace-nowrap text-sm font-medium text-stone-700'
                              : 'whitespace-nowrap text-sm font-medium text-stone-500'
                          }
                        >
                          {client.isActive ? 'Ativo' : 'Suspenso'}
                        </span>
                      </div>
                    )}
                  </TD>
                  <TD>
                    <span className="whitespace-nowrap text-xs text-stone-600">
                      {formatDate(client.createdAt)}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={`Alterar senha de ${client.name}`}
                        aria-label={`Alterar senha de ${client.name}`}
                        onClick={() => setPasswordTarget(client)}
                      >
                        <KeyRound className="size-4" aria-hidden="true" />
                        Alterar senha
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={
                          client.id === currentEstablishmentId
                            ? 'Não é possível excluir o estabelecimento da sua própria conta.'
                            : `Excluir ${client.name}`
                        }
                        aria-label={
                          client.id === currentEstablishmentId
                            ? 'Excluir indisponível para o próprio estabelecimento'
                            : `Excluir ${client.name}`
                        }
                        disabled={client.id === currentEstablishmentId || deleting}
                        onClick={() => setDeleteTarget(client)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Excluir
                      </Button>
                    </div>
                  </TD>
                </TRow>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {/* Modal Alterar Senha (PATCH /admin/establishments/:id/password) */}
      <Modal
        open={passwordTarget !== null}
        onClose={() => {
          if (!saving) {
            setPasswordTarget(null);
          }
        }}
        title="Alterar senha"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setPasswordTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              loading={saving}
              onClick={() => void handleSubmit((values) => resetPasswordMutation.mutate(values))()}
            >
              Alterar senha
            </Button>
          </div>
        }
      >
        {passwordTarget && (
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-sand-50 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white">
                <Building2 className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {passwordTarget.name}
                </p>
                <p className="truncate text-xs text-stone-500">
                  {passwordTarget.ownerEmail ?? 'Sem proprietário associado'} · /
                  {passwordTarget.slug}
                </p>
              </div>
            </div>

            <Alert variant="warning">
              <p className="text-sm">
                A senha do usuário proprietário (Administrador) deste cliente será
                redefinida imediatamente.
              </p>
            </Alert>

            <Input
              id="new-password"
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 6 caracteres"
              hint="Mínimo de 6 e máximo de 128 caracteres."
              error={errors.password?.message}
              disabled={saving}
              autoFocus
              {...register('password')}
            />
          </form>
        )}
      </Modal>

      {/* Modal Autorizar E-mail (POST /admin/authorized-emails) */}
      <Modal
        open={authorizeOpen}
        onClose={() => {
          if (!authorizing) {
            setAuthorizeOpen(false);
          }
        }}
        title="Autorizar e-mail"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={authorizing}
              onClick={() => setAuthorizeOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              loading={authorizing}
              onClick={() =>
                void handleAuthorizeSubmit((values) => authorizeMutation.mutate(values))()
              }
            >
              Autorizar
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Alert variant="info">
            <p className="text-sm">
              O e-mail autorizado poderá concluir o cadastro (onboarding) na plataforma.
              A autorização é consumida assim que o cadastro é concluído — e-mails já
              autorizados não podem ser duplicados.
            </p>
          </Alert>

          <Input
            id="authorize-email"
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="contato@estabelecimento.com.br"
            hint="E-mails de clientes em potencial que ainda não têm conta."
            error={authorizeEmailErrors.email?.message}
            disabled={authorizing}
            autoFocus
            {...registerAuthorize('email')}
          />
        </form>
      </Modal>

      {/* Modal Excluir (DELETE /admin/establishments/:id) — confirmação
          explícita antes de disparar a exclusão definitiva. O botão de
          confirmação é o segundo clique deliberado (diferente do clique que
          abriu o modal). */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        title="Excluir cliente"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir definitivamente
            </Button>
          </div>
        }
      >
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-sand-50 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                <Trash2 className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {deleteTarget.name}
                </p>
                <p className="truncate text-xs text-stone-500">
                  {deleteTarget.ownerEmail ?? 'Sem proprietário associado'} · /
                  {deleteTarget.slug}
                </p>
              </div>
            </div>

            <Alert variant="danger" title="Esta ação é irreversível">
              <p className="text-sm">
                Todos os dados deste cliente serão removidos permanentemente:
                usuários, catálogo, mesas, comandas, pedidos e pagamentos. Não há
                como desfazer.
              </p>
            </Alert>
          </div>
        )}
      </Modal>
    </div>
  );
}