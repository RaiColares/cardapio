import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

import { useBillIntentStore, type BillRequestIntent } from '../stores/billIntentStore.js';

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
