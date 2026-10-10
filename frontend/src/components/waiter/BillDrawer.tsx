import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Banknote, Lock, Percent, Receipt, SlidersHorizontal, Trash2 } from 'lucide-react';

import {
  closeSession,
  createPayment,
  deletePayment,
  getSessionBill,
  getSessionPayments,
  updateSessionAdjustments,
} from '../../services/tableSessions.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useBillIntentStore, type BillRequestIntent } from '../../stores/billIntentStore.js';
import type { Payment, PaymentMethod } from '../../types/domain.js';
import { formatBRL } from '../../utils/format.js';
import { Alert } from '../ui/Alert.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { CurrencyInput } from '../ui/CurrencyInput.js';
import { Drawer } from '../ui/Drawer.js';
import { EmptyState } from '../ui/EmptyState.js';
import { Input } from '../ui/Input.js';
import { Loading } from '../ui/Loading.js';
import { Modal } from '../ui/Modal.js';
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
  method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'] as const),
  status: z.enum(['PAID', 'PENDING'] as const),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

/**
 * Ajustes manuais da comanda (MANAGER/ADMIN).
 *
 * Os campos monetários chegam do CurrencyInput como string em reais
 * ("1234.56") ou "" quando zero. O total NÃO é calculado aqui: o backend
 * recalcula e devolve o bill atualizado.
 */
const adjustmentsSchema = z
  .object({
    discount: z.string(),
    extraCharge: z.string(),
    extraChargeNote: z.string().trim().max(200, 'Máximo de 200 caracteres.'),
  })
  .refine((values) => Number(values.discount || 0) <= 1_000_000, {
    message: 'Desconto acima do limite.',
    path: ['discount'],
  })
  .refine((values) => Number(values.extraCharge || 0) <= 1_000_000, {
    message: 'Acréscimo acima do limite.',
    path: ['extraCharge'],
  })
  .refine(
    (values) => Number(values.extraCharge || 0) === 0 || values.extraChargeNote.trim().length > 0,
    {
      message: 'Informe o motivo do acréscimo.',
      path: ['extraChargeNote'],
    },
  );

type AdjustmentsFormValues = z.infer<typeof adjustmentsSchema>;

/** Converte um valor em reais do backend para o formato do CurrencyInput. */
function amountToField(value?: number | null): string {
  return value && value > 0 ? value.toFixed(2) : '';
}

const methodLabel: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  PIX: 'PIX',
};

