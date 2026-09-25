import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Banknote, Lock, Receipt } from 'lucide-react';

import { closeSession, createPayment, getSessionBill, getSessionPayments } from '../../services/tableSessions.js';
import { useBillIntentStore, type BillRequestIntent } from '../../stores/billIntentStore.js';
import type { PaymentMethod } from '../../types/domain.js';
import { formatBRL } from '../../utils/format.js';
import { Alert } from '../ui/Alert.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { CurrencyInput } from '../ui/CurrencyInput.js';
import { Drawer } from '../ui/Drawer.js';
import { EmptyState } from '../ui/EmptyState.js';
import { Loading } from '../ui/Loading.js';
import { Select } from '../ui/Select.js';
import { useToast } from '../ui/Toast.js';

interface BillDrawerProps {
  /** Sessão da comanda (null fecha o drawer). */
  sessionId: string | null;
  /** Rótulo exibido no título (ex.: "Mesa 05 · Piscina"). */
  title: string;
  onClose: () => void;
}

const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'Informe o valor.')
    .refine((value) => Number(value) > 0, 'Valor deve ser maior que zero.')
    .refine((value) => Number(value) <= 100000, 'Valor acima do limite.'),
  method: z.enum(['CASH', 'CARD', 'PIX'] as const),
  status: z.enum(['PAID', 'PENDING'] as const),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const methodLabel: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  PIX: 'PIX',
};

