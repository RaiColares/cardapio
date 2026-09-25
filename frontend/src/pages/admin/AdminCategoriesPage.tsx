import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
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
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../services/catalog.js';
import type { CategoryPayload } from '../../services/catalog.js';
import type { ApiCategory } from '../../types/domain.js';
import { ApiError } from '../../services/api.js';

/**
 * Validação do formulário de categoria — espelha o createCategorySchema
 * do backend (nome 2..100, descrição <=255, ícone <=50, ordem 0..9999).
 */
const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  description: z.string().trim().max(255, 'Máximo de 255 caracteres.').optional(),
  icon: z.string().trim().max(50, 'Máximo de 50 caracteres.').optional(),
  displayOrder: z.coerce
    .number({ message: 'Informe um número.' })
    .int('Deve ser um inteiro.')
    .min(0, 'Não pode ser negativo.')
    .max(9999, 'Máximo 9999.'),
  active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function toPayload(values: CategoryFormValues): CategoryPayload {
  return {
    name: values.name,
    description: values.description?.trim() || null,
    icon: values.icon?.trim() || null,
    displayOrder: values.displayOrder,
    active: values.active,
  };
}

const emptyForm: CategoryFormValues = {
  name: '',
  description: '',
  icon: '',
  displayOrder: 0,
  active: true,
};

/**
 * Gestão de categorias (ADMIN/MANAGER).
 * Listagem ordenada por displayOrder; criação/edição em modal (RHF+Zod);
 * exclusão com aviso amigável quando a API rejeita via CATEGORY_HAS_PRODUCTS.
 * Após qualquer mutação: invalidateQueries(['categories']) — a tabela
 * atualiza instantaneamente.
 */
export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiCategory | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyForm,
  });

  const activeValue = watch('active');

  // Ao abrir o modal, popula o formulário (criação = vazio).
  useEffect(() => {
    if (modalMode === 'edit' && editing) {
      reset({
        name: editing.name,
        description: editing.description ?? '',
        icon: editing.icon ?? '',
        displayOrder: editing.displayOrder,
        active: editing.active,
      });
      return;
    }
    if (modalMode === 'create') {
      reset(emptyForm);
    }
  }, [modalMode, editing, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = toPayload(values);
      return modalMode === 'edit' && editing
        ? updateCategory(editing.id, payload)
        : createCategory(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('success', modalMode === 'edit' ? 'Categoria atualizada.' : 'Categoria criada.');
      setModalMode(null);
      setEditing(null);
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível salvar a categoria.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('success', 'Categoria excluída.');
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      setDeleteTarget(null);
      if (error instanceof ApiError && error.code === 'CATEGORY_HAS_PRODUCTS') {
        showToast(
          'error',
          'Não é possível excluir: existem produtos vinculados a esta categoria. Mova ou remova os produtos antes.',
        );
        return;
      }
      showToast(
        'error',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível excluir a categoria.',
      );
    },
  });

  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Categorias</h1>
          <p className="mt-1 text-sm text-stone-500">
            Seções do cardápio e ordem de exibição no menu.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalMode('create');
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova categoria
        </Button>
      </div>

      {categoriesQuery.isLoading && <Loading label="Carregando categorias…" />}

      {categoriesQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar as categorias">
          {categoriesQuery.error instanceof Error
            ? categoriesQuery.error.message
            : 'Erro inesperado.'}
        </Alert>
      )}

      {categoriesQuery.isSuccess && categoriesQuery.data.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={Tags}
            title="Nenhuma categoria cadastrada"
            description="Crie a primeira categoria para organizar o cardápio."
          >
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setModalMode('create');
              }}
            >
              Criar categoria
            </Button>
          </EmptyState>
        </Card>
      )}

      {categoriesQuery.isSuccess && categoriesQuery.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {categoriesQuery.data.map((category) => (
            <Card key={category.id} className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-stone-500">
                <Tags className="size-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-stone-900">{category.name}</h2>
                  {!category.active && <Badge variant="neutral">Inativa</Badge>}
                  <Badge variant="outline">
                    {category._count?.products ?? 0}{' '}
                    {(category._count?.products ?? 0) === 1 ? 'produto' : 'produtos'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-stone-500">
                  Ordem {category.displayOrder}
                  {category.description ? ` · ${category.description}` : ''}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => {
                    setEditing(category);
                    setModalMode('edit');
                  }}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Excluir ${category.name}`}
                  disabled={deleting}
                  onClick={() => setDeleteTarget(category)}
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
        title={modalMode === 'edit' ? 'Editar categoria' : 'Nova categoria'}
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
              {modalMode === 'edit' ? 'Salvar alterações' : 'Criar categoria'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            id="category-name"
            label="Nome"
            placeholder="Ex.: Bebidas"
            error={errors.name?.message}
            disabled={saving}
            autoFocus
            {...register('name')}
          />
          <Input
            id="category-description"
            label="Descrição"
            placeholder="Breve descrição (opcional)"
            error={errors.description?.message}
            disabled={saving}
            {...register('description')}
          />
          <Input
            id="category-icon"
            label="Ícone"
            placeholder="Ex.: glass-water (opcional)"
            error={errors.icon?.message}
            disabled={saving}
            {...register('icon')}
          />
          <Input
            id="category-order"
            label="Ordem de exibição"
            type="number"
            inputMode="numeric"
            error={errors.displayOrder?.message}
            disabled={saving}
            {...register('displayOrder')}
          />

          <div className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-stone-800">Categoria ativa</p>
              <p className="text-xs text-stone-500">Inativa não aparece no menu do cliente.</p>
            </div>
            <Switch
              checked={activeValue}
              onChange={(checked) => setValue('active', checked, { shouldValidate: true })}
              disabled={saving}
              aria-label="Categoria ativa"
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
        title="Excluir categoria"
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
            A categoria <strong className="font-semibold">{deleteTarget.name}</strong> será
            removida permanentemente. Categorias com produtos vinculados não podem ser
            excluídas.
          </Alert>
        )}
      </Modal>
    </div>
  );
}