export function BillDrawer({ sessionId, title, onClose }: BillDrawerProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);

  // Estorno e ajustes manuais são exclusivos de MANAGER/ADMIN (espelha o
  // authorize do backend).
  const canManage = role === 'MANAGER' || role === 'ADMIN';

  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

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

  const adjustmentsForm = useForm<AdjustmentsFormValues>({
    resolver: zodResolver(adjustmentsSchema),
    defaultValues: { discount: '', extraCharge: '', extraChargeNote: '' },
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

  // Ajustes manuais (MANAGER/ADMIN): envia ao backend e recarrega o bill.
  const saveAdjustments = useMutation({
    mutationFn: (values: AdjustmentsFormValues) =>
      updateSessionAdjustments(sessionId ?? '', {
        discountAmount: Number(values.discount || 0),
        extraChargeAmount: Number(values.extraCharge || 0),
        extraChargeNote: values.extraChargeNote.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['table-sessions', sessionId] });
      showToast('success', 'Ajustes da comanda atualizados.');
    },
    onError: (error: Error) => {
      showToast('error', error.message);
    },
  });

  // Estorno de pagamento (MANAGER/ADMIN): remove o pagamento e o backend
  // devolve o saldo recalculado da comanda.
  const removePayment = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: (result) => {
      setPaymentToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['table-sessions', sessionId] });
      showToast(
        'success',
        result.settled
          ? 'Estorno realizado. A comanda está quitada.'
          : `Estorno realizado. Falta pagar ${formatBRL(Math.max(0, result.remaining))}.`,
      );
    },
    onError: (error: Error) => {
      setPaymentToDelete(null);
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

  // Total da comanda (null enquanto o bill carrega): necessário para calcular
  // o troco. Sem ele, o troco apareceria como o valor total pago pelo cliente.
  const billTotal = summary ? summary.total : null;

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

  // Sincroniza o formulário de ajustes com os valores persistidos da comanda.
  // Depende de `updatedAt` (só muda após escrita no servidor) para não apagar
  // o que o utilizador está a digitar num refetch de foco.
  const sessionUpdatedAt = bill?.session.updatedAt;
  useEffect(() => {
    if (!bill) {
      return;
    }
    adjustmentsForm.reset({
      discount: amountToField(bill.session.discountAmount),
      extraCharge: amountToField(bill.session.extraChargeAmount),
      extraChargeNote: bill.session.extraChargeNote ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionUpdatedAt, adjustmentsForm]);

  return (
    <Drawer
      open={Boolean(sessionId)}
      onClose={() => {
        // Com a confirmação de estorno aberta, o Esc/clique de fundo deve
        // fechá-la (e não o drawer por baixo); durante o pedido, ignora.
        if (paymentToDelete) {
          if (!removePayment.isPending) {
            setPaymentToDelete(null);
          }
          return;
        }
        onClose();
      }}
      placement="right"
      size="lg"
      title={`Conta · ${title}`}
      footer={
        bill && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-base font-bold text-stone-900">
              <span>Total da comanda</span>
              <span>{formatBRL(summary?.total ?? 0)}</span>
            </div>
            {(summary?.total ?? 0) === 0 && (
              <p className="text-xs text-stone-500">
                Sem consumo: o fecho é permitido e libera a mesa.
              </p>
            )}
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
        {intent && <BillIntentAlert intent={intent} total={billTotal} />}

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
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
              {(summary?.discount ?? 0) > 0 && (
                <div className="mb-1 flex items-center justify-between text-sm text-stone-600">
                  <span>Desconto</span>
                  <span className="font-semibold text-success-700">
                    −{formatBRL(summary?.discount ?? 0)}
                  </span>
                </div>
              )}
              {(summary?.extraCharge ?? 0) > 0 && (
                <div className="mb-1 flex items-center justify-between text-sm text-stone-600">
                  <span>
                    Acréscimo
                    {summary?.extraChargeNote ? (
                      <span className="block text-xs text-stone-400">
                        {summary.extraChargeNote}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-semibold text-stone-900">
                    +{formatBRL(summary?.extraCharge ?? 0)}
                  </span>
                </div>
              )}
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

          {/* Ajustes manuais (MANAGER/ADMIN) */}
          {canManage && (
            <section aria-label="Ajustes da comanda">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-stone-900">
                <SlidersHorizontal className="size-4 text-stone-400" aria-hidden="true" />
                Ajustes
              </h3>
              <form
                className="space-y-3 rounded-xl border border-stone-100 bg-white p-3"
                onSubmit={(event) => {
                  void adjustmentsForm.handleSubmit((values) =>
                    saveAdjustments.mutate(values),
                  )(event);
                }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <CurrencyInput
                    id="adjustment-discount"
                    label="Desconto"
                    value={adjustmentsForm.watch('discount')}
                    onValueChange={(value) =>
                      adjustmentsForm.setValue('discount', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    error={adjustmentsForm.formState.errors.discount?.message}
                    placeholder="0,00"
                    disabled={saveAdjustments.isPending}
                  />
                  <CurrencyInput
                    id="adjustment-extra"
                    label="Acréscimo"
                    value={adjustmentsForm.watch('extraCharge')}
                    onValueChange={(value) =>
                      adjustmentsForm.setValue('extraCharge', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    error={adjustmentsForm.formState.errors.extraCharge?.message}
                    placeholder="0,00"
                    disabled={saveAdjustments.isPending}
                  />
                </div>
                <Input
                  id="adjustment-note"
                  label="Motivo do acréscimo"
                  placeholder="Ex.: couvert, taxa extra"
                  hint="Obrigatório quando houver acréscimo."
                  error={adjustmentsForm.formState.errors.extraChargeNote?.message}
                  disabled={saveAdjustments.isPending}
                  {...adjustmentsForm.register('extraChargeNote')}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  className="w-full"
                  disabled={saveAdjustments.isPending || !adjustmentsForm.formState.isDirty}
                  loading={saveAdjustments.isPending}
                >
                  <Percent className="size-4" aria-hidden="true" />
                  Salvar ajustes
                </Button>
              </form>
            </section>
          )}

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
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">
                        {formatBRL(payment.amount)}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          aria-label={`Estornar pagamento de ${formatBRL(payment.amount)}`}
                          title="Estornar pagamento"
                          disabled={removePayment.isPending}
                          onClick={() => setPaymentToDelete(payment)}
                          className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Método"
                  id="payment-method"
                  options={[
                    { value: 'CASH', label: 'Dinheiro' },
                    { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
                    { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
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

      {/* Confirmação de estorno (MANAGER/ADMIN) */}
      <Modal
        open={paymentToDelete !== null}
        onClose={() => {
          if (!removePayment.isPending) {
            setPaymentToDelete(null);
          }
        }}
        title="Estornar pagamento"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={removePayment.isPending}
              onClick={() => setPaymentToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={removePayment.isPending}
              onClick={() => paymentToDelete && removePayment.mutate(paymentToDelete.id)}
            >
              Estornar
            </Button>
          </div>
        }
      >
        {paymentToDelete && (
          <Alert variant="warning">
            O pagamento de{' '}
            <strong className="font-semibold">{formatBRL(paymentToDelete.amount)}</strong> (
            {methodLabel[paymentToDelete.method]}) será removido da comanda. Esta ação não pode ser
            desfeita.
          </Alert>
        )}
      </Modal>
    </Drawer>
  );
}

/**
 * Intenção de pagamento informada pelo cliente ao pedir a conta.
 *
 * O `changeRequested` é o valor que o cliente entregó/vai entregar
 * ("Precisa de troco para quanto?"), então o troco a devolver é
 * `changeRequested − total da comanda`. A conta é feita aqui apenas para
 * EXIBIÇÃO ao garçom — o fechamento e a conciliação continuam no backend
 * (que recalcula tudo e bloqueia o fechamento se o pagamento for
 * insuficiente).
 */
function BillIntentAlert({
  intent,
  total,
}: {
  intent: BillRequestIntent;
  /** Total do bill; null enquanto a conta carrega. */
  total: number | null;
}) {
  const label = intent.paymentMethodIntent ? methodLabel[intent.paymentMethodIntent] : 'não informado';

  // Troco em centavos (inteiros) para evitar ruído de ponto flutuante.
  const changeCents =
    intent.changeRequested != null && total != null
      ? Math.round(intent.changeRequested * 100) - Math.round(total * 100)
      : null;

  return (
    <Alert variant="warning" title="Intenção de pagamento do cliente" className="mb-4">
      <p className="font-semibold">
        O cliente informou: {label}
        {intent.changeRequested != null && ` — Pagou com ${formatBRL(intent.changeRequested)}`}
      </p>

      {changeCents != null && changeCents > 0 && (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-base font-bold text-primary-800">
          Troco a devolver: {formatBRL(changeCents / 100)}
        </p>
      )}

      {changeCents != null && changeCents <= 0 && (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700">
          O valor informado é insuficiente para a conta. Faltam{' '}
          {formatBRL(Math.abs(changeCents) / 100)}.
        </p>
      )}

      {intent.changeRequested != null && total == null && (
        <p className="mt-2 text-xs opacity-80">Calculando o troco…</p>
      )}

      <p className="mt-2 text-xs opacity-80">Confirme com o cliente antes do fechamento.</p>
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
