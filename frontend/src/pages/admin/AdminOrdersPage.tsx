import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, MinusCircle, RefreshCw, Sparkles } from 'lucide-react';

import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Loading } from '../../components/ui/Loading.js';
import { OrderStatusBadge } from '../../components/ui/StatusBadge.js';
import { listOrders } from '../../services/orders.js';
import { useSocketEvents } from '../../services/socket.js';
import { useAuthStore } from '../../stores/authStore.js';
import type { OperationalOrder, OrderStatus } from '../../types/domain.js';
import { cn } from '../../utils/cn.js';
import { formatBRL } from '../../utils/format.js';
import { timeAgo } from '../../utils/time.js';

/**
 * Pedidos do Administrador (ADMIN/MANAGER) — VISÃO GLOBAL (FASE 22).
 *
 * Consome GET /orders sem filtro: o backend devolve TODOS os pedidos do
 * estabelecimento (visão de supervisão). A página é READ-ONLY: agrupa a
 * fila viva em um kanban (Novos → Confirmados → Em preparo → Prontos) e
 * resume entregues/cancelados abaixo — para o gerente acompanhar a
 * operação sem interferir nela.
 *
 * Realtime: o socket invalida ['orders'] automaticamente (NEW_ORDER,
 * ORDER_STATUS_UPDATED, ...) + polling de 20s como fallback.
 */

const LIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];
const LIVE_SET = new Set<OrderStatus>(LIVE_STATUSES);

const COLUMNS: { status: OrderStatus; title: string; hint: string; accent: string }[] = [
  { status: 'PENDING', title: 'Novos', hint: 'Aguardando aceite', accent: 'border-amber-300' },
  { status: 'CONFIRMED', title: 'Confirmados', hint: 'Na fila da cozinha', accent: 'border-aqua-300' },
  { status: 'PREPARING', title: 'Em preparo', hint: 'Em produção', accent: 'border-primary-300' },
  { status: 'READY', title: 'Prontos', hint: 'Aguardando entrega', accent: 'border-green-300' },
];

export function AdminOrdersPage() {
  const establishmentId = useAuthStore((state) => state.user?.establishmentId);
  useSocketEvents(establishmentId);

  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders'],
    // Sem filtro de status: ADMIN/MANAGER recebem todos os pedidos (global).
    queryFn: () => listOrders({ order: 'asc' }),
    refetchInterval: 20_000,
  });

  const { active, delivered, cancelled } = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    return {
      active: orders.filter((order) => LIVE_SET.has(order.status)),
      delivered: orders.filter((order) => order.status === 'DELIVERED'),
      cancelled: orders.filter((order) => order.status === 'CANCELLED'),
    };
  }, [ordersQuery.data]);

  const byStatus = useMemo(() => {
    const map = new Map<OrderStatus, OperationalOrder[]>();
    for (const status of LIVE_STATUSES) {
      map.set(status, []);
    }
    for (const order of active) {
      map.get(order.status)?.push(order);
    }
    return map;
  }, [active]);

  const deliveredTotal = delivered.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Pedidos</h1>
          <p className="mt-1 text-sm text-stone-500">
            Visão global da operação — somente leitura para supervisão.
          </p>
        </div>
        {ordersQuery.isSuccess && (
          <Button
            variant="secondary"
            size="sm"
            loading={ordersQuery.isFetching}
            onClick={() => void ordersQuery.refetch()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar
          </Button>
        )}
      </div>

      {ordersQuery.isPending ? (
        <Loading label="Carregando pedidos..." />
      ) : ordersQuery.isError ? (
        <Alert variant="danger" title="Não foi possível carregar os pedidos">
          {ordersQuery.error instanceof Error
            ? ordersQuery.error.message
            : 'Erro inesperado ao buscar os pedidos.'}
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => void ordersQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      ) : (
        <>
          {/* Resumo supervisor */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Pedidos ativos"
              value={String(active.length)}
              helper="Novos → Confirmados → Em preparo → Prontos"
              icon={Sparkles}
              accent="bg-amber-100 text-amber-700"
            />
            <SummaryCard
              label="Entregues"
              value={String(delivered.length)}
              helper={deliveredTotal > 0 ? formatBRL(deliveredTotal) : 'Nenhum entregue'}
              icon={CheckCircle2}
              accent="bg-green-100 text-green-700"
            />
            <SummaryCard
              label="Cancelados"
              value={String(cancelled.length)}
              helper="Pedidos cancelados na operação"
              icon={MinusCircle}
              accent="bg-stone-200 text-stone-600"
            />
          </div>

          {active.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Fila da operação vazia"
              description="Novos pedidos aparecem aqui em tempo real para acompanhamento."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.status}
                  title={column.title}
                  hint={column.hint}
                  accent={column.accent}
                  orders={byStatus.get(column.status) ?? []}
                />
              ))}
            </div>
          )}

          {/* Histórico recente (entregues + cancelados) */}
          <FinishedOrders delivered={delivered} cancelled={cancelled} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Sparkles;
  accent: string;
}) {
  return (
    <Card className="flex items-start gap-4">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <p className="mt-0.5 truncate font-display text-2xl font-semibold text-stone-900">
          {value}
        </p>
        <p className="mt-1 text-xs text-stone-400">{helper}</p>
      </div>
    </Card>
  );
}

