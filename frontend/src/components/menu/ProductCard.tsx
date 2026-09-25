import { Plus, UtensilsCrossed } from 'lucide-react';

import type { Product } from '../../types/domain.js';
import { cn } from '../../utils/cn.js';
import { formatBRL } from '../../utils/format.js';
import { Badge } from '../ui/Badge.js';

export interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

/**
 * Card de produto do cardápio.
 * Produto indisponível ganha visual claramente distinto (grayscale + selo).
 */
export function ProductCard({ product, onAdd }: ProductCardProps) {
  const unavailable = product.available === 'unavailable';

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-card transition-shadow',
        !unavailable && 'hover:shadow-pop',
        unavailable && 'opacity-80',
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={cn('size-full object-cover', unavailable && 'grayscale')}
            loading="lazy"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            aria-hidden="true"
          >
            <UtensilsCrossed className="size-8 text-stone-300" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
          {product.promotionalPrice !== undefined && (
            <Badge variant="danger">Promoção</Badge>
          )}
          {product.featured && (
            <Badge variant="primary">Destaque</Badge>
          )}
          {unavailable && <Badge variant="neutral">Indisponível</Badge>}
        </div>
      </div>

      <div className="p-3.5">
        <h3 className="font-semibold text-stone-900">{product.name}</h3>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-stone-500">{product.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {product.promotionalPrice !== undefined ? (
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-lg font-semibold text-primary-700">
                  {formatBRL(product.promotionalPrice)}
                </span>
                <span className="text-xs text-stone-400 line-through">
                  {formatBRL(product.price)}
                </span>
              </div>
            ) : (
              <span className="font-display text-lg font-semibold text-primary-700">
                {formatBRL(product.price)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={unavailable}
            aria-label={unavailable ? `Produto indisponível` : `Adicionar ${product.name} ao pedido`}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
              unavailable
                ? 'cursor-not-allowed bg-stone-200 text-stone-400'
                : 'bg-primary-700 text-white hover:bg-primary-600 active:bg-primary-800',
            )}
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
