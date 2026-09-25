import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Input } from '../../components/ui/Input.js';
import { Loading } from '../../components/ui/Loading.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Select.js';
import { Switch } from '../../components/ui/Switch.js';
import { Table, TBody, TD, THead, TH, TRow } from '../../components/ui/Table.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import {
  createTeamMember,
  deleteTeamMember,
  listTeamUsers,
  updateTeamMember,
} from '../../services/team.js';
import { useAuthStore } from '../../stores/authStore.js';
import type { TeamRole, TeamUser } from '../../types/domain.js';

/** Roles gerenciáveis — espelha teamRoles do backend (nunca ADMIN). */
const TEAM_ROLES = ['MANAGER', 'WAITER', 'KITCHEN'] as [TeamRole, TeamRole, TeamRole];
const ROLE_LABELS: Record<TeamRole, string> = {
  MANAGER: 'Gerente',
  WAITER: 'Garçom',
  KITCHEN: 'Cozinha',
};

const roleBadgeVariant: Record<TeamUser['role'], 'primary' | 'info' | 'success' | 'warning'> = {
  ADMIN: 'primary',
  MANAGER: 'info',
  WAITER: 'success',
  KITCHEN: 'warning',
};

/**
 * Validação espelha os schemas do backend (create/update): nome 2..150,
 * e-mail válido (minúsculo), role restrita a MANAGER/WAITER/KITCHEN e
 * senha 8..128. No update a senha é opcional: vazia = mantém a atual.
 */