function KanbanColumn({
  title,
  hint,
  accent,
  orders,
}: {
  title: string;
  hint: string;
  accent: string;
  orders: OperationalOrder[];
}) {
  return (
    <section className={cn('rounded-2xl border-2 bg-white p-3 shadow-card', accent)}>
      <h2 className="flex items-baseline justify-between font-display text-base font-semibold text-stone-900">
        {title}
        <span className="text-sm font-semibold text-stone-400">({orders.length})</span>
      </h2>
      <p className="mb-3 text-xs text-stone-400">{hint}</p>

      {orders.length === 0 ? (
        <p className="rounded-xl bg-stone-50 px-3 py-6 text-center text-sm text-stone-400">
          Sem pedidos.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-stone-200 bg-stone-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base font-bold text-stone-900">
                  Pedido #{order.orderNumber}
                </p>
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <ClipboardList className="size-3.5" aria-hidden="true" />
                  {timeAgo(order.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-medium text-stone-600">
                Mesa {order.table.number}
                {order.table.area?.name ? ` · ${order.table.area.name}` : ''}
              </p>

              <ul className="mt-2 space-y-1">
                {order.items.map((item) => (
                  <li key={item.id} className="text-sm text-stone-700">
                    <span className="font-semibold text-stone-900">{item.quantity}×</span>{' '}
                    {item.productName}
                    {item.variantName && (
                      <span className="text-stone-500"> ({item.variantName})</span>
                    )}
                    {item.modifiers.length > 0 && (
                      <span className="text-stone-500">
                        {' '}
                        + {item.modifiers.map((modifier) => modifier.modifierName).join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {order.notes && (
                <p className="mt-2 rounded-lg bg-aqua-50 px-2 py-1 text-xs text-aqua-900">
                  Obs.: {order.notes}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-2">
                <span className="text-sm font-semibold text-stone-900">
                  {formatBRL(order.total)}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FinishedOrders({
  delivered,
  cancelled,
}: {
  delivered: OperationalOrder[];
  cancelled: OperationalOrder[];
}) {
  const finished = useMemo(
    () => [...delivered, ...cancelled].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [delivered, cancelled],
  );

  if (finished.length === 0) {
    return null;
  }

  return (
    <Card padded={false}>
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-display text-base font-semibold text-stone-900">
          Histórico recente
          <span className="ml-1 text-sm font-semibold text-stone-400">({finished.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-stone-100">
        {finished.slice(0, 20).map((order) => (
          <li key={order.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="w-24 shrink-0 font-semibold text-stone-900">
              #{order.orderNumber}
            </span>
            <span className="min-w-0 flex-1 truncate text-stone-600">
              Mesa {order.table.number}
              {order.table.area?.name ? ` · ${order.table.area.name}` : ''}
            </span>
            <span className="shrink-0 text-xs text-stone-400">{timeAgo(order.createdAt)}</span>
            <span className="hidden shrink-0 font-semibold text-stone-800 sm:block">
              {formatBRL(order.total)}
            </span>
            <OrderStatusBadge status={order.status} />
          </li>
        ))}
      </ul>
    </Card>
  );
}