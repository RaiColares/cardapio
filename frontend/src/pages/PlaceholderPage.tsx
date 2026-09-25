import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

import { EmptyState } from '../components/ui/EmptyState.js';

export interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Página temporária e consistente para telas ainda não implementadas.
 * Será substituída pelas telas reais nas próximas etapas.
 */
export function PlaceholderPage({
  title,
  description,
  icon: Icon = Construction,
}: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <EmptyState icon={Icon} title={title} description={description} />
    </div>
  );
}
