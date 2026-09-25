import { randomUUID } from 'node:crypto';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import { emitToEstablishment } from '../realtime/socket.js';
import type { CreatePublicOrderInput } from './public.schemas.js';

/**
 * Service do fluxo público (cliente).
 *
 * REGRA DE OURO: o frontend envia apenas IDs e quantidades.
 * O backend busca os preços atuais no banco e recalcula tudo.
 */

function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

// ---------------------------------------------------------------
// Cardápio público
// ---------------------------------------------------------------

/**
 * GET /public/menu/:slug
 * Retorna estabelecimento (ativo) + categorias ativas + produtos
 * disponíveis (active=true AND available=true), com variantes e
 * grupos de adicionais para montagem do cardápio no cliente.
 */
export async function getPublicMenu(slug: string) {
  const establishment = await prisma.establishment.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      bannerUrl: true,
      description: true,
      phone: true,
      whatsapp: true,
      address: true,
      city: true,
      state: true,
      serviceFeeEnabled: true,
      serviceFeeRate: true,
    },
  });

  if (!establishment) {
    throw new AppError(404, 'ESTABLISHMENT_NOT_FOUND', 'Estabelecimento não encontrado.');
  }

  const categories = await prisma.category.findMany({
    where: {
      establishmentId: establishment.id,
      active: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      displayOrder: true,
      products: {
        where: { active: true, available: true },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          price: true,
          promotionalPrice: true,
          preparationTime: true,
          ingredients: true,
          allergens: true,
          displayOrder: true,
          featured: true,
          variants: {
            where: { active: true },
            orderBy: { displayOrder: 'asc' },
            select: { id: true, name: true, price: true, displayOrder: true },
          },
          modifierGroups: {
            orderBy: { displayOrder: 'asc' },
            select: {
              modifierGroup: {
                select: {
                  id: true,
                  name: true,
                  selectionType: true,
                  minSelections: true,
                  maxSelections: true,
                  modifiers: {
                    where: { active: true },
                    orderBy: { name: 'asc' },
                    select: { id: true, name: true, price: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  return {
    establishment: {
      ...establishment,
      serviceFeeRate: normalizePrice(establishment.serviceFeeRate),
    },
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      displayOrder: category.displayOrder,
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        price: normalizePrice(product.price),
        promotionalPrice: normalizePrice(product.promotionalPrice),
        preparationTime: product.preparationTime,
        ingredients: product.ingredients,
        allergens: product.allergens,
        displayOrder: product.displayOrder,
        featured: product.featured,
        variants: product.variants.map((variant) => ({
          ...variant,
          price: normalizePrice(variant.price),
        })),
        modifierGroups: product.modifierGroups.map(({ modifierGroup }) => ({
          id: modifierGroup.id,
          name: modifierGroup.name,
          selectionType: modifierGroup.selectionType,
          minSelections: modifierGroup.minSelections,
          maxSelections: modifierGroup.maxSelections,
          modifiers: modifierGroup.modifiers.map((modifier) => ({
            ...modifier,
            price: normalizePrice(modifier.price),
          })),
        })),
      })),
    })),
  };
}

// ---------------------------------------------------------------
// Sessão da mesa (comanda)
// ---------------------------------------------------------------

/**
 * GET /public/table/:qrCode
 *
 * Identifica a mesa pelo qrCode (estabelecimento ativo).
 * Se não existir uma TableSession com status OPEN para a mesa,
 * cria uma automaticamente. Retorna mesa + sessionToken.
 */
export async function getOrCreateTableSession(qrCode: string) {
  const table = await prisma.table.findFirst({
    where: { qrCode, active: true },
    include: {
      area: { select: { id: true, name: true } },
      establishment: { select: { id: true, name: true, status: true, slug: true } },
    },
  });

  if (!table) {
    throw new AppError(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
  }

  if (table.establishment.status !== 'ACTIVE') {
    throw new AppError(403, 'ESTABLISHMENT_INACTIVE', 'Estabelecimento inativo.');
  }

  // Reutiliza sessão OPEN existente da mesa (comanda em aberto).
  let session = await prisma.tableSession.findFirst({
    where: { tableId: table.id, status: 'OPEN' },
    select: { id: true, sessionToken: true },
  });

  if (!session) {
    // Abre a comanda e marca a mesa como OCCUPIED de forma atômica.
    // (A mesa só volta para AVAILABLE após o fechamento da sessão.)
    const [created] = await prisma.$transaction([
      prisma.tableSession.create({
        data: {
          tableId: table.id,
          establishmentId: table.establishmentId,
          sessionToken: randomUUID(),
          status: 'OPEN',
        },
        select: { id: true, sessionToken: true },
      }),
      prisma.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
        select: { id: true },
      }),
    ]);
    session = created;
  }

  return {
    table: {
      id: table.id,
      number: table.number,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      area: table.area,
    },
    establishment: {
      id: table.establishment.id,
      name: table.establishment.name,
      slug: table.establishment.slug,
    },
    sessionToken: session.sessionToken,
  };
}

// ---------------------------------------------------------------
// Criação de pedido público
// ---------------------------------------------------------------

type CartItem = CreatePublicOrderInput['items'][number];

/** Valida sessão aberta e retorna sessão + mesa + estabelecimento. */
async function resolveSession(tableSessionToken: string) {
  const session = await prisma.tableSession.findFirst({
    where: { sessionToken: tableSessionToken },
    include: {
      table: { select: { id: true, number: true, establishmentId: true } },
      establishment: { select: { id: true, status: true, serviceFeeEnabled: true, serviceFeeRate: true } },
    },
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sessão da mesa não encontrada.');
  }

  if (session.status !== 'OPEN') {
    throw new AppError(409, 'SESSION_CLOSED', 'A sessão desta mesa está encerrada.');
  }

  if (session.establishment.status !== 'ACTIVE') {
    throw new AppError(403, 'ESTABLISHMENT_INACTIVE', 'Estabelecimento inativo.');
  }

  return session;
}

/**
 * Busca os produtos com preços atuais, variantes e grupos de
 * adicionais, validando disponibilidade e tenant.
 */
async function fetchProductsWithPrices(establishmentId: string, items: CartItem[]) {
  const productIds = [...new Set(items.map((item) => item.productId))];

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      establishmentId,
      active: true,
      available: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      promotionalPrice: true,
      categoryId: true,
      variants: {
        select: { id: true, name: true, price: true, active: true },
      },
      modifierGroups: {
        select: {
          modifierGroup: {
            select: {
              id: true,
              name: true,
              selectionType: true,
              minSelections: true,
              maxSelections: true,
              modifiers: {
                select: { id: true, name: true, price: true, active: true },
              },
            },
          },
        },
      },
    },
  });

  return products;
}

