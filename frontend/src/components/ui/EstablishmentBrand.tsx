import { Store } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '../../utils/cn.js';
import { initialsOf } from './Avatar.js';

export interface EstablishmentBrandProps {
  /** Nome do estabelecimento (branding do authStore). */
  name?: string | null;
  /** URL do logo; ausente/vazio usa as iniciais do nome. */
  logoUrl?: string | null;
  /** Tamanho do selo da marca. */
  size?: 'sm' | 'md';
  className?: string;
  /** Classe do texto do nome. */
  textClassName?: string;
}

const markSizeClasses: Record<NonNullable<EstablishmentBrandProps['size']>, string> = {
  sm: 'size-9 text-sm',
  md: 'size-11 text-base',
};

/**
 * Marca do estabelecimento: selo (logo ou iniciais do nome) + nome.
 *
 * Consome o branding do usuário logado (authStore.establishment). Sem
 * logo, exibe as iniciais do nome; se a URL do logo falhar ao carregar
 * (link quebrado/ inválido), cai automaticamente nas iniciais; sem nome
 * ainda (sessão não sincronizada), cai num ícone neutro. O selo nunca é
 * anunciado por leitores de tela (aria-hidden) — o nome textual ao lado é
 * a informação acessível.
 */
export function EstablishmentBrand({
  name,
  logoUrl,
  size = 'sm',
  className,
  textClassName,
}: EstablishmentBrandProps) {
  const label = name?.trim() ?? '';
  const [imageFailed, setImageFailed] = useState(false);

  // Reinicia o fallback quando a URL do logo muda (ex.: edição nas
  // configurações ou troca de estabelecimento).
  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  const resolvedLogoUrl = imageFailed ? null : (logoUrl ?? null);

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-700 font-semibold text-white',
          markSizeClasses[size],
        )}
        aria-hidden="true"
      >
        {resolvedLogoUrl ? (
          <img
            src={resolvedLogoUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : label ? (
          initialsOf(label)
        ) : (
          <Store className="size-5" />
        )}
      </span>
      {label && (
        <span
          className={cn(
            'min-w-0 truncate font-display text-lg font-semibold text-stone-900',
            textClassName,
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
