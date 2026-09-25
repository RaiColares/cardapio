import { useEffect, useState } from 'react';

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
}

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
 * Modal de solicitação de conta: pergunta a intenção de pagamento.
 *
 * Como o backend aceita CASH | CARD | PIX, "Cartão de Crédito" e
 * "Cartão de Débito" são enviados como CARD (a forma exata é definida
 * com o garçom no fechamento). Para Dinheiro, o cliente pode informar
 * "Precisa de troco para quanto?" (opcional).
 */
export function RequestBillModal({
  open,
  pending,
  onClose,
  onConfirm,
}: RequestBillModalProps) {
  const [option, setOption] = useState<IntentOption>('PIX');
  const [change, setChange] = useState('');

  // Sincroniza o estado ao abrir para nunca exibir resíduo de outra sessão.
  useEffect(() => {
    if (open) {
      setOption('PIX');
      setChange('');
    }
  }, [open]);

  function handleConfirm() {
    if (option === 'CASH') {
      onConfirm({
        paymentMethodIntent: 'CASH',
        changeRequested: change ? Number(change) : null,
      });
      return;
    }
    onConfirm({ paymentMethodIntent: 'CARD', changeRequested: null });
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
            disabled={pending}
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
          {OPTIONS.map(({ value, label, description }) => {
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