/**
 * Tipos de domínio exibidos pela interface.
 *
 * ATENÇÃO: o backend é a autoridade sobre preços, disponibilidade e status.
 * Estes tipos servem apenas para modelar a apresentação; valores financeiros
 * exibidos nunca são calculados como verdade no frontend.
 */

export type Role = 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN';

/** Usuário autenticado, conforme resposta de POST /auth/login. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  establishmentId: string;
}

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
}

export interface TableInfo {
  id: string;
  number: string;
  name?: string;
  areaName?: string;
}

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'NEW_ORDER'
  | 'PREPARING'
  | 'READY'
  | 'BILL_REQUESTED';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  displayOrder: number;
}

export type ProductAvailability = 'available' | 'unavailable';

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  /** Valor em reais, conforme devolvido pela API (o frontend nunca calcula preço). */
  price: number;
  promotionalPrice?: number;
  featured?: boolean;
  available: ProductAvailability;
  displayOrder: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: number;
  tableLabel: string;
  status: OrderStatus;
  itemsCount: number;
  total: number;
  createdAt: string;
}

/* ============================================================
   Tipos da API administrativa (admin/manager) — espelham os
   contratos do backend (categorias, produtos, dashboard).
   ============================================================ */

export interface DashboardMetrics {
  date: string; // YYYY-MM-DD no fuso do dashboard
  timezoneOffsetMinutes: number;
  totalRevenueToday: number;
  activeSessionsCount: number;
  pendingOrdersCount: number;
}

/** Entrada de auditoria, conforme GET /reports/audit (últimas 100 ações). */
export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown; // Json do Prisma; apresentado de forma compacta
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

export interface ApiCategory {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  icon: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface ApiProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  promotionalPrice: number | null;
  preparationTime: number | null;
  ingredients: string | null;
  allergens: string | null;
  displayOrder: number;
  featured: boolean;
  active: boolean;
  available: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
}

export interface ApiArea {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { tables: number };
}

export interface ApiTable {
  id: string;
  number: string;
  name: string | null;
  capacity: number;
  status: TableStatus;
  qrCode: string;
  active: boolean;
  areaId: string;
  createdAt: string;
  updatedAt: string;
  area: { id: string; name: string };
  /** FASE 23 — garçons vinculados à mesa (NxN). Vazio/ausente = sem vínculo. */
  waiters?: { id: string; name: string }[];
  /**
   * FASE 23 — id da TableSession com status OPEN (null/ausente = sem comanda
   * aberta). Permite abrir a conta e fechar mesas sem consumo.
   */
  activeSessionId?: string | null;
}

/* ============================================================
   Tipos do MENU PÚBLICO (experiência do cliente — sem JWT).
   Espelham os contratos de backend/src/public/*.
   Preços/serviço exibidos são apenas apresentação; o backend
   recalcula tudo e é a autoridade.
   ============================================================ */

export interface MenuEstablishment {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  serviceFeeEnabled: boolean;
  serviceFeeRate: number | null;
  /**
   * FASE 24 — métodos de pagamento aceites pelo estabelecimento
   * (CASH | CREDIT_CARD | DEBIT_CARD | PIX). Opcional: só presente quando a API pública do
   * cardápio expõe o campo (contrato futuro do GET /public/menu).
   */
  acceptedPaymentMethods?: PaymentMethod[];
}

export type ModifierSelectionType = 'SINGLE' | 'MULTIPLE';

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  selectionType: ModifierSelectionType;
  minSelections: number;
  maxSelections: number | null;
  modifiers: Modifier[];
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  promotionalPrice: number | null;
  preparationTime: number | null;
  ingredients: string | null;
  allergens: string | null;
  displayOrder: number;
  featured: boolean;
  modifierGroups: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  products: MenuProduct[];
}

export interface PublicMenu {
  establishment: MenuEstablishment;
  categories: MenuCategory[];
}

export interface PublicTableResponse {
  table: {
    id: string;
    number: string;
    name: string | null;
    capacity: number;
    status: TableStatus;
    area: { id: string; name: string } | null;
  };
  establishment: { id: string; name: string; slug: string };
  sessionToken: string;
}

export interface PublicOrderModifier {
  id: string;
  modifierName: string;
  price: number;
  quantity?: number;
}

export interface PublicOrderItem {
  id: string;
  productId?: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: PublicOrderModifier[];
}

export interface PublicOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  tableId: string;
  tableSessionId: string;
  subtotal: number;
  serviceFee: number;
  serviceFeeEnabled: boolean;
  serviceFeeRate: number;
  total: number;
  createdAt: string;
  items: PublicOrderItem[];
}

