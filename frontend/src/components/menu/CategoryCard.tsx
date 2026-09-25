import { cn } from '../../utils/cn.js';

export interface CategoryCardProps {
  name: string;
  selected?: boolean;
  onClick: () => void;
}

/**
 * Categoria do cardápio (navegação horizontal).
 * Estado selecionado com destaque claro (cor + fundo + peso).
 */
export function CategoryCard({ name, selected = false, onClick }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
        selected
          ? 'border-primary-700 bg-primary-700 text-white'
          : 'border-stone-300 bg-white text-stone-700 hover:border-primary-300 hover:text-primary-800',
      )}
    >
      {name}
    </button>
  );
}
