import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * Tabela apresentacional com estilo consistente.
 * Responsiva: wrapper com rolagem horizontal em telas estreitas.
 */

export function Table({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full min-w-[480px] text-left text-sm', className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function THead({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-stone-200 bg-sand-50', className)} {...rest}>
      {children}
    </thead>
  );
}

export function TBody({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...rest}>{children}</tbody>;
}

export function TRow({ className, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('border-b border-stone-100 last:border-0', className)} {...rest}>
      {children}
    </tr>
  );
}

export function TH({
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-4 py-3 font-semibold text-stone-600', className)} {...rest}>
      {children}
    </th>
  );
}

export function TD({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 text-stone-800', className)} {...rest}>
      {children}
    </td>
  );
}