/** Valida itens e monta o carrinho com preços recalculados do banco. */
function buildCartItems(
  products: Awaited<ReturnType<typeof fetchProductsWithPrices>>,
  items: CartItem[],
) {
  const cart: {
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes: string | null;
    modifiers: {
      modifierId: string;
      modifierName: string;
      price: number;
      quantity: number;
    }[];
  }[] = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      throw new AppError(400, 'PRODUCT_UNAVAILABLE', 'Produto indisponível.');
    }

    // Base do preço: promoção vigente OU preço atual do produto no banco.
    const basePrice = product.promotionalPrice !== null
      ? Number(product.promotionalPrice)
      : Number(product.price);

    // Variação: preço da variação substitui o preço base.
    let unitPrice = basePrice;
    let variantId: string | null = null;
    let variantName: string | null = null;

    if (item.variantId) {
      const variant = product.variants.find((v) => v.id === item.variantId);

      if (!variant || !variant.active) {
        throw new AppError(400, 'VARIANT_NOT_FOUND', 'Variação indisponível.');
      }

      unitPrice = Number(variant.price);
      variantId = variant.id;
      variantName = variant.name;
    }

    // Adicionais: validar vínculo com grupos do produto + regras do grupo.
    const modifierIds = item.modifierIds ?? [];
    const availableModifiers = product.modifierGroups.flatMap(({ modifierGroup }) =>
      modifierGroup.modifiers.filter((m) => m.active),
    );

    const modifiers = modifierIds.map((modifierId) => {
      const modifier = availableModifiers.find((m) => m.id === modifierId);

      if (!modifier) {
        throw new AppError(
          400,
          'MODIFIER_UNAVAILABLE',
          'Adicional indisponível para este produto.',
        );
      }

      return {
        modifierId: modifier.id,
        modifierName: modifier.name,
        price: Number(modifier.price),
        quantity: 1,
      };
    });

    // Regras por grupo (SINGLE/MULTIPLE, min/max).
    for (const { modifierGroup } of product.modifierGroups) {
      const selectedInGroup = modifierIds.filter((id) =>
        modifierGroup.modifiers.some((m) => m.id === id && m.active),
      );

      const selections = selectedInGroup.length;
      const { minSelections, maxSelections, selectionType } = modifierGroup;

      if (selections === 0) {
        continue;
      }

      if (selectionType === 'SINGLE' && selections > 1) {
        throw new AppError(
          400,
          'MODIFIER_GROUP_SINGLE',
          `Selecione apenas um adicional do grupo "${modifierGroup.name}".`,
        );
      }

      if (maxSelections !== null && selections > maxSelections) {
        throw new AppError(
          400,
          'MODIFIER_GROUP_MAX',
          `Máximo de ${maxSelections} adicional(is) no grupo "${modifierGroup.name}".`,
        );
      }
    }

    // Mínimos do grupo (minSelections) fora da checagem acima (se não selecionado).
    for (const { modifierGroup } of product.modifierGroups) {
      const selectedInGroup = modifierIds.filter((id) =>
        modifierGroup.modifiers.some((m) => m.id === id && m.active),
      ).length;

      if (modifierGroup.minSelections > 0 && selectedInGroup < modifierGroup.minSelections) {
        throw new AppError(
          400,
          'MODIFIER_GROUP_MIN',
          `Selecione ao menos ${modifierGroup.minSelections} adicional(is) do grupo "${modifierGroup.name}".`,
        );
      }
    }

    const modifiersTotal = modifiers.reduce((sum, modifier) => sum + modifier.price, 0);
    const unitPriceWithModifiers = unitPrice + modifiersTotal;
    const totalPrice = unitPriceWithModifiers * item.quantity;

    cart.push({
      productId: product.id,
      productName: product.name,
      variantId,
      variantName,
      quantity: item.quantity,
      unitPrice: unitPriceWithModifiers,
      totalPrice: round2(totalPrice),
      notes: item.notes ?? null,
      modifiers,
    });
  }

  return cart;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * POST /public/orders
 *
 * Regra de ouro: preços SEMPRE recalculados no servidor a partir
 * do banco; o corpo traz apenas IDs e quantidades.
 */
