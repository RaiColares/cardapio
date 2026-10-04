import { useState } from 'react';

import { Check, Minus, Plus } from 'lucide-react';

import { cartItemKey } from '../../stores/customerStore.js';
import type { CartItem } from '../../stores/customerStore.js';
import type { MenuProduct, Modifier, ModifierGroup } from '../../types/domain.js';
import { cn } from '../../utils/cn.js';
import { formatBRL } from '../../utils/format.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Drawer } from '../ui/Drawer.js';

interface ProductSheetProps {
  product: MenuProduct | null;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}

const MAX_QUANTITY = 99;

/** Regras de seleção de um grupo de adicionais. */
function groupConstraints(group: ModifierGroup, selected: string[]) {
  const count = selected.length;
  const metMin = group.minSelections === 0 || count >= group.minSelections;
  const canSelectMore = count < (group.maxSelections ?? Number.POSITIVE_INFINITY);

  return { count, metMin, canSelectMore };
}

export function ProductSheet({ product, onClose, onAdd }: ProductSheetProps) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return null;
  }

  const activeProduct = product;

  function toggleModifier(group: ModifierGroup, modifier: Modifier) {
    const current = selected[group.id] ?? [];
    const isSelected = current.includes(modifier.id);
    const constraints = groupConstraints(group, current);

    let next: string[];
    if (isSelected) {
      next = current.filter((id) => id !== modifier.id);
    } else if (group.selectionType === 'SINGLE') {
      // Seleção única: substitui a escolha anterior.
      next = [modifier.id];
    } else if (constraints.canSelectMore) {
      next = [...current, modifier.id];
    } else {
      return;
    }

    setSelected((prev) => ({ ...prev, [group.id]: next }));
  }

  const selectedModifiers: { id: string; name: string; price: number }[] = [];
  for (const group of product.modifierGroups) {
    for (const modifier of group.modifiers) {
      if ((selected[group.id] ?? []).includes(modifier.id)) {
        selectedModifiers.push({ id: modifier.id, name: modifier.name, price: modifier.price });
      }
    }
  }

  const basePrice = product.promotionalPrice ?? product.price;
  const unitPrice =
    basePrice + selectedModifiers.reduce((sum, modifier) => sum + modifier.price, 0);
  const lineTotal = unitPrice * quantity;

  const missingGroups = product.modifierGroups.filter((group) => {
    const constraints = groupConstraints(group, selected[group.id] ?? []);
    return !constraints.metMin;
  });

  const canAdd = missingGroups.length === 0 && quantity >= 1;

  function handleAdd() {
    if (!canAdd) {
      return;
    }

    const modifierIds = selectedModifiers.map((modifier) => modifier.id);
    onAdd({
      key: cartItemKey(activeProduct.id, modifierIds),
      productId: activeProduct.id,
      productName: activeProduct.name,
      modifiers: selectedModifiers,
      quantity,
      unitPrice: basePrice,
    });
    setSelected({});
    setQuantity(1);
    onClose();
  }

  return (
    <Drawer open={Boolean(product)} onClose={onClose} placement="bottom" title={product.name}>
      <div className="space-y-5">
        {(product.ingredients || product.allergens) && (
          <p className="text-xs leading-relaxed text-stone-500">
            {product.ingredients && <span>{product.ingredients}</span>}
            {product.ingredients && product.allergens && ' · '}
            {product.allergens && <span>Alérgenos: {product.allergens}</span>}
          </p>
        )}

        {/* Grupos de adicionais com min/max */}
        {product.modifierGroups.map((group) => {
          const current = selected[group.id] ?? [];
          const { count, metMin, canSelectMore } = groupConstraints(group, current);
          const required = group.minSelections > 0;

          return (
            <fieldset key={group.id}>
              <legend className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-900">
                <span>{group.name}</span>
                <Badge variant={required ? (metMin ? 'success' : 'warning') : 'neutral'}>
                  {required
                    ? count >= group.minSelections
                      ? `Obrigatório (${count}/${group.maxSelections ?? '∞'})`
                      : `Selecione ao menos ${group.minSelections}`
                    : group.maxSelections !== null
                      ? `Até ${group.maxSelections}`
                      : 'Opcional'}
                </Badge>
              </legend>
              <div
                className="space-y-2"
                role={group.selectionType === 'SINGLE' ? 'radiogroup' : undefined}
              >
                {group.modifiers.map((modifier) => {
                  const checked = current.includes(modifier.id);
                  const disabled =
                    !checked && !canSelectMore && group.selectionType === 'MULTIPLE';
                  return (
                    <button
                      key={modifier.id}
                      type="button"
                      role={group.selectionType === 'SINGLE' ? 'radio' : 'checkbox'}
                      aria-checked={checked}
                      disabled={disabled}
                      onClick={() => toggleModifier(group, modifier)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                        checked
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                        disabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {checked && <Check className="size-4" aria-hidden="true" />}
                        {modifier.name}
                      </span>
                      <span className="text-sm font-semibold">
                        {modifier.price > 0 ? formatBRL(modifier.price) : 'Grátis'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        {missingGroups.length > 0 && (
          <p className="rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-800">
            {missingGroups.map((group) => group.name).join(' e ')} precisa(m) de seleção
            obrigatória.
          </p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-stone-200">
            <button
              type="button"
              aria-label="Diminuir quantidade"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="rounded-l-xl p-3 text-stone-600 hover:bg-stone-100"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span
              className="w-10 text-center text-sm font-semibold text-stone-900"
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Aumentar quantidade"
              onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
              className="rounded-r-xl p-3 text-stone-600 hover:bg-stone-100"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!canAdd}
            onClick={handleAdd}
          >
            Adicionar · {formatBRL(lineTotal)}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
