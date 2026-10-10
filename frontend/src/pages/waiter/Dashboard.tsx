import { useMemo, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlarmClock,
  CheckCheck,
  ClipboardList,
  Hand,
  MapPin,
  SquareStack,
  UtensilsCrossed,
  WifiOff,
} from 'lucide-react';

import { BillDrawer } from '../../components/waiter/BillDrawer.js';
import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Loading } from '../../components/ui/Loading.js';
import { TableStatusBadge } from '../../components/ui/StatusBadge.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { useToast } from '../../components/ui/Toast.js';
import { listOrders, updateOrderStatus } from '../../services/orders.js';
import { listTables } from '../../services/physical.js';
import { useSocketEvents } from '../../services/socket.js';
import { useAuthStore } from '../../stores/authStore.js';
import type { ApiTable, OperationalOrder, OrderStatus } from '../../types/domain.js';
import { cn } from '../../utils/cn.js';
import { formatBRL } from '../../utils/format.js';
import { timeAgo } from '../../utils/time.js';

interface OpenBill {
  sessionId: string;
  title: string;
}

/**
 * Painel do Garçom — duas visões em abas:
 *
 *  FILA  │ PENDING (aceitar → CONFIRMED) e READY (entregar → DELIVERED),
 *         │ transições permitidas ao papel WAITER no backend.
 *  MESAS │ mapa do salão com status, destaque para "Conta solicitada";
 *         │ ao clicar numa mesa ocupada abre a comanda (bill + pagamentos
 *         │ + fechamento).
 *
 * Realtime: socket invalida ['orders'] e ['tables'] automaticamente.
 */
