import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { OrderStatus, TableStatus } from '../types/domain.js';

/**
 * Chave do item no carrinho: produto + adicionais (ordem estável).
 * Itens idênticos são agrupados (quantidade soma).
 */
function buildItemKey(productId: string, modifierIds: string[]): string {
  const mods = [...modifierIds].sort().join(',');
  return `${productId}::${mods}`;
}

export interface CartModifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  key: string;
  productId: string;
  productName: string;
  modifiers: CartModifier[];
  quantity: number;
  /** Preço unitário exibido do produto SEM adicionais — apresentação. */
  unitPrice: number;
}

export interface LocalOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

/** Contexto da comanda aberta via QR Code (GET /public/table/:qrCode). */
export interface TableContext {
  sessionToken: string;
  tableId: string;
  tableNumber: string;
  tableName: string | null;
  tableStatus: TableStatus;
  areaName: string | null;
  establishmentId: string;
  establishmentName: string;
  establishmentSlug: string;
}

interface CustomerState {
  context: TableContext | null;
  cart: CartItem[];
  orders: LocalOrder[];
  billRequested: boolean;
  setContext: (ctx: TableContext) => void;
  clearContext: () => void;
  addToCart: (item: CartItem) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  addOrder: (order: LocalOrder) => void;
  setBillRequested: (value: boolean) => void;
}

export const customerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      context: null,
      cart: [],
      orders: [],
      billRequested: false,

      setContext: (ctx) =>
        set((state) => {
          // Troca de mesa/comanda: descarta dados da sessão anterior.
          const changed = state.context?.sessionToken !== ctx.sessionToken;
          return {
            context: ctx,
            cart: changed ? [] : state.cart,
            orders: changed ? [] : state.orders,
            billRequested: changed ? false : state.billRequested,
          };
        }),

      clearContext: () => set({ context: null, cart: [], orders: [], billRequested: false }),

      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((cartItem) => cartItem.key === item.key);
          if (existing) {
            return {
              cart: state.cart.map((cartItem) =>
                cartItem.key === item.key
                  ? { ...cartItem, quantity: Math.min(99, cartItem.quantity + item.quantity) }
                  : cartItem,
              ),
            };
          }
          return { cart: [...state.cart, item] };
        }),

      updateQuantity: (key, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter((item) => item.key !== key)
              : state.cart.map((item) =>
                  item.key === key ? { ...item, quantity: Math.min(99, quantity) } : item,
                ),
        })),

      removeItem: (key) =>
        set((state) => ({ cart: state.cart.filter((item) => item.key !== key) })),

      clearCart: () => set({ cart: [] }),

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders.filter((existing) => existing.id !== order.id)],
        })),

      setBillRequested: (value) => set({ billRequested: value }),
    }),
    {
      name: 'cardapio.customer',
    },
  ),
);

export function cartItemKey(productId: string, modifierIds: string[]): string {
  return buildItemKey(productId, modifierIds);
}

/** Subtotal EXIBIDO (estimativa) — valores finais são recalculados pelo backend. */
export function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    const modifiersTotal = item.modifiers.reduce((acc, modifier) => acc + modifier.price, 0);
    return sum + (item.unitPrice + modifiersTotal) * item.quantity;
  }, 0);
}

export function useCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Pequeno helper reativo: expõe o store como hook (evita importar o objeto cru).
export function useCustomerStore(): CustomerState {
  return customerStore();
}