const teamFormSchema = z.object({
  name: z
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
  role: z.enum(TEAM_ROLES),
  phone: z
    .string()
    .trim()
    .max(30, 'O telefone deve ter no máximo 30 caracteres.')
    .optional(),
  password: z
    .string()
    .max(128, 'A senha deve ter no máximo 128 caracteres.')
    .optional()
    .or(z.literal('')),
  active: z.boolean(),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

const emptyForm: TeamFormValues = {
  name: '',
  email: '',
  role: 'WAITER',
  phone: '',
  password: '',
  active: true,
};

/**
 * Gestão da Equipe (somente ADMIN, conforme autorização do backend).
 *
 * Lista GET /users (sempre dentro do tenant), cria/edita via modal e
 * exclui com confirmação. As ações são desabilitadas para a própria linha
 * do usuário logado (id do authStore) e para usuários ADMIN, que o
 * backend protege (CANNOT_MODIFY_ADMIN / CANNOT_DELETE_ADMIN).
 */
export function AdminTeamPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamUser | null>(null);

  const teamQuery = useQuery({ queryKey: ['team-users'], queryFn: listTeamUsers });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: emptyForm,
  });

  const activeValue = watch('active');

  useEffect(() => {
    if (modalMode === 'edit' && editing) {
      reset({
        name: editing.name,
        email: editing.email,
        role: editing.role === 'ADMIN' ? 'WAITER' : editing.role,
        phone: editing.phone ?? '',
        password: '',
        active: editing.active,
      });
      return;
    }
    if (modalMode === 'create') {
      reset(emptyForm);
    }
  }, [modalMode, editing, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: TeamFormValues) => {
      if (modalMode === 'edit' && editing) {
        return updateTeamMember(editing.id, {
          name: values.name,
          email: values.email,
          role: values.role,
          phone: values.phone?.trim() || null,
          active: values.active,
          ...(values.password ? { password: values.password } : {}),
        });
      }
      if (!values.password) {
        // A criação exige dados completos (senha obrigatória no backend).
        setError('password', { message: 'A senha deve ter no mínimo 8 caracteres.' });
        return Promise.reject(new Error('Senha obrigatória'));
      }
      return createTeamMember({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        phone: values.phone?.trim() || null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-users'] });
      showToast(
        'success',
        modalMode === 'edit' ? 'Funcionário atualizado.' : 'Funcionário adicionado.',
      );
      setModalMode(null);
      setEditing(null);
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível salvar o funcionário.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeamMember(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-users'] });
      showToast('success', 'Funcionário removido.');
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      setDeleteTarget(null);
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível remover o funcionário.',
      );
    },
  });

  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  // Bloqueia ações na própria linha (usuário logado) e em usuários ADMIN.
  const isLocked = (user: TeamUser): boolean => user.id === currentUserId || user.role === 'ADMIN';
  const lockReason = (user: TeamUser): string =>
    user.id === currentUserId
      ? 'Você não pode editar ou excluir o próprio usuário.'
      : 'O administrador não pode ser modificado.';

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Equipe</h1>
          <p className="mt-1 text-sm text-stone-500">
            Funcionários com acesso aos painéis do restaurante.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalMode('create');
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo funcionário
        </Button>
      </div>

      {teamQuery.isLoading && <Loading label="Carregando equipe…" />}

      {teamQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar a equipe">
          {teamQuery.error instanceof Error ? teamQuery.error.message : 'Erro inesperado.'}
        </Alert>
      )}

      {teamQuery.isSuccess && teamQuery.data.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={Users}
            title="Nenhum funcionário cadastrado"
            description="Adicione garçons, chefs e gerentes para que eles acessem os painéis."
          >
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setModalMode('create');
              }}
            >
              Adicionar funcionário
            </Button>
          </EmptyState>
        </Card>
      )}

      {teamQuery.isSuccess && teamQuery.data.length > 0 && (
        <Card padded={false}>
          <Table>
            <THead>
              <tr>
                <TH>Funcionário</TH>
                <TH>Papel</TH>
                <TH>Status</TH>
                <TH className="text-right">Ações</TH>
              </tr>
            </THead>
            <TBody>
              {teamQuery.data.map((user) => {
                const locked = isLocked(user);
                const reason = lockReason(user);

                return (
                  <TRow key={user.id}>
                    <TD>
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-stone-900">{user.name}</span>
                          {user.id === currentUserId && <Badge variant="primary">Você</Badge>}
                        </div>
                        <span className="text-xs text-stone-500">{user.email}</span>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={roleBadgeVariant[user.role]}>
                        {user.role === 'ADMIN' ? 'Administrador' : ROLE_LABELS[user.role]}
                      </Badge>
                    </TD>
                    <TD>
                      {user.active ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="neutral">Inativo</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={locked}
                          title={locked ? reason : `Editar ${user.name}`}
                          aria-label={locked ? reason : `Editar ${user.name}`}
                          onClick={() => {
                            setEditing(user);
                            setModalMode('edit');
                          }}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={locked || deleting}
                          title={locked ? reason : `Excluir ${user.name}`}
                          aria-label={locked ? reason : `Excluir ${user.name}`}
                          onClick={() => setDeleteTarget(user)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TD>
                  </TRow>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}

      {/* Modal de criação/edição */}
      <Modal
        open={modalMode !== null}
        onClose={() => {
          if (!saving) {
            setModalMode(null);
            setEditing(null);
          }
        }}
        title={modalMode === 'edit' ? 'Editar funcionário' : 'Novo funcionário'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setModalMode(null);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void handleSubmit((v) => saveMutation.mutate(v))()}>
              {modalMode === 'edit' ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            id="team-name"
            label="Nome completo"
            placeholder="Ex.: Maria Garçonete"
            error={errors.name?.message}
            disabled={saving}
            autoFocus
            {...register('name')}
          />
          <Input
            id="team-email"
            label="E-mail de acesso"
            type="email"
            autoComplete="off"
            placeholder="maria@restaurante.com"
            error={errors.email?.message}
            disabled={saving}
            {...register('email')}
          />
          <Select
            id="team-role"
            label="Papel"
            options={TEAM_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
            error={errors.role?.message}
            disabled={saving}
            {...register('role')}
          />
          <Input
            id="team-phone"
            label="Telefone"
            placeholder="(00) 99999-9999 (opcional)"
            error={errors.phone?.message}
            disabled={saving}
            inputMode="tel"
            {...register('phone')}
          />
          <Input
            id="team-password"
            label={modalMode === 'edit' ? 'Nova senha' : 'Senha'}
            type="password"
            autoComplete="new-password"
            placeholder={modalMode === 'edit' ? 'Deixe vazio para manter a atual' : 'Mínimo de 8 caracteres'}
            hint={modalMode === 'edit' ? 'Preencha apenas se quiser trocar a senha.' : undefined}
            error={errors.password?.message}
            disabled={saving}
            {...register('password')}
          />

          {modalMode === 'edit' && (
            <div className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-stone-800">Usuário ativo</p>
                <p className="text-xs text-stone-500">Inativos não conseguem acessar os painéis.</p>
              </div>
              <Switch
                checked={activeValue}
                disabled={saving}
                onChange={(checked) => setValue('active', checked, { shouldValidate: true })}
                aria-label="Usuário ativo"
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Confirmação de exclusão */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        title="Excluir funcionário"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </Button>
          </div>
        }
      >
        {deleteTarget && (
          <Alert variant="warning">
            <strong className="font-semibold">{deleteTarget.name}</strong> perderá o acesso aos
            painéis permanentemente.
          </Alert>
        )}
      </Modal>
    </div>
  );
}