export function WaiterDashboard() {
  const { showToast } = useToast();
  const establishmentId = useAuthStore((state) => state.user?.establishmentId);
  const connected = useSocketEvents(establishmentId);
  const [tab, setTab] = useState('fila');
  const [bill, setBill] = useState<OpenBill | null>(null);
  const [resolvingTable, setResolvingTable] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ['orders', 'queue'],
    queryFn: () => listOrders({ status: ['PENDING', 'READY'], order: 'asc' }),
    refetchInterval: 20_000,
  });

  const tablesQuery = useQuery({
    queryKey: ['tables'],
    queryFn: listTables,
    refetchInterval: 20_000,
  });

  const changeStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onError: (error: Error) => {
      showToast('error', error.message);
    },
  });

  const pendingOrders = (queueQuery.data ?? []).filter((order) => order.status === 'PENDING');
  const readyOrders = (queueQuery.data ?? []).filter((order) => order.status === 'READY');

  const tablesByArea = useMemo(() => {
    const map = new Map<string, { name: string; tables: ApiTable[] }>();
    for (const table of tablesQuery.data ?? []) {
      const areaId = table.area.id;
      const entry = map.get(areaId) ?? { name: table.area.name, tables: [] };
      entry.tables.push(table);
      map.set(areaId, entry);
    }
    return [...map.values()];
  }, [tablesQuery.data]);

  /**
   * Abre a conta da mesa.
   *
   * Caminho preferido: a própria mesa informa a comanda aberta
   * (`activeSessionId` — FASE 23), o que funciona mesmo SEM pedidos (mesa
   * ocupada por leitura de QR e "travada"). Fallback: deriva a sessão a
   * partir do último pedido da mesa (payload antigo/sem sessão em aberto).
   */
  async function openBillForTable(table: ApiTable) {
    if (table.status === 'AVAILABLE' && !table.activeSessionId) return;

    const title = `Mesa ${table.number}${table.name ? ` · ${table.name}` : ''}`;

    if (table.activeSessionId) {
      setBill({ sessionId: table.activeSessionId, title });
      return;
    }

    setResolvingTable(table.id);
    try {
      const orders = await listOrders({ tableId: table.id, order: 'desc' });
      const session = orders[0]?.tableSession;
      if (!session) {
        showToast('info', 'Nenhum pedido nesta mesa para abrir a conta.');
        return;
      }
      setBill({ sessionId: session.id, title });
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao abrir a conta.');
    } finally {
      setResolvingTable(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-bold text-stone-900">Operação do salão</h2>
        <Badge variant={connected ? 'success' : 'danger'}>
          {connected ? 'Online' : (
            <span className="inline-flex items-center gap-1">
              <WifiOff className="size-3.5" aria-hidden="true" /> Offline
            </span>
          )}
        </Badge>
      </div>

      <Tabs
        ariaLabel="Visão do garçom"
        value={tab}
        onChange={setTab}
        items={[
          {
            value: 'fila',
            label: `Fila${queueQuery.data?.length ? ` (${queueQuery.data.length})` : ''}`,
            icon: ClipboardList,
          },
          { value: 'mesas', label: 'Mesas', icon: MapPin },
        ]}
      />

      {tab === 'fila' ? (
        queueQuery.isPending ? (
          <Loading label="Carregando a fila..." />
        ) : queueQuery.isError ? (
          <Alert variant="danger" title="Fila indisponível">
            {queueQuery.error instanceof Error
              ? queueQuery.error.message
              : 'Erro ao buscar os pedidos da fila.'}
          </Alert>
        ) : pendingOrders.length === 0 && readyOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Fila vazia"
            description="Pedidos novos e prontos para entrega aparecerão aqui em tempo real."
          />
        ) : (
          <div className="space-y-6">
            <QueueSection
              title="Novos pedidos"
              emptyLabel="Sem pedidos aguardando aceite."
              orders={pendingOrders}
              actionLabel="Aceitar pedido"
              actionIcon={CheckCheck}
              busy={changeStatus.isPending}
              onAction={(orderId) => changeStatus.mutate({ orderId, status: 'CONFIRMED' })}
            />
            <QueueSection
              title="Prontos para entrega"
              emptyLabel="Nenhum pedido pronto ainda."
              orders={readyOrders}
              actionLabel="Marcar como entregue"
              actionIcon={Hand}
              busy={changeStatus.isPending}
              onAction={(orderId) => changeStatus.mutate({ orderId, status: 'DELIVERED' })}
            />
          </div>
        )
      ) : tablesQuery.isPending ? (
        <Loading label="Carregando mesas..." />
      ) : tablesQuery.isError ? (
        <Alert variant="danger" title="Mesas indisponíveis">
          {tablesQuery.error instanceof Error
            ? tablesQuery.error.message
            : 'Erro ao buscar as mesas.'}
        </Alert>
      ) : (
        <div className="space-y-6">
          {tablesByArea.map((area) => (
            <section key={area.name} aria-label={`Área ${area.name}`}>
              <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-stone-900">
                <SquareStack className="size-4 text-stone-400" aria-hidden="true" />
                {area.name}
                <span className="text-sm font-semibold text-stone-400">
                  ({area.tables.length})
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {area.tables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    loading={resolvingTable === table.id}
                    onOpen={() => void openBillForTable(table)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <BillDrawer
        sessionId={bill?.sessionId ?? null}
        title={bill?.title ?? ''}
        onClose={() => setBill(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QueueSection({
  title,
  emptyLabel,
  orders,
  actionLabel,
  actionIcon: ActionIcon,
  busy,
  onAction,
}: {
  title: string;
  emptyLabel: string;
  orders: OperationalOrder[];
  actionLabel: string;
  actionIcon: typeof Hand;
  busy: boolean;
  onAction: (orderId: string) => void;
}) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 font-display text-lg font-semibold text-stone-900">
        {title}
        <span className="ml-1 text-sm font-semibold text-stone-400">({orders.length})</span>
      </h3>
      {orders.length === 0 ? (
        <p className="rounded-xl bg-stone-50 px-3 py-6 text-center text-sm text-stone-400">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card"
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
              <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-stone-600">
                <UtensilsCrossed className="size-3.5" aria-hidden="true" />
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
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold text-stone-900">
                  {formatBRL(order.total)}
                </span>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  loading={busy}
                  onClick={() => onAction(order.id)}
                >
                  <ActionIcon className="size-4" aria-hidden="true" />
                  {actionLabel}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TableCard({
  table,
  loading,
  onOpen,
}: {
  table: ApiTable;
  loading: boolean;
  onOpen: () => void;
}) {
  // Mesas ocupadas/em conta e mesas com comanda aberta (mesmo sem pedidos)
  // são clicáveis — o activeSessionId garante o acesso à gaveta da conta.
  const clickable = table.status !== 'AVAILABLE' || Boolean(table.activeSessionId);
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!clickable || loading}
      aria-label={`Mesa ${table.number}${table.name ? ` ${table.name}` : ''} — ${clickable ? 'abrir conta' : 'livre'}`}
      className={cn(
        'flex min-h-32 flex-col items-start rounded-2xl border-2 p-3 text-left transition-all sm:p-4 touch-manipulation',
        clickable
          ? 'cursor-pointer border-stone-200 bg-white hover:border-primary-300 hover:shadow-card'
          : 'cursor-default border-stone-100 bg-stone-50 opacity-70',
        table.status === 'BILL_REQUESTED' &&
          'border-danger-300 bg-danger-50 ring-2 ring-danger-100 hover:border-danger-400',
        table.status === 'OCCUPIED' && 'border-primary-200 hover:border-primary-300',
        loading && 'animate-pulse',
      )}
    >
      <div className="flex w-full items-center justify-between gap-1">
        <span className="font-display text-2xl font-bold text-stone-900">{table.number}</span>
        <TableStatusBadge status={table.status} />
      </div>
      <span className="mt-1 text-sm text-stone-500">
        {table.name ?? 'Mesa'}
        <span className="text-stone-400"> · {table.capacity} lugares</span>
      </span>
      {table.status === 'BILL_REQUESTED' && (
        <span className="mt-2 text-xs font-semibold text-danger-700">
          Conta solicitada — abrir para fechar
        </span>
      )}
    </button>
  );
}