export function BillDrawer({ sessionId, title, onClose }: BillDrawerProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Intenção de pagamento capturada em tempo real pelo evento BILL_REQUESTED.
  const liveIntent = useBillIntentStore((state) =>
    sessionId ? state.intents[sessionId] : undefined,
  );

  const billQuery = useQuery({
    queryKey: ['table-sessions', sessionId, 'bill'],
    queryFn: () => getSessionBill(sessionId ?? ''),
    enabled: Boolean(sessionId),
  });

  const paymentsQuery = useQuery({
    queryKey: ['table-sessions', sessionId, 'payments'],
    queryFn: () => getSessionPayments(sessionId ?? ''),
    enabled: Boolean(sessionId),
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', method: 'CASH', status: 'PAID' },
  });

  // Reseta o formulário a cada nova comanda.
  useEffect(() => {
    paymentForm.reset({ amount: '', method: 'CASH', status: 'PAID' });
  }, [sessionId, paymentForm]);

  const paidAmount = useMemo(
    () =>
      (paymentsQuery.data ?? [])
        .filter((payment) => payment.status === 'PAID')
        .reduce((sum, payment) => sum + payment.amount, 0),
    [paymentsQuery.data],
  );

  const registerPayment = useMutation({
    mutationFn: (values: PaymentFormValues) =>
      createPayment(sessionId ?? '', {
        amount: Number(values.amount),
        method: values.method,
        status: values.status,
      }),
    onSuccess: (payment) => {
      paymentForm.reset({ amount: '', method: 'CASH', status: 'PAID' });
      void queryClient.invalidateQueries({ queryKey: ['table-sessions', sessionId] });
      showToast(
        'success',
        `${methodLabel[payment.method]} ${formatBRL(payment.amount)} registrado (${payment.status === 'PAID' ? 'pago' : 'pendente'}).`,
      );
    },
    onError: (error: Error) => {
      showToast('error', error.message);
    },
  });

  const closing = useMutation({
    mutationFn: () => closeSession(sessionId ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('success', 'Mesa fechada com sucesso!');
      onClose();
    },
    onError: (error: Error) => {
      // Exibe erros amigáveis: SESSION_HAS_OPEN_ORDERS / INSUFFICIENT_PAYMENT ...
      showToast('error', error.message);
    },
  });

  const bill = billQuery.data;
  const summary = bill?.summary;

  // Intenção de pagamento do cliente (FASE 22):
  // 1) fonte preferida — evento realtime BILL_REQUESTED (payload completo);
  // 2) fallback — campos expostos na própria comanda (contrato futuro do bill).
  const intent = useMemo<BillRequestIntent | undefined>(() => {
    if (liveIntent) {
      return liveIntent;
    }
    if (bill?.session.paymentMethodIntent != null) {
      return {
        sessionId: bill.session.id,
        tableId: bill.session.table.id,
        tableNumber: bill.session.table.number,
        tableName: bill.session.table.name,
        paymentMethodIntent: bill.session.paymentMethodIntent,
        changeRequested: bill.session.changeRequested ?? null,
        requestedAt: bill.session.updatedAt,
      };
    }
    return undefined;
  }, [liveIntent, bill]);

  return (
    <Drawer
      open={Boolean(sessionId)}
      onClose={onClose}
      placement="right"
      title={`Conta · ${title}`}
      footer={
        bill && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-base font-bold text-stone-900">
              <span>Total da comanda</span>
              <span>{formatBRL(summary?.total ?? 0)}</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={closing.isPending}
              loading={closing.isPending}
              onClick={() => closing.mutate()}
            >
              <Lock className="size-4" aria-hidden="true" />
              Fechar mesa
            </Button>
          </div>
        )
      }
    >
      <>
        {intent && <BillIntentAlert intent={intent} />}

        {!sessionId ? null : billQuery.isPending ? (
          <Loading label="Carregando a conta..." />
        ) : billQuery.isError || !bill ? (
          <Alert variant="danger" title="Conta indisponível">
            {billQuery.error instanceof Error
              ? billQuery.error.message
              : 'Não foi possível carregar a conta desta mesa.'}
          </Alert>
        ) : (
        <div className="space-y-5">
          {/* Resumo financeiro */}
          <section aria-label="Resumo da conta">
            <div className="grid grid-cols-2 gap-2">
              <SummaryCell label="Pedidos" value={String(summary?.ordersCount ?? 0)} />
              <SummaryCell label="Itens" value={String(summary?.itemsCount ?? 0)} />
              <SummaryCell label="Subtotal" value={formatBRL(summary?.subtotal ?? 0)} />
              <SummaryCell
                label="Taxa de serviço"
                value={
                  (summary?.serviceFeeRate ?? 0) > 0
                    ? `${summary?.serviceFeeRate}% (${formatBRL(summary?.serviceFee ?? 0)})`
                    : formatBRL(summary?.serviceFee ?? 0)
                }
              />
            </div>

            <div className="mt-3 rounded-xl bg-sand-100 px-4 py-3">
              <div className="flex items-center justify-between text-sm font-semibold text-stone-700">
                <span>Valor pago (PAID)</span>
                <span>{formatBRL(paidAmount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm font-semibold text-stone-900">
                <span>Falta pagar</span>
                <span>{formatBRL(Math.max(0, (summary?.total ?? 0) - paidAmount))}</span>
              </div>
            </div>
          </section>

          {/* Itens da comanda */}
          <section aria-label="Itens da comanda">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-stone-900">
              <Receipt className="size-4 text-stone-400" aria-hidden="true" />
              Itens da comanda
            </h3>
            {bill.items.length === 0 ? (
              <p className="rounded-xl bg-stone-50 px-3 py-4 text-center text-sm text-stone-400">
                Nenhum item nesta comanda.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {bill.items.map((item, index) => (
                  <li
                    key={`${item.orderId}-${index}`}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 text-stone-700">
                      <span className="font-semibold text-stone-900">{item.quantity}×</span>{' '}
                      {item.productName}
                      {item.variantName && (
                        <span className="text-stone-500"> ({item.variantName})</span>
                      )}
                      {item.modifiers.length > 0 && (
                        <span className="block text-xs text-stone-500">
                          + {item.modifiers.map((modifier) => modifier.modifierName).join(', ')}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-stone-800">
                      {formatBRL(item.totalPrice)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Pagamentos registrados */}
          <section aria-label="Pagamentos">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-stone-900">
              <Banknote className="size-4 text-stone-400" aria-hidden="true" />
              Pagamentos
            </h3>
            {paymentsQuery.isPending ? (
              <p className="text-sm text-stone-400">Carregando...</p>
            ) : (paymentsQuery.data ?? []).length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="Nenhum pagamento"
                description="Registre um pagamento parcial ou total abaixo."
              />
            ) : (
              <ul className="space-y-1.5">
                {(paymentsQuery.data ?? []).map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-stone-800">
                        {methodLabel[payment.method]}
                      </span>
                      <Badge
                        variant={
                          payment.status === 'PAID'
                            ? 'success'
                            : payment.status === 'PENDING'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </span>
                    <span className="font-semibold text-stone-900">
                      {formatBRL(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Registro de pagamento */}
          <section aria-label="Registrar pagamento">
            <h3 className="mb-2 font-semibold text-stone-900">Registrar pagamento</h3>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                void paymentForm.handleSubmit((values) => registerPayment.mutate(values))(
                  event,
                );
              }}
            >
              <CurrencyInput
                id="payment-amount"
                label="Valor"
                value={paymentForm.watch('amount')}
                onValueChange={(value) =>
                  paymentForm.setValue('amount', value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                error={paymentForm.formState.errors.amount?.message}
                placeholder="0,00"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Método"
                  id="payment-method"
                  options={[
                    { value: 'CASH', label: 'Dinheiro' },
                    { value: 'CARD', label: 'Cartão' },
                    { value: 'PIX', label: 'PIX' },
                  ]}
                  {...paymentForm.register('method')}
                />
                <Select
                  label="Situação"
                  id="payment-status"
                  options={[
                    { value: 'PAID', label: 'Pago' },
                    { value: 'PENDING', label: 'Pendente' },
                  ]}
                  {...paymentForm.register('status')}
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="md"
                className="w-full"
                disabled={registerPayment.isPending}
                loading={registerPayment.isPending}
              >
                <Banknote className="size-4" aria-hidden="true" />
                Registrar pagamento
              </Button>
            </form>
          </section>
        </div>
      )}
      </>
    </Drawer>
  );
}

/** Alerta visual com a intenção de pagamento informada pelo cliente. */
function BillIntentAlert({ intent }: { intent: BillRequestIntent }) {
  const label = intent.paymentMethodIntent
    ? methodLabel[intent.paymentMethodIntent]
    : 'não informado';

  const text =
    intent.paymentMethodIntent === 'CASH' && intent.changeRequested != null
      ? `Pagamento: ${label} — Troco para ${formatBRL(intent.changeRequested)}`
      : `Pagamento: ${label}`;

  return (
    <Alert variant="warning" title="Intenção de pagamento do cliente" className="mb-4">
      <span className="font-semibold">{text}</span>
      <span className="block text-xs opacity-80">
        Confirmar com o cliente antes do fechamento.
      </span>
    </Alert>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-white px-3 py-2">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="font-semibold text-stone-900">{value}</p>
    </div>
  );
}
