import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { CurrencyInput } from '../../components/ui/CurrencyInput.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Input } from '../../components/ui/Input.js';
import { Loading } from '../../components/ui/Loading.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Select.js';
import { Switch } from '../../components/ui/Switch.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  setProductAvailability,
  updateProduct,
} from '../../services/catalog.js';
import type { ProductPayload } from '../../services/catalog.js';
import type { ApiCategory, ApiProduct } from '../../types/domain.js';
import { formatBRL } from '../../utils/format.js';

/**
 * Validação espelha o createProductSchema do backend:
 * nome 2..150, descrição <=500, price > 0 (máx 2 casas decimais),
 * promocional <= preço, tempo de preparo 0..10080 min, ordem 0..9999.
 *
 * Os campos numéricos são tratados como string no form (o que o RHF
 * entrega em inputs number); a conversão para number acontece no
 * toPayload, mantendo a validação determinística no zod.
 */
const currencyPattern = /^\d+(?:\.\d{1,2})?$/;
const intPattern = /^\d+$/;

const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter no mínimo 2 caracteres.')
      .max(150, 'O nome deve ter no máximo 150 caracteres.'),
    description: z.string().trim().max(500, 'Máximo de 500 caracteres.').optional(),
    categoryId: z.string().uuid('Selecione uma categoria.'),
    price: z
      .string()
      .trim()
      .min(1, 'Informe o preço.')
      .regex(currencyPattern, 'Preço inválido (ex.: 12.50).')
      .refine(
        (value) => Number(value) > 0 && Number(value) <= 9_999_999.99,
        'O preço deve ser positivo (máx 9999999,99).',
      ),
    promotionalPrice: z
      .string()
      .trim()
      .regex(currencyPattern, 'Preço inválido (ex.: 9.90).')
      .optional()
      .or(z.literal('')),
    preparationTime: z
      .string()
      .trim()
      .regex(intPattern, 'Informe um número inteiro.')
      .refine((value) => value === '' || Number(value) <= 10080, 'Máximo 10080 min.')
      .optional()
      .or(z.literal('')),
    displayOrder: z
      .string()
      .trim()
      .regex(intPattern, 'Informe um número inteiro.')
      .refine((value) => Number(value) <= 9999, 'Máximo 9999.'),
    featured: z.boolean(),
    active: z.boolean(),
    available: z.boolean(),
  })
  .refine(
    (data) =>
      (data.promotionalPrice ?? '').trim() === '' ||
      data.price === '' ||
      Number(data.promotionalPrice ?? 0) <= Number(data.price),
    { message: 'O preço promocional não pode ser maior que o preço.', path: ['promotionalPrice'] },
  );

type ProductFormValues = z.infer<typeof productFormSchema>;

/** Valor sentinela da aba "Todas" (nenhuma categoria filtrada). */
const ALL_CATEGORIES = 'all';

function toPayload(values: ProductFormValues): ProductPayload {
  return {
    name: values.name,
    description: values.description?.trim() || null,
    categoryId: values.categoryId,
    price: Number(values.price),
    promotionalPrice: (values.promotionalPrice ?? '').trim() === '' ? null : Number(values.promotionalPrice),
    preparationTime: (values.preparationTime ?? '').trim() === '' ? null : Number(values.preparationTime),
    displayOrder: Number(values.displayOrder),
    featured: values.featured,
    active: values.active,
    available: values.available,
  };
}

function emptyForm(): ProductFormValues {
  return {
    name: '',
    description: '',
    categoryId: '',
    price: '',
    promotionalPrice: '',
    preparationTime: '',
    displayOrder: '0',
    featured: false,
    active: true,
    available: true,
  };
}

