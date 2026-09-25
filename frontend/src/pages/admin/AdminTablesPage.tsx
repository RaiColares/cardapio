import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, QrCode, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
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
import { TableStatusBadge } from '../../components/ui/StatusBadge.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import {
  createTable,
  deleteTable,
  listAreas,
  listTables,
  updateTable,
} from '../../services/physical.js';
import type { TablePayload } from '../../services/physical.js';
import type { ApiArea, ApiTable } from '../../types/domain.js';

/**
 * Validação espelha o createTableSchema do backend:
 * number (obrigatório, <=20, não negativo), name (<=50),
 * capacity (int 1..100) e areaId (uuid).
 */
const tableFormSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, 'O número da mesa é obrigatório.')
    .max(20, 'Máximo de 20 caracteres.')
    .refine((value) => !/^-\d+$/.test(value), 'O número não pode ser negativo.'),
  name: z.string().trim().max(50, 'Máximo de 50 caracteres.').optional(),
  capacity: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Informe um número inteiro.')
    .refine((value) => Number(value) >= 1, 'A capacidade deve ser no mínimo 1.')
    .refine((value) => Number(value) <= 100, 'A capacidade deve ser no máximo 100.'),
  areaId: z.string().uuid('Selecione uma área.'),
  active: z.boolean(),
});

type TableFormValues = z.infer<typeof tableFormSchema>;

function toPayload(values: TableFormValues): TablePayload {
  return {
    number: values.number,
    name: values.name?.trim() || null,
    capacity: Number(values.capacity),
    areaId: values.areaId,
    active: values.active,
  };
}

function emptyForm(): TableFormValues {
  return { number: '', name: '', capacity: '1', areaId: '', active: true };
}

/**
 * Gestão de Mesas (ADMIN/MANAGER).
 * - Listagem: número, capacidade, área e status atual.
 * - Form de criação/edição com select de áreas cadastradas.
 * - "Ver QR Code": modal com o QR gerado apontando para
 *   `${window.location.origin}/table/${qrCode}` (rota pública) + imprimir.
 * Após mutações: invalidateQueries(['tables']) (e ['areas'] p/ contagem).
 */
