import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Switch } from '../../components/ui/Switch.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import { createArea, deleteArea, listAreas, updateArea } from '../../services/physical.js';
import type { AreaPayload } from '../../services/physical.js';
import type { ApiArea } from '../../types/domain.js';

/**
 * Validação espelha o createAreaSchema do backend:
 * nome 2..100 e descrição <=255 (opcional).
 */
const areaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  description: z.string().trim().max(255, 'Máximo de 255 caracteres.').optional(),
  active: z.boolean(),
});

type AreaFormValues = z.infer<typeof areaFormSchema>;

function toPayload(values: AreaFormValues): AreaPayload {
  return {
    name: values.name,
    description: values.description?.trim() || null,
    active: values.active,
  };
}

const emptyForm: AreaFormValues = { name: '', description: '', active: true };

/**
 * Gestão de Áreas (ADMIN/MANAGER).
 * Áreas agrupam as mesas (ex.: Piscina, Restaurante, Quiosque).
 * Exclusão de área com mesas é rejeitada pelo backend
 * (AREA_HAS_TABLES) e vira Toast amigável aqui.
 */
export function AdminAreasPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ApiArea | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiArea | null>(null);

  const areasQuery = useQuery({ queryKey: ['areas'], queryFn: listAreas });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: emptyForm,
  });

  const activeValue = watch('active');

  useEffect(() => {
    if (modalMode === 'edit' && editing) {
      reset({ name: editing.name, description: editing.description ?? '', active: editing.active });
      return;
    }
    if (modalMode === 'create') {
      reset(emptyForm);
    }
  }, [modalMode, editing, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: AreaFormValues) => {
      const payload = toPayload(values);
      return modalMode === 'edit' && editing
        ? updateArea(editing.id, payload)
        : createArea(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['areas'] });
      showToast('success', modalMode === 'edit' ? 'Área atualizada.' : 'Área criada.');
      setModalMode(null);
      setEditing(null);
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível salvar a área.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArea(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['areas'] });
      showToast('success', 'Área excluída.');
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      setDeleteTarget(null);
      if (error instanceof ApiError && error.code === 'AREA_HAS_TABLES') {
        showToast(
          'error',
          'Não é possível excluir a área: existem mesas vinculadas a ela. Mova ou remova as mesas antes.',
        );
        return;
      }
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível excluir a área.',
      );
    },
  });

  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Áreas</h1>
          <p className="mt-1 text-sm text-stone-500">
            Regiões do espaço físico que agrupam as mesas.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalMode('create');
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova área
        </Button>
      </div>

      {areasQuery.isLoading && <Loading label="Carregando áreas…" />}

      {areasQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar as áreas">
          {areasQuery.error instanceof Error ? areasQuery.error.message : 'Erro inesperado.'}
        </Alert>
      )}

      {areasQuery.isSuccess && areasQuery.data.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={MapPin}
            title="Nenhuma área cadastrada"
            description="Crie áreas como Piscina, Salão ou Quiosque para organizar as mesas."
          >
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setModalMode('create');
              }}
            >
              Criar área
            </Button>
          </EmptyState>
        </Card>
      )}

      {areasQuery.isSuccess && areasQuery.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {areasQuery.data.map((area) => (
            <Card key={area.id} className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-stone-500">
                <MapPin className="size-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-stone-900">{area.name}</h2>
                  {!area.active && <Badge variant="neutral">Inativa</Badge>}
                  <Badge variant="outline">
                    {area._count?.tables ?? 0} {(area._count?.tables ?? 0) === 1 ? 'mesa' : 'mesas'}
                  </Badge>
                </div>
                {area.description && (
                  <p className="mt-0.5 truncate text-sm text-stone-500">{area.description}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${area.name}`}
                  onClick={() => {
                    setEditing(area);
                    setModalMode('edit');
                  }}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Excluir ${area.name}`}
                  disabled={deleting}
                  onClick={() => setDeleteTarget(area)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
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
        title={modalMode === 'edit' ? 'Editar área' : 'Nova área'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (!saving) {
                  setModalMode(null);
                  setEditing(null);
                }
              }}
            >
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void handleSubmit((v) => saveMutation.mutate(v))()}>
              {modalMode === 'edit' ? 'Salvar alterações' : 'Criar área'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            id="area-name"
            label="Nome"
            placeholder="Ex.: Piscina"
            error={errors.name?.message}
            disabled={saving}
            autoFocus
            {...register('name')}
          />
          <Input
            id="area-description"
            label="Descrição"
            placeholder="Ex.: Mesas ao redor da piscina (opcional)"
            error={errors.description?.message}
            disabled={saving}
            {...register('description')}
          />

          <div className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-stone-800">Área ativa</p>
              <p className="text-xs text-stone-500">Áreas inativas ocultam as mesas na operação.</p>
            </div>
            <Switch
              checked={activeValue}
              onChange={(checked) => setValue('active', checked, { shouldValidate: true })}
              disabled={saving}
              aria-label="Área ativa"
            />
          </div>
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
        title="Excluir área"
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
            A área <strong className="font-semibold">{deleteTarget.name}</strong> será removida
            permanentemente. Áreas com mesas vinculadas não podem ser excluídas.
          </Alert>
        )}
      </Modal>
    </div>
  );
}
