import { create } from 'zustand';

import type { PaymentMethod } from '../types/domain.js';

/**
 * Intenção de pagamento do cliente recebida via evento WS BILL_REQUESTED.
 *
 * Esse é o dado "quente" de curto prazo: chega em tempo real no momento em
 * que o cliente pede a conta (o backend emite o payload com
 * paymentMethodIntent/changeRequested na FASE 22). Mantemos por sessionId
 * para que o BillDrawer exiba o alerta mesmo se o garçom abrir a comanda
 * logo em seguida.
 */
export interface BillRequestIntent {
  sessionId: string;
  tableId: string;
  tableNumber: string;
  tableName: string | null;
  paymentMethodIntent: PaymentMethod | null;
  changeRequested: number | null;
  requestedAt: string;
}

interface BillIntentState {
  intents: Record<string, BillRequestIntent>;
  setIntent: (intent: BillRequestIntent) => void;
  clearSession: (sessionId: string) => void;
}

export const useBillIntentStore = create<BillIntentState>((set) => ({
  intents: {},

  setIntent: (intent) =>
    set((state) => ({
      intents: { ...state.intents, [intent.sessionId]: intent },
    })),

  clearSession: (sessionId) =>
    set((state) => {
      const { [sessionId]: _removed, ...rest } = state.intents;
      return { intents: rest };
    }),
}));