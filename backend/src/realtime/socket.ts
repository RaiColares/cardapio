import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';

/**
 * Infraestrutura Realtime (WebSocket via socket.io).
 *
 * - Servidor anexado ao mesmo HTTP server do Express.
 * - Salas:
 *   - `room_est_{establishmentId}`  → painéis do estabelecimento
 *   - `room_table_{tableId}`        → cliente/mesa específica
 *   - `room_session_{sessionId}`    → comanda/sessão específica
 * - Eventos emitidos: NEW_ORDER, ORDER_STATUS_UPDATED, etc.
 */

let io: SocketIOServer | null = null;

export const ROOM_PREFIX = 'room_est_';
export const TABLE_ROOM_PREFIX = 'room_table_';
export const SESSION_ROOM_PREFIX = 'room_session_';

export function establishmentRoom(establishmentId: string): string {
  return `${ROOM_PREFIX}${establishmentId}`;
}

export function tableRoom(tableId: string): string {
  return `${TABLE_ROOM_PREFIX}${tableId}`;
}

export function sessionRoom(sessionId: string): string {
  return `${SESSION_ROOM_PREFIX}${sessionId}`;
}

/**
 * Inicializa o socket.io sobre o HTTP server existente.
 * Deve ser chamado uma única vez no bootstrap (main.ts).
 */
export function initRealtime(server: HttpServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket: Socket) => {
    // Painel do estabelecimento: socket.emit('join_establishment', id)
    socket.on('join_establishment', (establishmentId: unknown) => {
      if (typeof establishmentId === 'string' && establishmentId.trim() !== '') {
        void socket.join(establishmentRoom(establishmentId.trim()));
        socket.emit('joined_establishment', { establishmentId: establishmentId.trim() });
      }
    });

    // Mesa específica (cliente): socket.emit('join_table', tableId)
    socket.on('join_table', (tableId: unknown) => {
      if (typeof tableId === 'string' && tableId.trim() !== '') {
        void socket.join(tableRoom(tableId.trim()));
        socket.emit('joined_table', { tableId: tableId.trim() });
      }
    });

    // Comanda/sessão específica (cliente): socket.emit('join_session', sessionId)
    socket.on('join_session', (sessionId: unknown) => {
      if (typeof sessionId === 'string' && sessionId.trim() !== '') {
        void socket.join(sessionRoom(sessionId.trim()));
        socket.emit('joined_session', { sessionId: sessionId.trim() });
      }
    });

    socket.on('disconnect', () => {
      // Sem ação adicional por ora.
    });
  });

  console.log('[realtime] WebSocket (socket.io) pronto');
  return io;
}

/**
 * Emite um evento para todos os sockets da sala de um estabelecimento.
 */
export function emitToEstablishment<T>(establishmentId: string, event: string, payload: T) {
  if (!io) {
    return;
  }
  io.to(establishmentRoom(establishmentId)).emit(event, payload);
}

/**
 * Emite um evento para uma sala qualquer (ex.: room_table_, room_session_).
 */
export function emitToRoom<T>(room: string, event: string, payload: T) {
  if (!io) {
    return;
  }
  io.to(room).emit(event, payload);
}
