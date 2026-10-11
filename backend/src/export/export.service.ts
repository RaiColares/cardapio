import { Prisma } from '@prisma/client';

import { prisma } from '../common/prisma/prisma.js';

/**
 * Service do módulo de Exportação (backup estrutural do estabelecimento).
 *
 * Coleta os dados **estruturais** (cadastro/configuração) do tenant
 * autenticado para gerar um backup em CSV. O `establishmentId` vem SEMPRE
 * do JWT (nunca de query/body): um ADMIN de A jamais exporta dados de B.
 *
 * Decisão de escopo (FASE 28): "dados estruturais" = o que o cliente
 * cadastrou — Estabelecimento, Equipe, Áreas, Mesas, Categorias e
 * Produtos. Dados operacionais/históricos (pedidos, comandas, pagamentos,
 * auditoria) NÃO entram neste backup: eles já têm exportação própria
 * (relatório de vendas em `/dashboard/sales/export`) e crescem sem limite.
 *
 * A leitura roda em uma única `$transaction` (snapshot consistente):
 * todas as tabelas são lidas sob o mesmo ponto no tempo, evitando uma
 * exportação "rasgada" (ex.: um produto referenciando uma categoria que
 * sumiu no meio da coleta).
 */

/** Campos exportados de cada modelo (NUNCA inclui `passwordHash`). */
const establishmentSelect = {
  id: true,
  name: true,
  slug: true,
  phone: true,
  whatsapp: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  serviceFeeEnabled: true,
  serviceFeeRate: true,
  acceptedPaymentMethods: true,
  createdAt: true,
} satisfies Prisma.EstablishmentSelect;

const teamSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  active: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const areaSelect = {
  id: true,
  name: true,
  description: true,
  active: true,
  createdAt: true,
} satisfies Prisma.AreaSelect;

const tableSelect = {
  id: true,
  number: true,
  name: true,
  capacity: true,
  status: true,
  active: true,
  qrCode: true,
  area: { select: { name: true } },
  createdAt: true,
} satisfies Prisma.TableSelect;

const categorySelect = {
  id: true,
  name: true,
  description: true,
  displayOrder: true,
  active: true,
  createdAt: true,
} satisfies Prisma.CategorySelect;

const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  promotionalPrice: true,
  preparationTime: true,
  ingredients: true,
  allergens: true,
  displayOrder: true,
  featured: true,
  active: true,
  available: true,
  category: { select: { name: true } },
  createdAt: true,
} satisfies Prisma.ProductSelect;

/**
 * Estrutura do backup. Derivada dos próprios `select` (via GetPayload) para
 * que o tipo nunca divirja da consulta — o controller consome exatamente os
 * campos selecionados aqui.
 */
export interface EstablishmentBackup {
  establishment: Prisma.EstablishmentGetPayload<{
    select: typeof establishmentSelect;
  }> | null;
  users: Prisma.UserGetPayload<{ select: typeof teamSelect }>[];
  areas: Prisma.AreaGetPayload<{ select: typeof areaSelect }>[];
  tables: Prisma.TableGetPayload<{ select: typeof tableSelect }>[];
  categories: Prisma.CategoryGetPayload<{ select: typeof categorySelect }>[];
  products: Prisma.ProductGetPayload<{ select: typeof productSelect }>[];
}

/**
 * Coleta o backup estrutural do estabelecimento autenticado em uma única
 * transação (snapshot consistente).
 */
export async function getEstablishmentBackup(
  establishmentId: string,
): Promise<EstablishmentBackup> {
  const [establishment, users, areas, tables, categories, products] =
    await prisma.$transaction([
      prisma.establishment.findUnique({
        where: { id: establishmentId },
        select: establishmentSelect,
      }),
      prisma.user.findMany({
        where: { establishmentId },
        select: teamSelect,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.area.findMany({
        where: { establishmentId },
        select: areaSelect,
        orderBy: { name: 'asc' },
      }),
      prisma.table.findMany({
        where: { establishmentId },
        select: tableSelect,
        orderBy: { number: 'asc' },
      }),
      prisma.category.findMany({
        where: { establishmentId },
        select: categorySelect,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.product.findMany({
        where: { establishmentId },
        select: productSelect,
        orderBy: { name: 'asc' },
      }),
    ]);

  return { establishment, users, areas, tables, categories, products };
}
