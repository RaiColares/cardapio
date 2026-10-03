import { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { MapPin, Plus, RefreshCw, Store, UtensilsCrossed } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { CustomerPanel } from '../../components/menu/CustomerPanel.js';
import { ProductSheet } from '../../components/menu/ProductSheet.js';
import { getPublicMenu, getTableByQrCode } from '../../services/publicMenu.js';
import { useCustomerStore } from '../../stores/customerStore.js';
import type { MenuProduct } from '../../types/domain.js';
import { cn } from '../../utils/cn.js';
import { formatBRL } from '../../utils/format.js';
import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Loading } from '../../components/ui/Loading.js';
import { useToast } from '../../components/ui/Toast.js';

/**
 * Experiência do cliente (mobile-first).
 *
 * /table/:qrCode — define a comanda (sessionToken) e carrega o cardápio.
 * /menu/:establishmentSlug — navegação do cardápio (sem comanda).
 *
 * O frontend envia apenas IDs e quantidades; o backend recalcula preços
 * e total (regra de ouro). Valores exibidos no carrinho são estimativas.
 */
export function MenuPage() {
  const { token, establishmentSlug } = useParams();
  const { setContext, addToCart, cart } = useCustomerStore();
  const { showToast } = useToast();

  const [activeProduct, setActiveProduct] = useState<MenuProduct | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // QR guardado no estado (evita perder a sessão ao navegar entre abas).
  const qrCode = token ?? '';

  // 1) Resolve a mesa e cria/recupera a comanda aberta.
  const tableQuery = useQuery({
    queryKey: ['public', 'table', qrCode],
    queryFn: () => getTableByQrCode(qrCode),
    enabled: Boolean(qrCode),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  useEffect(() => {
    const data = tableQuery.data;
    if (!data) {
      return;
    }
    setContext({
      sessionToken: data.sessionToken,
      tableId: data.table.id,
      tableNumber: data.table.number,
      tableName: data.table.name,
      tableStatus: data.table.status,
      areaName: data.table.area?.name ?? null,
      establishmentId: data.establishment.id,
      establishmentName: data.establishment.name,
      establishmentSlug: data.establishment.slug,
    });
  }, [tableQuery.data, setContext]);

  // 2) Slug do estabelecimento: vem da mesa (QR) ou da rota /menu/:slug.
  const slug = qrCode ? tableQuery.data?.establishment.slug : establishmentSlug;

  // 3) Cardápio público.
  const menuQuery = useQuery({
    queryKey: ['public', 'menu', slug ?? ''],
    queryFn: () => getPublicMenu(slug ?? ''),
    enabled: Boolean(slug),
    staleTime: 60_000,
    retry: 1,
  });

  const establishment = menuQuery.data?.establishment ?? null;
  const categories = menuQuery.data?.categories ?? [];
  const hasSession = Boolean(qrCode) && Boolean(tableQuery.data);

  const visibleCategories = useMemo(
    () =>
      selectedCategory === 'all'
        ? categories
        : categories.filter((category) => category.id === selectedCategory),
    [categories, selectedCategory],
  );

  function handleAdd(product: MenuProduct) {
    setActiveProduct(product);
  }

  function totalInCart(productId: string): number {
    return cart
      .filter((item) => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0);
  }

  // ----- Estados de carregamento/erro da mesa (fluxo QR) -----
  if (qrCode && tableQuery.isPending) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <Loading label="Localizando sua mesa..." />
      </div>
    );
  }

  if (qrCode && tableQuery.isError) {
    const message = tableQuery.error instanceof Error ? tableQuery.error.message : 'Mesa não encontrada.';
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <Alert variant="danger" title="Não foi possível abrir a comanda">
          {message}
        </Alert>
        <Button variant="secondary" onClick={() => void tableQuery.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // ----- Estados de carregamento/erro do cardápio -----
  if (menuQuery.isPending) {
    return <MenuSkeleton />;
  }

  if (menuQuery.isError || !establishment) {
    const message =
      menuQuery.error instanceof Error
        ? menuQuery.error.message
        : 'Cardápio não encontrado.';
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <Alert variant="danger" title="Cardápio indisponível">{message}</Alert>
        <Button variant="secondary" onClick={() => void menuQuery.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Cabeçalho do estabelecimento */}
      <header className="bg-gradient-to-b from-primary-900 to-primary-700 px-5 pb-5 pt-7 text-white">
        <div className="flex flex-wrap items-center gap-2">
          {hasSession && (
            <Badge variant="outline">
              <MapPin className="size-3.5" aria-hidden="true" />
              Mesa {tableQuery.data?.table.number}
              {tableQuery.data?.table.area?.name
                ? ` · ${tableQuery.data.table.area.name}`
                : ''}
            </Badge>
          )}
          {establishment.serviceFeeEnabled && (
            <Badge variant="info">Taxa de serviço {establishment.serviceFeeRate ?? 0}%</Badge>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"
            aria-hidden="true"
          >
            <Store className="size-6" />
          </div>
          <div className="min-w-0">
            {/* text-white explícito: o base global aplica text-stone-900 em
                h1/h2/h3 (index.css @layer base), que vence a cor herdada do
                header — sem esta classe o nome ficaria escuro sobre o verde. */}
            <h1 className="font-display text-2xl font-bold leading-tight text-white">
              {establishment.name}
            </h1>
            {establishment.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-white/75">
                {establishment.description}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Aviso quando não há comanda (acesso por /menu/:slug) */}
      {!hasSession && (
        <div className="px-4 pt-4">
          <Alert variant="info" title="Visualização do cardápio">
            Escaneie o QR Code da sua mesa para fazer pedidos direto do seu celular.
          </Alert>
        </div>
      )}

      {/* Chips de categoria — fixos durante o scroll */}
      {categories.length > 1 && (
        <nav
          aria-label="Categorias do cardápio"
          className="sticky top-0 z-30 border-b border-stone-200/70 bg-sand-50/95 px-4 py-2 backdrop-blur"
        >
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CategoryChip
              active={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </CategoryChip>
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                active={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </CategoryChip>
            ))}
          </div>
        </nav>
      )}

      {/* Lista de produtos por categoria */}
      <main className="space-y-6 px-4 pt-4">
        {visibleCategories.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nada por aqui ainda"
            description="Este cardápio ainda não tem itens disponíveis."
          />
        )}

        {visibleCategories.map((category) => (
          <section key={category.id} aria-labelledby={`category-${category.id}`}>
            <h2
              id={`category-${category.id}`}
              className="mb-2 flex items-baseline gap-2 font-display text-lg font-bold text-stone-900"
            >
              {category.name}
              {category.description && (
                <span className="text-xs font-normal text-stone-400">{category.description}</span>
              )}
            </h2>

            <div className="space-y-2.5">
              {category.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  quantityInCart={totalInCart(product.id)}
                  onSelect={() => handleAdd(product)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Configuração do produto (bottom sheet) */}
      <ProductSheet
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onAdd={(item) => {
          addToCart(item);
          showToast('success', `${item.productName} adicionado ao carrinho.`);
        }}
      />

      {/* FAB + carrinho + meus pedidos + pedir a conta */}
      <CustomerPanel menuEstablishment={establishment} />
    </div>
  );
}

interface CategoryChipProps {
  active: boolean;
  onClick: () => void;
  children: string;
}

function CategoryChip({ active, onClick, children }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'border-primary-700 bg-primary-700 text-white'
          : 'border-stone-300 bg-white text-stone-600 hover:border-primary-300 hover:text-primary-700',
      )}
    >
      {children}
    </button>
  );
}

interface ProductRowProps {
  product: MenuProduct;
  quantityInCart: number;
  onSelect: () => void;
}

function ProductRow({ product, quantityInCart, onSelect }: ProductRowProps) {
  const hasVariants = product.variants.length > 0;
  const displayPrice = hasVariants
    ? Math.min(...product.variants.map((variant) => variant.price))
    : product.promotionalPrice ?? product.price;
  const originalPrice =
    !hasVariants && product.promotionalPrice !== null ? product.price : null;

  return (
    <article
      className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white p-3 shadow-card transition-shadow hover:shadow-pop"
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="size-16 shrink-0 rounded-xl object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-semibold text-stone-900">{product.name}</h3>
          {product.featured && <Badge variant="primary">Destaque</Badge>}
          {product.promotionalPrice !== null && !hasVariants && (
            <Badge variant="danger">Promoção</Badge>
          )}
        </div>

        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{product.description}</p>
        )}

        <div className="mt-1.5 flex items-baseline gap-1.5">
          {hasVariants && (
            <span className="text-xs text-stone-400">a partir de</span>
          )}
          <span className="font-display text-base font-semibold text-primary-700">
            {formatBRL(displayPrice)}
          </span>
          {originalPrice !== null && (
            <span className="text-xs text-stone-400 line-through">
              {formatBRL(originalPrice)}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`Configurar ${product.name}`}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white transition-colors hover:bg-primary-600 active:bg-primary-800"
      >
        <Plus className="size-5" aria-hidden="true" />
        {quantityInCart > 0 && (
          <span
            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-sand-500 text-[11px] font-bold text-stone-900"
            aria-label={`${quantityInCart} no carrinho`}
          >
            {Math.min(quantityInCart, 99)}
          </span>
        )}
      </button>
    </article>
  );
}

/** Esqueleto de carregamento do cardápio. */
function MenuSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 px-4 pt-6">
      <div className="space-y-2">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-stone-200" />
      </div>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl bg-stone-200/70"
          aria-hidden="true"
        />
      ))}
      <p className="sr-only">Carregando cardápio...</p>
    </div>
  );
}