export async function createPublicOrder(input: CreatePublicOrderInput) {
  const session = await resolveSession(input.tableSessionToken);
  const establishmentId = session.establishmentId;
  const tableId = session.table.id;

  const products = await fetchProductsWithPrices(establishmentId, input.items);
  const cart = buildCartItems(products, input.items);

  const subtotal = round2(cart.reduce((sum, item) => sum + item.totalPrice, 0));

  // Taxa de serviço configurada no estabelecimento.
  const serviceFeeEnabled = session.establishment.serviceFeeEnabled;
  const serviceFeeRate = Number(session.establishment.serviceFeeRate ?? 0);
  const serviceFee = serviceFeeEnabled ? round2(subtotal * (serviceFeeRate / 100)) : 0;

  const total = round2(subtotal + serviceFee);

  // Número sequencial do pedido dentro do estabelecimento.
  const lastOrder = await prisma.order.findFirst({
    where: { establishmentId },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

  // Persistência atômica: pedido + itens + adicionais + snapshots.
  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        establishmentId,
        tableId,
        tableSessionId: session.id,
        orderNumber,
        status: 'PENDING',
        subtotal,
        discount: 0,
        serviceFee,
        total,
        notes: input.notes ?? null,
        items: {
          create: cart.map((item) => ({
            productId: item.productId,
            productVariantId: item.variantId,
            quantity: item.quantity,
            // Snapshots históricos inalteráveis:
            productName: item.productName,
            variantName: item.variantName,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            modifiers: {
              create: item.modifiers.map((modifier) => ({
                modifierId: modifier.modifierId,
                // Snapshot do adicional:
                modifierName: modifier.modifierName,
                price: modifier.price,
                quantity: modifier.quantity,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: { modifiers: true },
        },
      },
    });
  });

  // Realtime: envia o pedido recém-criado para a sala do estabelecimento.
  const eventPayload = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    tableId: order.tableId,
    tableSessionId: order.tableSessionId,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    serviceFee: Number(order.serviceFee),
    serviceFeeEnabled,
    serviceFeeRate,
    total: Number(order.total),
    notes: order.notes,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      modifiers: item.modifiers.map((modifier) => ({
        id: modifier.id,
        modifierName: modifier.modifierName,
        price: Number(modifier.price),
      })),
    })),
  };

  emitToEstablishment(establishmentId, 'NEW_ORDER', eventPayload);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    tableId: order.tableId,
    tableSessionId: order.tableSessionId,
    subtotal,
    serviceFee,
    serviceFeeEnabled,
    serviceFeeRate,
    total,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      modifiers: item.modifiers.map((modifier) => ({
        id: modifier.id,
        modifierName: modifier.modifierName,
        price: Number(modifier.price),
      })),
    })),
  };
}
