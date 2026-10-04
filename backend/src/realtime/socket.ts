import type { Server as HttpServer } from 'node:http';

import type { UserRole } from '@prisma/client';
import { Server as SocketIOServer, type Socket } from 'socket.io';

import { verifyAccessToken } from '../common/auth/jwt.js';

/**
 * Infraestrutura Realtime (WebSocket via socket.io).
 *
 * - Servidor anexado ao mesmo HTTP server do Express.
 * - Salas:
 *   - `room_est_{establishmentId}`  → painéis do estabelecimento
 *   - `room_table_{tableId}`        → cliente/mesa específica
 *   - `room_session_{sessionId}`    → comanda/sessão específica
 *   - `room_user_{userId}`          → garçom autenticado (FASE 23)
 *   - `room_staff_{establishmentId}`→ ADMIN/MANAGER/KITCHEN (FASE 23)
 * - Eventos emitidos: NEW_ORDER, ORDER_STATUS_UPDATED, BILL_REQUESTED,
 *   SESSION_CLOSED, etc.
 *
 * FASE 23 — Auth opcional no handshake:
 *   `io(SOCKET_URL, { auth: { token } })` faz o socket ser identificado
 *   (JWT de acesso) e ingressar automaticamente na sala do estabelecimento
 *   e na sala do seu papel (garçom → room_user_; staff → room_staff_).
 *   Sockets sem token seguem no modo legado (público + join_establishment),
 *   preservando o cliente atual.
 */

let io: SocketIOServer | null = null;

export const ROOM_PREFIX = 'room_est_';
export const TABLE_ROOM_PREFIX = 'room_table_';
export const SESSION_ROOM_PREFIX = 'room_session_';
export const USER_ROOM_PREFIX = 'room_user_';
export const STAFF_ROOM_PREFIX = 'room_staff_';

export function establishmentRoom(establishmentId: string): string {
  return `${ROOM_PREFIX}${establishmentId}`;
}

export function tableRoom(tableId: string): string {
  return `${TABLE_ROOM_PREFIX}${tableId}`;
}

export function sessionRoom(sessionId: string): string {
  return `${SESSION_ROOM_PREFIX}${sessionId}`;
}

/** Sala individual de um usuário autenticado (ex.: garçom atribuído). */
export function userRoom(userId: string): string {
  return `${USER_ROOM_PREFIX}${userId}`;
}

/** Sala da equipe privilegiada do estabelecimento (ADMIN/MANAGER/KITCHEN). */
export function staffRoom(establishmentId: string): string {
  return `${STAFF_ROOM_PREFIX}${establishmentId}`;
}

export interface SocketUser {
  userId: string;
  establishmentId: string;
  role: UserRole;
}

/** Lê o access token do handshake (auth.token ou query.token). */
function extractHandshakeToken(socket: Socket): string | null {
  const authToken = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  if (typeof authToken === 'string' && authToken.trim() !== '') {
    return authToken.trim();
  }

  const queryToken = socket.handshake.query?.token;
  if (typeof queryToken === 'string' && queryToken.trim() !== '') {
    return queryToken.trim();
  }

  return null;
}

/** Usuário autenticado anexado ao socket (se handshake trouxe JWT válido). */
function socketUser(socket: Socket): SocketUser | undefined {
  return (socket.data as { user?: SocketUser }).user;
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

  // Autenticação OPCIONAL no handshake. Se um token for enviado, ele é
  // obrigatoriamente validado (token inválido → conexão recusada). Sem
  // token, a conexão segue anônima (fluxo público/legado).
  io.use((socket, next) => {
    const token = extractHandshakeToken(socket);

    if (!token) {
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      (socket.data as { user?: SocketUser }).user = {
        userId: payload.sub,
        establishmentId: payload.establishmentId,
        role: payload.role,
      };
      next();
    } catch {
      next(new Error('AUTH_INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socketUser(socket);

    // Sockets autenticados ingressam automaticamente nas salas do seu
    // papel — sem depender de IDs enviados pelo cliente.
    if (user) {
      void socket.join(establishmentRoom(user.establishmentId));

      if (user.role === 'WAITER') {
        void socket.join(userRoom(user.userId));
      } else {
        void socket.join(staffRoom(user.establishmentId));
      }

      socket.emit('authenticated', { userId: user.userId, role: user.role });
    }

    // Painel do estabelecimento: socket.emit('join_establishment', id)
    // (compatibilidade com clientes anônimos; o cliente atual usa este fluxo)
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

/** Emite um evento para a sala individual de um usuário. */
export function emitToUser<T>(userId: string, event: string, payload: T) {
  if (!io) {
    return;
  }
  io.to(userRoom(userId)).emit(event, payload);
}

/** Emite um evento para a equipe privilegiada (ADMIN/MANAGER/KITCHEN). */
export function emitToStaff<T>(establishmentId: string, event: string, payload: T) {
  if (!io) {
    return;
  }
  io.to(staffRoom(establishmentId)).emit(event, payload);
}

/**
 * FASE 23 — Emissão de evento vinculado a uma mesa respeitando os
 * garçons atribuídos.
 *
 * - Mesa SEM garçons vinculados → sala do estabelecimento (comportamento
 *   anterior; todos os painéis do salão recebem).
 * - Mesa COM garçons vinculados → apenas a sala individual de cada garçom
 *   atribuído + a sala da equipe privilegiada (ADMIN/MANAGER/KITCHEN).
 *
 * SEGURANÇA: o roteamento usa o vínculo persistido (nunca IDs enviados
 * pelo cliente). Sockets anônimos do cliente atual não estão em nenhuma
 * dessas salas — para receber eventos de mesas atribuídas, o frontend
 * deve autenticar o handshake (`auth.token`), o que o coloca
 * automaticamente em room_user_ / room_staff_.
 */
export function emitToTableAudience<T>(
  establishmentId: string,
  assignedWaiterIds: string[],
  event: string,
  payload: T,
) {
  if (!io) {
    return;
  }

  if (assignedWaiterIds.length === 0) {
    io.to(establishmentRoom(establishmentId)).emit(event, payload);
    return;
  }

  for (const waiterId of assignedWaiterIds) {
    io.to(userRoom(waiterId)).emit(event, payload);
  }
  io.to(staffRoom(establishmentId)).emit(event, payload);
}
