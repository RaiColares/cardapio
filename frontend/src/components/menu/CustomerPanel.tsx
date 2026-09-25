import { useState } from 'react';

import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { BellRing, Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react';

import {
  createPublicOrder,
  getPublicOrder,
  getSessionOrders,
  requestTableBill,
} from '../../services/publicMenu.js';
import { useCustomerStore, cartSubtotal } from '../../stores/customerStore.js';
import type { MenuEstablishment, OrderStatus, SessionOrdersExtract } from '../../types/domain.js';
import { formatBRL } from '../../utils/format.js';
import { Button } from '../ui/Button.js';
import { Drawer } from '../ui/Drawer.js';
import { EmptyState } from '../ui/EmptyState.js';
import { OrderStatusBadge } from '../ui/StatusBadge.js';
import { Tabs } from '../ui/Tabs.js';
import { useToast } from '../ui/Toast.js';
import { RequestBillModal, type RequestBillPayload } from './RequestBillModal.js';

interface CustomerPanelProps {
  /** Estabelecimento do cardápio (para exibir taxa de serviço estimada). */
  menuEstablishment: MenuEstablishment | null;
}

const MAX_ITEMS_PER_ORDER = 30;

/** Status "vivos" para o contador de pedidos em andamento do atalho fixo. */
const LIVE_ORDER_STATUSES = new Set<OrderStatus>([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
]);

export function CustomerPanel({ menuEstablishment }: CustomerPanelProps) {
  const {
    context,
    cart,
    orders,
    billRequested,
    addOrder,
    clearCart,
    updateQuantity,
    removeItem,
    setBillRequested,
  } = useCustomerStore();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('cart');
  const [requestBillOpen, setRequestBillOpen] = useState(false);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartSubtotal(cart);
  const feeRate = menuEstablishment?.serviceFeeEnabled ? (menuEstablishment.serviceFeeRate ?? 0) : 0;
  const serviceFee = (subtotal * feeRate) / 100;
  const estimatedTotal = subtotal + serviceFee;

  // Extrato consolidado da comanda (backend é autoridade; inclui itens e summary).
  const sessionOrdersQuery = useQuery({
    queryKey: ['public', 'session-orders', context?.sessionToken],
    queryFn: () => getSessionOrders(context?.sessionToken ?? ''),
    enabled: Boolean(context?.sessionToken),
    staleTime: 5_000,
    refetchInterval: 10_000,
    retry: 1,
  });

  // Fallback local (rastreio pedido a pedido) apenas enquanto o extrato não responde.
  const orderResults = useQueries({
    queries: orders.map((order) => ({
      queryKey: ['public', 'order', order.id],
      queryFn: () => getPublicOrder(order.id),
      enabled: !sessionOrdersQuery.isSuccess,
      staleTime: 5_000,
      refetchInterval: 10_000,
      retry: 1,
    })),
  });

  const checkout = useMutation({
    mutationFn: () => createPublicOrder(context?.sessionToken ?? '', toPayload()),
    onSuccess: (order) => {
      addOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
      });
      clearCart();
      setTab('orders');
      showToast('success', `Pedido ${order.orderNumber} enviado para a cozinha!`);
    },
    onError: (error: Error) => {
      showToast('error', error.message);
    },
  });

  const bill = useMutation({
    mutationFn: (payload: RequestBillPayload) =>
      requestTableBill(context?.sessionToken ?? '', {
        paymentMethodIntent: payload.paymentMethodIntent,
        changeRequested: payload.changeRequested,
      }),
    onSuccess: (result) => {
      setBillRequested(true);
      setRequestBillOpen(false);
      showToast('success', 'Conta solicitada! O garçom está indo até você.');
    },
    onError: (error: Error) => {
      setRequestBillOpen(false);
      showToast('error', error.message);
    },
  });

  // Pedidos em andamento (exibidos no atalho fixo de acompanhamento).
  // Prioriza o extrato público; cai para o rastreio local enquanto offline.
  const activeLive =
    sessionOrdersQuery.isSuccess && sessionOrdersQuery.data
      ? sessionOrdersQuery.data.orders.filter((order) => LIVE_ORDER_STATUSES.has(order.status))
          .length
      : orders.filter((order, index) => {
          const status = orderResults[index]?.data?.status ?? order.status;
          return LIVE_ORDER_STATUSES.has(status);
        }).length;

  function toPayload() {
    return cart.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      modifierIds: item.modifiers.map((modifier) => modifier.id),
      quantity: item.quantity,
    }));
  }

  function handleCheckout() {
    if (!context) {
      showToast('error', 'Sessão da mesa expirou. Leia o QR Code novamente.');
      return;
    }
    if (cart.length > MAX_ITEMS_PER_ORDER) {
      showToast('error', `Limite de ${MAX_ITEMS_PER_ORDER} itens por pedido.`);
      return;
    }
    checkout.mutate();
  }

  const cartOpen = open && tab === 'cart';
  const ordersOpen = open && tab === 'orders';

  return (
    <>
      {/* Barra de ação flutuante — SEMPRE visível enquanto a sessão da mesa
          estiver aberta (FASE 22): atalho de acompanhamento de pedidos +
          acesso ao carrinho, mesmo sem itens no carrinho. */}
      {context && !open && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-full max-w-md items-end justify-end gap-2 px-4">
          <button
            type="button"
            onClick={() => {
              setTab('orders');
              setOpen(true);
            }}
            aria-label={`Acompanhar pedidos da mesa${activeLive > 0 ? ` (${activeLive} em andamento)` : ''}`}
            className="relative flex h-12 items-center gap-1.5 rounded-full border border-stone-200 bg-white/95 px-4 font-semibold text-stone-800 shadow-card backdrop-blur transition-colors hover:border-primary-300 hover:text-primary-700"
          >
            <BellRing className="size-4.5 text-primary-700" aria-hidden="true" />
            <span className="text-sm">Pedidos</span>
            {activeLive > 0 && (
              <span
                aria-hidden="true"
                className="flex size-5 items-center justify-center rounded-full bg-primary-700 text-[11px] font-bold text-white"
              >
                {Math.min(activeLive, 99)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('cart');
              setOpen(true);
            }}
            aria-label={
              itemCount > 0
                ? `Abrir carrinho com ${itemCount} itens`
                : 'Abrir carrinho (vazio)'
            }
            className="relative flex h-12 items-center gap-2 rounded-full bg-primary-700 px-4 font-semibold text-white shadow-pop transition-colors hover:bg-primary-800"
          >
            <ShoppingCart className="size-4.5" aria-hidden="true" />
            <span className="text-sm">
              {itemCount > 0 ? `Ver carrinho · ${formatBRL(subtotal)}` : 'Carrinho'}
            </span>
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-sand-500 text-[11px] font-bold text-stone-900"
              >
                {Math.min(itemCount, 99)}
              </span>
            )}
          </button>
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom"
        title={context ? `Mesa ${context.tableNumber} · ${context.establishmentName}` : 'Seu pedido'}
        footer={
          cartOpen ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-stone-600">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">{formatBRL(subtotal)}</span>
              </div>
              {feeRate > 0 && (
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>Taxa de serviço ({feeRate}%)</span>
                  <span className="font-semibold text-stone-900">{formatBRL(serviceFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-base font-bold text-stone-900">
                <span>Total</span>
                <span>{formatBRL(estimatedTotal)}</span>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={cart.length === 0 || checkout.isPending}
                loading={checkout.isPending}
                onClick={handleCheckout}
              >
                {checkout.isPending ? 'Enviando pedido...' : 'Enviar pedido'}
              </Button>
              <p className="text-center text-xs text-stone-400">
                Valores finais confirmados no recebimento do pedido.
              </p>
            </div>
          ) : null
        }
      >
        <Tabs
          ariaLabel="Áreas do cliente"
          items={[
            { value: 'cart', label: 'Carrinho', icon: ShoppingBag },
            { value: 'orders', label: 'Meus pedidos', icon: BellRing },
          ]}
          value={tab}
          onChange={setTab}
          className="mb-4"
        />

        {cartOpen && (
          <div className="space-y-3">
            {cart.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Carrinho vazio"
                description="Escolha um item do cardápio para começar."
              />
            ) : (
              cart.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-3 rounded-xl border border-stone-100 bg-white p-3 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-xs text-stone-500">{item.variantName}</p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="mt-0.5 text-xs text-stone-500">
                        {item.modifiers.map((modifier) => modifier.name).join(', ')}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-primary-700">
                      {formatBRL(
                        (item.unitPrice +
                          item.modifiers.reduce((acc, modifier) => acc + modifier.price, 0)) *
                          item.quantity,
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center rounded-lg border border-stone-200">
                      <button
                        type="button"
                        aria-label={`Diminuir quantidade de ${item.productName}`}
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="p-2 text-stone-600 hover:bg-stone-100"
                      >
                        <Minus className="size-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold text-stone-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Aumentar quantidade de ${item.productName}`}
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="p-2 text-stone-600 hover:bg-stone-100"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${item.productName} do carrinho`}
                      onClick={() => removeItem(item.key)}
                      className="flex items-center gap-1 text-xs text-stone-400 hover:text-danger-600"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {ordersOpen && (
          <OrdersTab
            extract={sessionOrdersQuery.data ?? null}
            extractFailed={sessionOrdersQuery.isError}
            localOrders={orders}
            localLive={orderResults.map((result) => result.data)}
            billRequested={billRequested}
            billPending={bill.isPending}
            onRequestBill={() => setRequestBillOpen(true)}
          />
        )}
      </Drawer>

      {/* Solicitação de conta: intenção de pagamento (PIX/cartões/dinheiro + troco) */}
      <RequestBillModal
        open={requestBillOpen}
        pending={bill.isPending}
        onClose={() => setRequestBillOpen(false)}
        onConfirm={(payload) => bill.mutate(payload)}
      />
    </>
  );
}

/* ------------------------------------------------------------------
   "Meus pedidos" do cliente — prioriza o extrato público da comanda
   (GET /public/table-sessions/:token/orders) e cai para o rastreio
   local apenas quando o extrato não está disponível (offline).
------------------------------------------------------------------ */
function OrdersTab({
  extract,
  extractFailed,
  localOrders,
  localLive,
  billRequested,
  billPending,
  onRequestBill,
}: {
  extract: SessionOrdersExtract | null;
  extractFailed: boolean;
  localOrders: { id: string; orderNumber: number; status: OrderStatus; total: number; createdAt: string }[];
  localLive: ({ status?: OrderStatus; total?: number } | undefined)[];
  billRequested: boolean;
  billPending: boolean;
  onRequestBill: () => void;
}) {
  const useExtract = Boolean(extract && extract.orders.length > 0);
  const hasOrders = useExtract ? true : localOrders.length > 0;

  if (!hasOrders) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={BellRing}
          title="Nenhum pedido ainda"
          description="Seus pedidos desta comanda aparecerão aqui."
        />
        <div className="pt-1">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={billRequested || billPending}
            loading={billPending}
            onClick={onRequestBill}
          >
            {billRequested ? 'Conta já solicitada' : 'Pedir a conta'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {useExtract
        ? extract!.orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-stone-100 bg-white p-4 shadow-card"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-stone-900">Pedido #{order.orderNumber}</p>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <ul className="mt-2 space-y-1">
                {order.items.map((item) => (
                  <li key={item.id} className="text-sm text-stone-700">
                    <span className="font-semibold text-stone-900">{item.quantity}×</span>{' '}
                    {item.productName}
                    {item.variantName && <span className="text-stone-500"> ({item.variantName})</span>}
                    {item.modifiers.length > 0 && (
                      <span className="text-stone-500">
                        {' '}
                        + {item.modifiers.map((modifier) => modifier.modifierName).join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-right text-sm font-semibold text-stone-900">
                {formatBRL(order.total)}
              </p>
            </div>
          ))
        : localOrders.map((order, index) => {
            const live = localLive[index];
            const status: OrderStatus = live?.status ?? order.status;
            return (
              <div
                key={order.id}
                className="rounded-xl border border-stone-100 bg-white p-4 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-stone-900">Pedido #{order.orderNumber}</p>
                  <OrderStatusBadge status={status} />
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {formatBRL(live?.total ?? order.total)}
                </p>
              </div>
            );
          })}

      {/* Resumo consolidado (valores do backend) */}
      {useExtract && extract!.summary && (
        <section
          aria-label="Resumo da comanda"
          className="rounded-xl bg-sand-100 px-4 py-3 text-sm"
        >
          <div className="flex items-center justify-between text-stone-600">
            <span>Subtotal</span>
            <span className="font-semibold text-stone-900">
              {formatBRL(extract!.summary.subtotal)}
            </span>
          </div>
          {extract!.summary.serviceFee > 0 && (
            <div className="mt-1 flex items-center justify-between text-stone-600">
              <span>Taxa de serviço</span>
              <span className="font-semibold text-stone-900">
                {formatBRL(extract!.summary.serviceFee)}
              </span>
            </div>
          )}
          {extract!.summary.discount > 0 && (
            <div className="mt-1 flex items-center justify-between text-stone-600">
              <span>Desconto</span>
              <span className="font-semibold text-success-700">
                −{formatBRL(extract!.summary.discount)}
              </span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
            <span>Total da comanda</span>
            <span>{formatBRL(extract!.summary.total)}</span>
          </div>
        </section>
      )}

      <div className="pt-1">
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={billRequested || billPending}
          loading={billPending}
          onClick={onRequestBill}
        >
          {billRequested ? 'Conta já solicitada' : 'Pedir a conta'}
        </Button>
        <p className="mt-2 text-center text-xs text-stone-400">
          Ao pedir a conta, o garçom é avisado para fazer o fechamento da mesa.
        </p>
        {extractFailed && localOrders.length > 0 && (
          <p className="mt-2 text-center text-xs text-amber-600">
            Resumo indisponível no momento — exibindo dados locais.
          </p>
        )}
      </div>
    </div>
  );
}