export interface BillRequestResult {
  success: boolean;
  sessionId: string;
  tableId: string;
  tableNumber: string;
  tableName: string | null;
  tableStatus: TableStatus;
  /** Intenção de pagamento informada pelo cliente (FASE 22): CASH | CREDIT_CARD | DEBIT_CARD | PIX. */
  paymentMethodIntent: PaymentMethod | null;
  /** Troco solicitado (relevante apenas para CASH). */
  changeRequested: number | null;
  requestedAt: string;
}

/* ============================================================
   Tipos da OPERAÇÃO (cozinha/garçom) — espelham os contratos
   privados (JWT) de backend/src/{orders,table-sessions,payments}.
   ============================================================ */

export interface OperationalOrderModifier {
  id: string;
  modifierName: string;
  price: number;
  quantity?: number;
}

export interface OperationalOrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  createdAt?: string;
  modifiers: OperationalOrderModifier[];
}

export interface OperationalOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  table: {
    id: string;
    number: string;
    name: string | null;
    area: { id: string; name: string } | null;
  };
  tableSession: { id: string; status: string };
  items: OperationalOrderItem[];
}

export interface SessionBill {
  session: {
    id: string;
    sessionToken: string;
    status: string;
    openedAt: string;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    /** Intenção de pagamento (FASE 22) — opcional até o backend expor no bill. */
    paymentMethodIntent?: PaymentMethod | null;
    changeRequested?: number | null;
    /** FASE 23 — ajustes manuais persistidos na comanda. */
    discountAmount?: number;
    extraChargeAmount?: number;
    extraChargeNote?: string | null;
    table: {
      id: string;
      number: string;
      name: string | null;
      area?: { id: string; name: string } | null;
      waiters?: { id: string; name: string }[];
    };
    establishment: { id: string; name: string; slug: string; serviceFeeRate: number };
  };
  establishment: { id: string; name: string; serviceFeeEnabled: boolean; serviceFeeRate: number };
  summary: {
    ordersCount: number;
    itemsCount: number;
    subtotal: number;
    discount: number;
    /** FASE 23 — acréscimo manual da comanda. */
    extraCharge: number;
    extraChargeNote: string | null;
    serviceFee: number;
    serviceFeeRate: number;
    total: number;
  };
  orders: {
    id: string;
    orderNumber: number;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    serviceFee: number;
    total: number;
    notes: string | null;
    createdAt: string;
    items: {
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      modifiers: { modifierName: string; price: number; quantity: number }[];
    }[];
  }[];
  items: {
    orderId: string;
    orderNumber: number;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    modifiers: { modifierName: string; price: number; quantity: number }[];
  }[];
}

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface Payment {
  id: string;
  tableSessionId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayTransactionId: string | null;
  gatewayResponse: unknown;
  paidAt: string | null;
  failedAt: string | null;
  refundedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  amount: number;
  method: PaymentMethod;
  status: 'PENDING' | 'PAID';
  paidAt?: string | null;
}

/** Resultado do estorno (DELETE /payments/:id) — saldo recalculado no servidor. */
export interface PaymentRemovalResult {
  removedPaymentId: string;
  tableSessionId: string;
  total: number;
  paidAmount: number;
  remaining: number;
  settled: boolean;
}

/** PATCH /table-sessions/:id/adjustments — ajustes manuais da comanda. */
export interface SessionAdjustmentsInput {
  discountAmount: number;
  extraChargeAmount: number;
  extraChargeNote: string | null;
}

/* ============================================================
   Tipos do SaaS (FASE 19) — onboarding, configurações e equipe.
   Espelham os contratos de backend/src/establishments e
   backend/src/users (GET/PUT /establishments/me, /users CRUD).
   ============================================================ */

export type EstablishmentStatus = 'ACTIVE' | 'INACTIVE';

/** GET /establishments/me — configurações do estabelecimento autenticado. */
export interface EstablishmentSettings {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  serviceFeeEnabled: boolean;
  serviceFeeRate: number;
  /** FASE 24 — métodos de pagamento aceites (CASH | CREDIT_CARD | DEBIT_CARD | PIX). */
  acceptedPaymentMethods: string[];
  status: EstablishmentStatus;
  createdAt: string;
  updatedAt: string;
}

/** Roles gerenciáveis pela equipe (ADMIN nasce apenas no onboarding). */
export type TeamRole = 'MANAGER' | 'WAITER' | 'KITCHEN';

/** Membro da equipe, conforme GET /users (nunca inclui passwordHash). */
export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: TeamRole | 'ADMIN';
  phone: string | null;
  active: boolean;
  establishmentId: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /public/table-sessions/:sessionToken/orders — extrato da comanda. */
export interface SessionOrdersExtract {
  sessionId: string;
  sessionStatus: string;
  table: { id: string; number: string; name: string | null };
  orders: {
    id: string;
    orderNumber: number;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    serviceFee: number;
    total: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    items: PublicOrderItem[];
  }[];
  summary: { subtotal: number; discount: number; serviceFee: number; total: number };
}
