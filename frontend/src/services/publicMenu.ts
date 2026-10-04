import { api } from './api.js';

import type {
  BillRequestResult,
  PublicMenu,
  PublicOrder,
  PublicTableResponse,
  SessionOrdersExtract,
} from '../types/domain.js';

/**
 * Contratos públicos do cliente (sem JWT) — ver backend/src/public.
 *
 * Regra de ouro: o corpo enviado contém SOMENTE identificadores e
 * quantidades; preços são recalculados no servidor. O frontend apenas
 * exibe o que a API devolve.
 */

/** GET /public/table/:qrCode — mesa + sessão da comanda (cria se necessário). */
export async function getTableByQrCode(qrCode: string): Promise<PublicTableResponse> {
  const { data } = await api.get(`/public/table/${encodeURIComponent(qrCode)}`);
  return data.data as PublicTableResponse;
}

/** GET /public/menu/:slug — cardápio público do estabelecimento ativo. */
export async function getPublicMenu(slug: string): Promise<PublicMenu> {
  const { data } = await api.get(`/public/menu/${encodeURIComponent(slug)}`);
  return data.data as PublicMenu;
}

export interface PublicOrderPayloadItem {
  productId: string;
  modifierIds?: string[];
  quantity: number;
  notes?: string | null;
}

/** POST /public/orders — envia o pedido; backend recalcula preços e total. */
export async function createPublicOrder(
  tableSessionToken: string,
  items: PublicOrderPayloadItem[],
): Promise<PublicOrder> {
  const { data } = await api.post('/public/orders', { tableSessionToken, items });
  return data.data as PublicOrder;
}

/** GET /public/orders/:id — rastreio de um pedido da comanda. */
export async function getPublicOrder(orderId: string): Promise<PublicOrder> {
  const { data } = await api.get(`/public/orders/${orderId}`);
  return data.data as PublicOrder;
}

/** GET /public/table-sessions/:sessionToken/orders — extrato consolidado da comanda. */
export async function getSessionOrders(
  sessionToken: string,
): Promise<SessionOrdersExtract> {
  const { data } = await api.get(
    `/public/table-sessions/${encodeURIComponent(sessionToken)}/orders`,
  );
  return data.data as SessionOrdersExtract;
}

/** Body opcional de request-bill (FASE 22): intenção de pagamento do cliente. */
export interface RequestBillInput {
  paymentMethodIntent?: 'CASH' | 'CARD' | 'PIX' | null;
  changeRequested?: number | null;
}

/** POST /public/table-sessions/:sessionToken/request-bill — pedir a conta. */
export async function requestTableBill(
  sessionToken: string,
  input: RequestBillInput = {},
): Promise<BillRequestResult> {
  const { data } = await api.post(
    `/public/table-sessions/${encodeURIComponent(sessionToken)}/request-bill`,
    input,
  );
  return data.data as BillRequestResult;
}
