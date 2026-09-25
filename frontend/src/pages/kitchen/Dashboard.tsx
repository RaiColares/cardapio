import { useMutation, useQuery } from '@tanstack/react-query';
import { AlarmClock, ChefHat, Play, WifiOff } from 'lucide-react';

import { EmptyState } from '../../components/ui/EmptyState.js';
import { Loading } from '../../components/ui/Loading.js';
import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { listOrders, updateOrderStatus } from '../../services/orders.js';
import { useSocketEvents } from '../../services/socket.js';
import { useAuthStore } from '../../stores/authStore.js';
import type { OperationalOrder, OrderStatus } from '../../types/domain.js';
import { cn } from '../../utils/cn.js';
import { timeAgo } from '../../utils/time.js';

/**
 * KDS — Kitchen Display System.
 *
 * Fila viva da cozinha: apenas CONFIRMED (novos p/ preparar) e
 * PREPARING (em produção). O status READY sai do painel e volta
 * para o garçom (entrega). Transições permitidas (RBAC backend):
 * CONFIRMED → PREPARING → READY.
 *
 * Realtime: eventos do socket invalidam ['orders'] automaticamente.
 */
export function KitchenDashboard() {
  const establishmentId = useAuthStore((state) => state.user?.establishmentId);
  const connected = useSocketEvents(establishmentId);

  const ordersQuery = useQuery({
    queryKey: ['orders', 'kitchen'],
    queryFn: () => listOrders({ status: ['CONFIRMED', 'PREPARING'], order: 'asc' }),
    refetchInterval: 20_000,
  });

  const transition = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
  });

  const confirmedOrders = (ordersQuery.data ?? []).filter(
    (order) => order.status === 'CONFIRMED',
  );
  const preparingOrders = (ordersQuery.data ?? []).filter(
    (order) => order.status === 'PREPARING',
  );

  if (ordersQuery.isPending) {
    return <Loading label="Carregando fila da cozinha..." />;
  }

  if (ordersQuery.isError) {
    return (
      <Alert variant="danger" title="Não foi possível carregar a fila">
        {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Erro ao buscar pedidos.'}
      </Alert>
    );
  }

  const busy = confirmedOrders.length + preparingOrders.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-bold text-stone-900">
          Fila da cozinha
          {busy > 0 && <span className="ml-2 text-sm font-semibold text-stone-500">({busy})</span>}
        </h2>
        <Badge variant={connected ? 'success' : 'danger'}>
          {connected ? 'Online' : (
            <span className="inline-flex items-center gap-1">
              <WifiOff className="size-3.5" aria-hidden="true" /> Offline
            </span>
          )}
        </Badge>
      </div>

      {busy === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Cozinha em dia"
          description="Nenhum pedido aguardando — os próximos pedidos aparecerão aqui em tempo real."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <KitchenColumn
            title="Novos (aguardando preparo)"
            accent="border-amber-300"
            emptyLabel="Sem pedidos confirmados"
            orders={confirmedOrders}
            supplying={transition.isPending}
            actionLabel="Iniciar preparo"
            targetStatus="PREPARING"
            onAction={(orderId) =>
              transition.mutate({ orderId, status: 'PREPARING' })
            }
          />
          <KitchenColumn
            title="Em preparo"
            accent="border-primary-300"
            emptyLabel="Nada cozinhando agora"
            orders={preparingOrders}
            supplying={transition.isPending}
            actionLabel="Marcar como pronto"
            targetStatus="READY"
            onAction={(orderId) => transition.mutate({ orderId, status: 'READY' })}
          />
        </div>
      )}
    </div>
  );
}

interface KitchenColumnProps {
  title: string;
  accent: string;
  emptyLabel: string;
  orders: OperationalOrder[];
  supplying: boolean;
  actionLabel: string;
  targetStatus: OrderStatus;
  onAction: (orderId: string) => void;
}

function KitchenColumn({
  title,
  accent,
  emptyLabel,
  orders,
  supplying,
  actionLabel,
  targetStatus,
  onAction,
}: KitchenColumnProps) {
  return (
    <section className={cn('rounded-2xl border-2 bg-white p-3 shadow-card', accent)}>
      <h3 className="mb-3 font-display text-lg font-semibold text-stone-900">
        {title} <span className="text-sm font-semibold text-stone-400">({orders.length})</span>
      </h3>

      {orders.length === 0 ? (
        <p className="rounded-xl bg-stone-50 px-3 py-6 text-center text-sm text-stone-400">
          {emptyLabel}
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
                  <AlarmClock className="size-3.5" aria-hidden="true" />
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

              <Button
                variant="primary"
                size="sm"
                className="mt-3 w-full"
                disabled={supplying}
                loading={supplying}
                onClick={() => onAction(order.id)}
              >
                <Play className="size-4" aria-hidden="true" />
                {actionLabel}
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
