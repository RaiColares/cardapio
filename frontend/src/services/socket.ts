import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

import { useBillIntentStore, type BillRequestIntent } from '../stores/billIntentStore.js';
import type { PaymentMethod, PaymentStatus } from '../types/domain.js';

/** URL do servidor realtime (socket.io anexado ao HTTP principal). */
export const SOCKET_URL: string = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

/**
 * Singleton do socket.io-client. A conexão é preguiçosa (connect()
 * sob demanda) e compartilhada por toda a SPA.
 *
 * Salas do backend (backend/src/realtime/socket.ts):
 *  - room_est_{establishmentId} → painéis (join_establishment)
 *  - room_table_{tableId}       → mesa específica (join_table)
 *  - room_session_{sessionId}   → comanda (join_session)
 */
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

/**
 * Realtime da operação: conecta, ingressa na sala do estabelecimento
 * e invalida automaticamente as queries quando eventos relevantes
 * chegam — sem recarregar a tela.
 *
 * Eventos observados:
 *  - NEW_ORDER             → pedido criado (cozinha/garçom)
 *  - ORDER_STATUS_UPDATED  → transição de status
 *  - BILL_REQUESTED        → cliente pediu a conta
 *  - SESSION_CLOSED        → fechamento da comanda
 */
export function useSocketEvents(establishmentId: string | null | undefined): boolean {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function invalidateAll() {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
      void queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }

    function handleConnect() {
      setConnected(true);
      if (establishmentId) {
        socket.emit('join_establishment', establishmentId);
      }
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleBillRequested(payload: BillRequestIntent) {
      invalidateAll();
      // Guarda a intenção de pagamento para o BillDrawer exibir o alerta
      // quando o garçom abrir a comanda desta mesa (FASE 22).
      if (payload?.sessionId) {
        useBillIntentStore.getState().setIntent(payload);
      }
    }

    // Garante conexão inicial (se ainda não conectado).
    if (!socket.connected) {
      socket.connect();
    }
    if (establishmentId) {
      socket.emit('join_establishment', establishmentId);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('NEW_ORDER', invalidateAll);
    socket.on('ORDER_STATUS_UPDATED', invalidateAll);
    socket.on('BILL_REQUESTED', handleBillRequested);
    socket.on('SESSION_CLOSED', invalidateAll);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('NEW_ORDER', invalidateAll);
      socket.off('ORDER_STATUS_UPDATED', invalidateAll);
      socket.off('BILL_REQUESTED', handleBillRequested);
      socket.off('SESSION_CLOSED', invalidateAll);
    };
  }, [establishmentId, queryClient]);

  return connected;
}

/* ------------------------------------------------------------------
   Realtime do CLIENTE (página pública /table/:qrCode)
   ------------------------------------------------------------------ */

/**
 * Payload do evento `PAYMENT_CONFIRMED` emitido pelo backend
 * (backend/src/payments/payments.service.ts) quando um pagamento passa a
 * `PAID`. O saldo é SEMPRE recalculado no servidor — o cliente apenas
 * apresenta.
 */
export interface PaymentConfirmedPayload {
  sessionId: string;
  payment: {
    id: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: string | null;
  };
  total: number;
  paidAmount: number;
  remaining: number;
  settled: boolean;
  confirmedAt: string;
}

/**
 * Conecta o cliente à sala da sua comanda (`room_session_{sessionId}`) e
 * sinaliza quando a conta é quitada.
 *
 * - Conecta o socket (singleton) sob demanda e emite `join_session`.
 * - Escuta `PAYMENT_CONFIRMED` e só aceita eventos da MESMA comanda.
 * - O emit de `join_session` é reenviado no `connect` (reconexões).
 *
 * Retorna `paid` (true após a confirmação) e o último pagamento recebido.
 * O estado é local (não persiste): uma nova comanda recomeça "não paga".
 */
export function useCustomerSessionSocket(sessionId: string | null | undefined): {
  paid: boolean;
  payment: PaymentConfirmedPayload | null;
} {
  const [payment, setPayment] = useState<PaymentConfirmedPayload | null>(null);
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    function joinSession() {
      socket.emit('join_session', sessionId);
      joinedRef.current = sessionId ?? null;
    }

    function handlePaymentConfirmed(payload: PaymentConfirmedPayload) {
      // Defensivo: ignora eventos de outras comandas.
      if (payload?.sessionId && payload.sessionId !== sessionId) {
        return;
      }
      setPayment(payload);
    }

    socket.on('connect', joinSession);
    socket.on('PAYMENT_CONFIRMED', handlePaymentConfirmed);

    if (socket.connected) {
      if (joinedRef.current !== sessionId) {
        joinSession();
      }
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', joinSession);
      socket.off('PAYMENT_CONFIRMED', handlePaymentConfirmed);
    };
  }, [sessionId]);

  return { paid: payment !== null, payment };
}