export function AdminTablesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ApiTable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiTable | null>(null);
  const [qrTarget, setQrTarget] = useState<ApiTable | null>(null);

  const tablesQuery = useQuery({ queryKey: ['tables'], queryFn: listTables });
  const areasQuery = useQuery({ queryKey: ['areas'], queryFn: listAreas });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: emptyForm(),
  });

  const activeValue = watch('active');

  useEffect(() => {
    if (modalMode === 'edit' && editing) {
      reset({
        number: editing.number,
        name: editing.name ?? '',
        capacity: String(editing.capacity),
        areaId: editing.areaId,
        active: editing.active,
      });
      return;
    }
    if (modalMode === 'create') {
      reset(emptyForm());
    }
  }, [modalMode, editing, reset]);

  const areaOptions = (() => {
    const options: { value: string; label: string }[] = [
      { value: '', label: 'Selecione a área…' },
      ...(areasQuery.data ?? []).map((area: ApiArea) => ({
        value: area.id,
        label: area.active ? area.name : `${area.name} (inativa)`,
      })),
    ];
    return options;
  })();

  const saveMutation = useMutation({
    mutationFn: (values: TableFormValues) => {
      const payload = toPayload(values);
      return modalMode === 'edit' && editing
        ? updateTable(editing.id, payload)
        : createTable(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
      void queryClient.invalidateQueries({ queryKey: ['areas'] });
      showToast('success', modalMode === 'edit' ? 'Mesa atualizada.' : 'Mesa criada.');
      setModalMode(null);
      setEditing(null);
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível salvar a mesa.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
      void queryClient.invalidateQueries({ queryKey: ['areas'] });
      showToast('success', 'Mesa excluída.');
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      setDeleteTarget(null);
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível excluir a mesa.',
      );
    },
  });

  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Mesas</h1>
          <p className="mt-1 text-sm text-stone-500">
            Disposição física, capacidade e QR Codes do balneário.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalMode('create');
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova mesa
        </Button>
      </div>

      {tablesQuery.isLoading && <Loading label="Carregando mesas…" />}

      {tablesQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar as mesas">
          {tablesQuery.error instanceof Error ? tablesQuery.error.message : 'Erro inesperado.'}
        </Alert>
      )}

      {tablesQuery.isSuccess && tablesQuery.data.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={UtensilsCrossed}
            title="Nenhuma mesa cadastrada"
            description="Cadastre a primeira mesa e gere o QR Code de acesso ao cardápio."
          >
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setModalMode('create');
              }}
            >
              Criar mesa
            </Button>
          </EmptyState>
        </Card>
      )}

      {tablesQuery.isSuccess && tablesQuery.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {tablesQuery.data.map((table) => (
            <Card key={table.id} className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-stone-500">
                <UtensilsCrossed className="size-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-stone-900">
                    Mesa {table.number}
                    {table.name && <span className="font-normal text-stone-500"> · {table.name}</span>}
                  </h2>
                  {!table.active && <Badge variant="neutral">Inativa</Badge>}
                  <TableStatusBadge status={table.status} />
                </div>
                <p className="mt-0.5 text-sm text-stone-500">
                  {table.area.name} · {table.capacity}{' '}
                  {table.capacity === 1 ? 'pessoa' : 'pessoas'}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Ver QR Code da mesa ${table.number}`}
                  onClick={() => setQrTarget(table)}
                >
                  <QrCode className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar mesa ${table.number}`}
                  disabled={deleting}
                  onClick={() => {
                    setEditing(table);
                    setModalMode('edit');
                  }}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Excluir mesa ${table.number}`}
                  disabled={deleting}
                  onClick={() => setDeleteTarget(table)}
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
        title={modalMode === 'edit' ? 'Editar mesa' : 'Nova mesa'}
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
              {modalMode === 'edit' ? 'Salvar alterações' : 'Criar mesa'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          {areasQuery.isLoading && <Loading label="Carregando áreas…" />}

          {areasQuery.isSuccess && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="table-number"
                  label="Número"
                  placeholder="Ex.: 12"
                  error={errors.number?.message}
                  disabled={saving}
                  autoFocus
                  {...register('number')}
                />
                <Input
                  id="table-capacity"
                  label="Capacidade"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ex.: 4"
                  error={errors.capacity?.message}
                  disabled={saving}
                  {...register('capacity')}
                />
              </div>
              <Input
                id="table-name"
                label="Nome (opcional)"
                placeholder="Ex.: Mesa da sombra"
                error={errors.name?.message}
                disabled={saving}
                {...register('name')}
              />
              <Select
                id="table-area"
                label="Área"
                options={areaOptions}
                error={errors.areaId?.message}
                disabled={saving}
                {...register('areaId')}
              />

              <div className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Mesa ativa</p>
                  <p className="text-xs text-stone-500">Inativa não pode receber pedidos.</p>
                </div>
                <Switch
                  checked={activeValue}
                  onChange={(checked) => setValue('active', checked, { shouldValidate: true })}
                  disabled={saving}
                  aria-label="Mesa ativa"
                />
              </div>
            </>
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
        title="Excluir mesa"
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
            A mesa <strong className="font-semibold">{deleteTarget.number}</strong> será removida
            permanentemente.
          </Alert>
        )}
      </Modal>

      {/* Modal do QR Code */}
      <Modal
        open={qrTarget !== null}
        onClose={() => setQrTarget(null)}
        title={qrTarget ? `QR Code — Mesa ${qrTarget.number}` : 'QR Code'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setQrTarget(null)}>
              Fechar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Imprimir
            </Button>
          </div>
        }
      >
        {qrTarget && (
          <div id="print-qr" className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
              <QRCodeSVG
                value={`${window.location.origin}/table/${qrTarget.qrCode}`}
                size={220}
                level="M"
                marginSize={2}
                aria-label={`QR Code da mesa ${qrTarget.number}`}
              />
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-stone-900">
                Mesa {qrTarget.number}
                {qrTarget.name && <span className="font-normal text-stone-500"> · {qrTarget.name}</span>}
              </p>
              <p className="mt-0.5 text-sm text-stone-500">{qrTarget.area.name}</p>
              <p className="mx-auto mt-2 max-w-full break-all rounded-lg bg-sand-100 px-3 py-2 text-xs text-stone-600">
                {`${window.location.origin}/table/${qrTarget.qrCode}`}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