/**
 * Gestão de produtos (ADMIN/MANAGER).
 *
 * Listagem AGRUPADA POR CATEGORIA em abas (uma aba por categoria + aba
 * "Todas"), com switch de disponibilidade (PATCH /products/:id/availability,
 * update otimista com rollback), modal de criação/edição com select de
 * categorias ativas e exclusão com confirmação. Após mutações, invalida
 * as queries para atualização instantânea.
 *
 * Os valores monetários usam CurrencyInput (máscara BRL): o garçom/admin
 * digita "1250" e vê "1.250,00", sem ambiguidade de separador decimal.
 */
export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyForm(),
  });

  const featuredValue = watch('featured');
  const activeValue = watch('active');
  const availableValue = watch('available');
  // Campos monetários: o CurrencyInput grava em reais como string
  // ("12.50"), o mesmo formato esperado pelo schema acima.
  const priceValue = watch('price');
  const promotionalPriceValue = watch('promotionalPrice');

  useEffect(() => {
    if (modalMode === 'edit' && editing) {
      reset({
        name: editing.name,
        description: editing.description ?? '',
        categoryId: editing.categoryId,
        price: String(editing.price),
        promotionalPrice: editing.promotionalPrice === null ? '' : String(editing.promotionalPrice),
        preparationTime: editing.preparationTime === null ? '' : String(editing.preparationTime),
        displayOrder: String(editing.displayOrder),
        featured: editing.featured,
        active: editing.active,
        available: editing.available,
      });
      return;
    }
    if (modalMode === 'create') {
      reset(emptyForm());
    }
  }, [modalMode, editing, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = toPayload(values);
      return modalMode === 'edit' && editing
        ? updateProduct(editing.id, payload)
        : createProduct(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('success', modalMode === 'edit' ? 'Produto atualizado.' : 'Produto criado.');
      setModalMode(null);
      setEditing(null);
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível salvar o produto.',
      );
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      setProductAvailability(id, available),
    onMutate: async ({ id, available }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previous = queryClient.getQueryData<ApiProduct[]>(['products']);
      queryClient.setQueryData<ApiProduct[]>(['products'], (old) =>
        old?.map((product) => (product.id === id ? { ...product, available } : product)) ?? [],
      );
      return { previous };
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['products'], context.previous);
      }
      showToast(
        'error',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível alterar a disponibilidade.',
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('success', 'Produto excluído.');
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      setDeleteTarget(null);
      showToast(
        'error',
        error instanceof ApiError ? error.message : 'Não foi possível excluir o produto.',
      );
    },
  });

  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  // Abas: uma por categoria que tenha produtos + "Todas" como visão geral.
  // Quando há uma única categoria, a lista simples evita uma aba redundante.
  const categoriesWithProducts = useMemo(() => {
    const products = productsQuery.data ?? [];
    const byId = new Map<string, { id: string; name: string; count: number }>();

    for (const product of products) {
      const current = byId.get(product.categoryId);
      if (current) {
        current.count += 1;
      } else {
        byId.set(product.categoryId, {
          id: product.categoryId,
          name: product.category.name,
          count: 1,
        });
      }
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [productsQuery.data]);

  const categoryTabs = useMemo(() => {
    if (categoriesWithProducts.length < 2) {
      return null;
    }

    return [
      { value: ALL_CATEGORIES, label: 'Todas' },
      ...categoriesWithProducts.map((category) => ({
        value: category.id,
        label: `${category.name} (${category.count})`,
      })),
    ];
  }, [categoriesWithProducts]);

  // Kategorias agrupadas preservando a ordem do backend (displayOrder).
  const productsByCategory = useMemo(() => {
    const products = productsQuery.data ?? [];

    return (categoriesQuery.data ?? [])
      .map((category: ApiCategory) => ({
        category,
        products: products.filter((product) => product.categoryId === category.id),
      }))
      .filter((group) => group.products.length > 0);
  }, [productsQuery.data, categoriesQuery.data]);

  const visibleGroups = useMemo(
    () =>
      activeCategory === ALL_CATEGORIES
        ? productsByCategory
        : productsByCategory.filter((group) => group.category.id === activeCategory),
    [productsByCategory, activeCategory],
  );

  // Opções: categorias ativas + categoria atual (mesmo inativa) ao editar.
  const categoryOptions = (() => {
    const active = (categoriesQuery.data ?? []).filter((category) => category.active);
    const options: { value: string; label: string }[] = [
      { value: '', label: 'Selecione a categoria…' },
      ...active.map((category: ApiCategory) => ({
        value: category.id,
        label: category.name,
      })),
    ];
    if (
      modalMode === 'edit' &&
      editing &&
      !active.some((category) => category.id === editing.categoryId)
    ) {
      options.push({ value: editing.categoryId, label: `${editing.category.name} (inativa)` });
    }
    return options;
  })();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Produtos</h1>
          <p className="mt-1 text-sm text-stone-500">
            Itens do cardápio, preços e disponibilidade.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalMode('create');
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo produto
        </Button>
      </div>

      {productsQuery.isLoading && <Loading label="Carregando produtos…" />}

      {productsQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar os produtos">
          {productsQuery.error instanceof Error ? productsQuery.error.message : 'Erro inesperado.'}
        </Alert>
      )}

      {productsQuery.isSuccess && productsQuery.data.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={UtensilsCrossed}
            title="Nenhum produto cadastrado"
            description="Cadastre itens para montar o cardápio digital."
          >
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setModalMode('create');
              }}
            >
              Criar produto
            </Button>
          </EmptyState>
        </Card>
      )}

      {productsQuery.isSuccess && productsQuery.data.length > 0 && (
        <div className="flex flex-col gap-4">
          {categoryTabs && (
            <Tabs
              items={categoryTabs}
              value={activeCategory}
              onChange={setActiveCategory}
              ariaLabel="Filtrar produtos por categoria"
              scrollable
            />
          )}

          {visibleGroups.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={UtensilsCrossed}
                title="Nenhum produto nesta categoria"
                description="Selecione outra aba ou cadastre um item."
              />
            </Card>
          ) : (
            visibleGroups.map((group) => (
              <section
                key={group.category.id}
                aria-labelledby={`products-category-${group.category.id}`}
                className="flex flex-col gap-2.5"
              >
                {/* Nome da categoria só quando há mais de uma aba visível. */}
                {categoryTabs && (
                  <h2
                    id={`products-category-${group.category.id}`}
                    className="flex items-baseline gap-2 font-display text-base font-bold text-stone-900"
                  >
                    {group.category.name}
                    <span className="text-xs font-normal text-stone-400">
                      {group.products.length}{' '}
                      {group.products.length === 1 ? 'produto' : 'produtos'}
                    </span>
                  </h2>
                )}

                <div className="flex flex-col gap-3">
                  {group.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      showCategory={!categoryTabs}
                      availabilityPending={availabilityMutation.isPending}
                      deleting={deleting}
                      onToggleAvailable={(available) =>
                        availabilityMutation.mutate({ id: product.id, available })
                      }
                      onEdit={() => {
                        setEditing(product);
                        setModalMode('edit');
                      }}
                      onDelete={() => setDeleteTarget(product)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
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
        title={modalMode === 'edit' ? 'Editar produto' : 'Novo produto'}
        size="lg"
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
              {modalMode === 'edit' ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          {categoriesQuery.isLoading && <Loading label="Carregando categorias…" />}

          {categoriesQuery.isSuccess && (
            <>
              <Input
                id="product-name"
                label="Nome"
                placeholder="Ex.: Suco de Laranja Natural"
                error={errors.name?.message}
                disabled={saving}
                autoFocus
                {...register('name')}
              />
              <Select
                id="product-category"
                label="Categoria"
                options={categoryOptions}
                error={errors.categoryId?.message}
                disabled={saving}
                {...register('categoryId')}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CurrencyInput
                  id="product-price"
                  label="Preço"
                  value={priceValue}
                  onValueChange={(value) => setValue('price', value, { shouldValidate: true })}
                  error={errors.price?.message}
                  disabled={saving}
                />
                <CurrencyInput
                  id="product-promo"
                  label="Preço promocional"
                  hint="Opcional — deixe em branco se não houver promoção."
                  placeholder="0,00"
                  value={promotionalPriceValue ?? ''}
                  onValueChange={(value) =>
                    setValue('promotionalPrice', value, { shouldValidate: true })
                  }
                  error={errors.promotionalPrice?.message}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  id="product-time"
                  label="Tempo de preparo (min)"
                  type="number"
                  inputMode="numeric"
                  placeholder="Opcional"
                  error={errors.preparationTime?.message}
                  disabled={saving}
                  {...register('preparationTime')}
                />
                <Input
                  id="product-order"
                  label="Ordem de exibição"
                  type="number"
                  inputMode="numeric"
                  error={errors.displayOrder?.message}
                  disabled={saving}
                  {...register('displayOrder')}
                />
              </div>
              <Input
                id="product-description"
                label="Descrição"
                placeholder="Ingredientes, modo de servir… (opcional)"
                error={errors.description?.message}
                disabled={saving}
                {...register('description')}
              />

              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Disponível para venda</p>
                    <p className="text-xs text-stone-500">Esgotado sai do cardápio do cliente.</p>
                  </div>
                  <Switch
                    checked={availableValue}
                    onChange={(checked) => setValue('available', checked, { shouldValidate: true })}
                    disabled={saving}
                    aria-label="Disponível para venda"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Destaque</p>
                    <p className="text-xs text-stone-500">Aparece em evidência no menu.</p>
                  </div>
                  <Switch
                    checked={featuredValue}
                    onChange={(checked) => setValue('featured', checked, { shouldValidate: true })}
                    disabled={saving}
                    aria-label="Produto em destaque"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Ativo</p>
                    <p className="text-xs text-stone-500">Inativo fica oculto do catálogo.</p>
                  </div>
                  <Switch
                    checked={activeValue}
                    onChange={(checked) => setValue('active', checked, { shouldValidate: true })}
                    disabled={saving}
                    aria-label="Produto ativo"
                  />
                </div>
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
        title="Excluir produto"
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
            O produto <strong className="font-semibold">{deleteTarget.name}</strong> será removido
            permanentemente do cardápio. Pedidos antigos preservam seus dados.
          </Alert>
        )}
      </Modal>
    </div>
  );
}

interface ProductCardProps {
  product: ApiProduct;
  /** Exibe a categoria na linha (relevante na visão "Todas", sem abas). */
  showCategory: boolean;
  availabilityPending: boolean;
  deleting: boolean;
  onToggleAvailable: (available: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Linha do produto: identificação, preço e ações de disponibilidade. */
function ProductCard({
  product,
  showCategory,
  availabilityPending,
  deleting,
  onToggleAvailable,
  onEdit,
  onDelete,
}: ProductCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-stone-500">
        <UtensilsCrossed className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-stone-900">{product.name}</h3>
          {product.featured && <Badge variant="primary">Destaque</Badge>}
          {!product.active && <Badge variant="neutral">Inativo</Badge>}
          {!product.available && <Badge variant="danger">Esgotado</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-stone-500">
          {showCategory && `${product.category.name} · `}
          {formatBRL(product.price)}
          {product.promotionalPrice !== null && ` → promo ${formatBRL(product.promotionalPrice)}`}
          {product.variants.length > 0 && ` · ${product.variants.length} variações`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <Switch
            checked={product.available}
            disabled={availabilityPending || deleting}
            onChange={onToggleAvailable}
            aria-label={
              product.available
                ? `Marcar ${product.name} como esgotado`
                : `Marcar ${product.name} como disponível`
            }
          />
          <span className="text-[11px] text-stone-400">
            {product.available ? 'Disponível' : 'Esgotado'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Editar ${product.name}`}
            disabled={deleting}
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Excluir ${product.name}`}
            disabled={deleting}
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
