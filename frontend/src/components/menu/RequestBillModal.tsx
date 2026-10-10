import { useEffect, useMemo, useState } from 'react';

import { Banknote, CreditCard, QrCode } from 'lucide-react';

import type { PaymentMethod } from '../../types/domain.js';
import { cn } from '../../utils/cn.js';
import { Button } from '../ui/Button.js';
import { CurrencyInput } from '../ui/CurrencyInput.js';
import { Modal } from '../ui/Modal.js';

/** Payload enviado para POST /public/table-sessions/:token/request-bill. */
export interface RequestBillPayload {
  paymentMethodIntent: PaymentMethod;
  /** Somente relevante para Dinheiro (CASH); null quando sem troco informado. */
  changeRequested: number | null;
}

interface RequestBillModalProps {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (payload: RequestBillPayload) => void;
  /**
   * FASE 24 — métodos de pagamento aceites pelo estabelecimento
   * (CASH | CREDIT_CARD | DEBIT_CARD | PIX). Ausente/indefinido = mostra todas as opções
   * (comportamento anterior).
   */
  acceptedMethods?: PaymentMethod[];
}

/**
 * Métodos aceites por padrão quando a API não informa
 * (ou o contrato antigo ainda não expõe o campo).
 */
const DEFAULT_ACCEPTED: PaymentMethod[] = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'];

/** Opções apresentadas ao cliente na solicitação da conta (FASE 22). */
type IntentOption = 'PIX' | 'CARD_CREDIT' | 'CARD_DEBIT' | 'CASH';

const OPTIONS: { value: IntentOption; label: string; description: string }[] = [
  { value: 'PIX', label: 'PIX', description: 'QR Code ou pix copia e cola' },
  { value: 'CARD_CREDIT', label: 'Cartão de Crédito', description: 'Aprove na maquininha' },
  { value: 'CARD_DEBIT', label: 'Cartão de Débito', description: 'Aprove na maquininha' },
  { value: 'CASH', label: 'Dinheiro', description: 'Pague em espécie' },
];

const optionIcon: Record<IntentOption, typeof QrCode> = {
  PIX: QrCode,
  CARD_CREDIT: CreditCard,
  CARD_DEBIT: CreditCard,
  CASH: Banknote,
};

  /**
   * FASE 24 — a opção do cliente é exibida somente se o método ativo
   * correspondente existir nas configurações do estabelecimento:
   * PIX → PIX, Dinheiro → CASH, Cartão de Crédito → CREDIT_CARD,
   * Cartão de Débito → DEBIT_CARD.
   */
  function isAccepted(option: IntentOption, accepted: PaymentMethod[]): boolean {
    if (option === 'CASH') return accepted.includes('CASH');
    if (option === 'PIX') return accepted.includes('PIX');
    if (option === 'CARD_CREDIT') return accepted.includes('CREDIT_CARD');
    if (option === 'CARD_DEBIT') return accepted.includes('DEBIT_CARD');
    return false;
  }

  /**
   * Modal de solicitação de conta: pergunta a intenção de pagamento.
   *
   * O backend agora distingue CREDIT_CARD e DEBIT_CARD. Enviamos a intenção
   * exata selecionada pelo cliente (Crédito → CREDIT_CARD, Débito → DEBIT_CARD,
   * PIX → PIX, Dinheiro → CASH). Para Dinheiro, o cliente pode informar
   * "Precisa de troco para quanto?" (opcional).
   */
  export function RequestBillModal({
  open,
  pending,
  onClose,
  onConfirm,
  acceptedMethods,
}: RequestBillModalProps) {
  const accepted = acceptedMethods ?? DEFAULT_ACCEPTED;

  // FASE 24 — apenas os métodos ativos do estabelecimento aparecem ao cliente.
  const availableOptions = useMemo(
    () => OPTIONS.filter((option) => isAccepted(option.value, accepted)),
    [accepted],
  );

  const [option, setOption] = useState<IntentOption>(availableOptions[0]?.value ?? 'PIX');
  const [change, setChange] = useState('');

  // Sincroniza o estado ao abrir para nunca exibir resíduo de outra sessão
  // e para nunca deixar selecionada uma opção que deixou de ser aceite.
  useEffect(() => {
    const first = availableOptions[0];
    setOption((current) =>
      current && isAccepted(current, accepted) ? current : (first?.value ?? 'PIX'),
    );
  }, [open, availableOptions, accepted]);

  useEffect(() => {
    if (open) {
      setChange('');
    }
  }, [open]);

  function handleConfirm() {
    if (option === 'PIX') {
      onConfirm({ paymentMethodIntent: 'PIX', changeRequested: null });
      return;
    }
    if (option === 'CASH') {
      onConfirm({
        paymentMethodIntent: 'CASH',
        changeRequested: change ? Number(change) : null,
      });
      return;
    }
    if (option === 'CARD_CREDIT') {
      onConfirm({ paymentMethodIntent: 'CREDIT_CARD', changeRequested: null });
      return;
    }
    if (option === 'CARD_DEBIT') {
      onConfirm({ paymentMethodIntent: 'DEBIT_CARD', changeRequested: null });
      return;
    }
  }

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title="Como deseja pagar?"
      footer={
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={pending}
            disabled={pending || availableOptions.length === 0}
            onClick={handleConfirm}
          >
            {pending ? 'Solicitando conta...' : 'Solicitar conta'}
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <p className="text-center text-xs text-stone-400">
            Você confirma a escolha no fechamento com o garçom.
          </p>
        </div>
      }
    >
      <fieldset>
        <legend className="sr-only">Método de pagamento desejado</legend>
        <div className="space-y-2">
          {availableOptions.length === 0 && (
            <p className="rounded-xl bg-stone-50 px-3 py-4 text-sm text-stone-500">
              O estabelecimento não informou métodos de pagamento aceites.
              Fale com o garçom para combinar a forma de pagamento.
            </p>
          )}
          {availableOptions.map(({ value, label, description }) => {
            const Icon = optionIcon[value];
            const selected = option === value;
            return (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-white p-3 transition-colors',
                  selected
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-stone-200 hover:border-primary-300',
                )}
              >
                <input
                  type="radio"
                  name="payment-intent"
                  value={value}
                  checked={selected}
                  onChange={() => setOption(value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                    selected ? 'bg-primary-700 text-white' : 'bg-stone-100 text-stone-500',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block font-semibold', selected ? 'text-primary-800' : 'text-stone-900')}>
                    {label}
                  </span>
                  <span className="block text-xs text-stone-500">{description}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0 rounded-full border-2',
                    selected ? 'border-primary-600 bg-primary-600' : 'border-stone-300',
                  )}
                />
              </label>
            );
          })}
        </div>
      </fieldset>

      {option === 'CASH' && (
        <div className="mt-4">
          <CurrencyInput
            id="request-bill-change"
            label="Precisa de troco para quanto?"
            hint="Opcional — deixe em branco se não precisar de troco."
            value={change}
            onValueChange={setChange}
            placeholder="0,00"
          />
        </div>
      )}
    </Modal>
  );
}