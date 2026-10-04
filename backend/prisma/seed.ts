import { randomUUID } from 'node:crypto';

import { hashPassword } from '../src/common/auth/password.js';
import { prisma } from '../src/common/prisma/prisma.js';

/**
 * Seed de desenvolvimento — FASE 12.
 *
 * Cria (ou atualiza) um estabelecimento de demonstração, os usuários
 * de teste e recria um catálogo determinístico do zero (reset do
 * tenant de demonstração), garantindo:
 *
 * - **qrCode único (UUID v4)** para cada mesa (correção da colisão
 *   entre mesas 01 e 02);
 * - dados de teste previsíveis, reutilizáveis nas fases seguintes.
 *
 * IDs determinísticos mantêm compatibilidade com os cenários de teste
 * usados desde a Fase 8 (produtos e grupo "Gelo").
 *
 * Idempotente: executar quantas vezes for necessário.
 *
 * Credenciais padrão (configuráveis via .env):
 *   admin@balneario.dev / admin12345
 *   waiter@balneario.dev / teste12345
 *   kitchen@balneario.dev / teste12345
 */

/** IDs determinísticos dos fixtures usados nos testes. */
const T = {
  areaPiscina: 'd2658003-aca7-4e57-9405-fef1f642840b',
  areaRestaurante: 'e86d11d3-f1eb-483b-b95d-6ca0b4112be4',
  catBebidas: '3f730e4d-7c35-427d-94f7-1df036d106f7',
  catPratos: 'f4498270-34af-466e-94c1-f2cdf03464c7',
  mesa01: '744e9226-e0b5-4864-ad85-54687dc6a86a',
  suco: '3ea01710-9099-4f14-a8ec-b7a592835998',
  coca: '1dd0f5bc-af6f-4994-9037-9fc09702436d',
  geloGroup: 'a1111111-1111-4111-8111-111111111111',
  geloCom: 'b2222222-2222-4222-8222-222222222222',
  geloExtra: 'c3333333-3333-4333-8333-333333333333',
};

async function main(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. Estabelecimento (upsert)
  // ---------------------------------------------------------------
  const establishment = await prisma.establishment.upsert({
    where: { slug: 'balneario-demo' },
    update: {
      name: 'Balneário Demo',
      description: 'Estabelecimento de demonstração para testes.',
      serviceFeeEnabled: true,
      serviceFeeRate: 10,
    },
    create: {
      name: 'Balneário Demo',
      slug: 'balneario-demo',
      description: 'Estabelecimento de demonstração para testes.',
      serviceFeeEnabled: true,
      serviceFeeRate: 10,
    },
  });
  const estId = establishment.id;

  // ---------------------------------------------------------------
  // 2. Usuários de teste (upsert — nunca excluídos pelo reset)
  // ---------------------------------------------------------------
  const adminHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? 'admin12345');
  const staffHash = await hashPassword('teste12345');

  await prisma.user.upsert({
    where: { email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@balneario.dev').toLowerCase() },
    update: { passwordHash: adminHash, role: 'ADMIN', active: true, establishmentId: estId },
    create: {
      email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@balneario.dev').toLowerCase(),
      name: process.env.SEED_ADMIN_NAME ?? 'Administrador',
      passwordHash: adminHash,
      role: 'ADMIN',
      active: true,
      establishmentId: estId,
    },
  });

  for (const staff of [
    { email: 'waiter@balneario.dev', name: 'Garçom Teste', role: 'WAITER' as const },
    { email: 'kitchen@balneario.dev', name: 'Cozinheiro Teste', role: 'KITCHEN' as const },
  ]) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: { passwordHash: staffHash, role: staff.role, active: true, establishmentId: estId },
      create: {
        email: staff.email,
        name: staff.name,
        passwordHash: staffHash,
        role: staff.role,
        active: true,
        establishmentId: estId,
      },
    });
  }

  // ---------------------------------------------------------------
  // 3. RESET do tenant de demonstração (limpa e recria o catálogo)
  //    Ordem respeita as dependências entre as tabelas.
  // ---------------------------------------------------------------
  await prisma.$transaction([
    prisma.orderItemModifier.deleteMany({ where: { orderItem: { order: { establishmentId: estId } } } }),
    prisma.orderItem.deleteMany({ where: { order: { establishmentId: estId } } }),
    prisma.payment.deleteMany({ where: { tableSession: { establishmentId: estId } } }),
    prisma.order.deleteMany({ where: { establishmentId: estId } }),
    prisma.tableSession.deleteMany({ where: { establishmentId: estId } }),
    prisma.productModifierGroup.deleteMany({ where: { product: { establishmentId: estId } } }),
    prisma.modifier.deleteMany({ where: { modifierGroup: { establishmentId: estId } } }),
    prisma.modifierGroup.deleteMany({ where: { establishmentId: estId } }),
    prisma.product.deleteMany({ where: { establishmentId: estId } }),
    prisma.category.deleteMany({ where: { establishmentId: estId } }),
    prisma.table.deleteMany({ where: { establishmentId: estId } }),
    prisma.area.deleteMany({ where: { establishmentId: estId } }),
  ]);

  // ---------------------------------------------------------------
  // 4. Áreas
  // ---------------------------------------------------------------
  await prisma.area.createMany({
    data: [
      { id: T.areaPiscina, establishmentId: estId, name: 'Piscina', description: 'Mesas ao redor da piscina.' },
      { id: T.areaRestaurante, establishmentId: estId, name: 'Restaurante', description: 'Salão principal.' },
    ],
  });

  // ---------------------------------------------------------------
  // 5. Mesas — qrCode UUID v4 ÚNICO para cada mesa (FASE 12)
  // ---------------------------------------------------------------
  const tables = Array.from({ length: 10 }, (_, i) => {
    const number = String(i + 1).padStart(2, '0');
    return {
      // Mesa 01 mantém o id determinístico dos testes; demais novos.
      id: number === '01' ? T.mesa01 : undefined,
      establishmentId: estId,
      areaId: i < 5 ? T.areaPiscina : T.areaRestaurante,
      number,
      name: `Mesa ${number}`,
      capacity: i % 3 === 0 ? 6 : 4,
      // FIX (colisão entre mesas): cada mesa recebe um UUID v4 novo.
      qrCode: randomUUID(),
      status: 'AVAILABLE' as const,
      active: true,
    };
  });

  await prisma.table.createMany({ data: tables });

  // ---------------------------------------------------------------
  // 6. Categorias
  // ---------------------------------------------------------------
  await prisma.category.createMany({
    data: [
      { id: T.catBebidas, establishmentId: estId, name: 'Bebidas', description: 'Refrigerantes, sucos, água e cerveja.', displayOrder: 1 },
      { id: T.catPratos, establishmentId: estId, name: 'Pratos Quentes', description: 'Pratos do balneário.', displayOrder: 2 },
    ],
  });

  // ---------------------------------------------------------------
  // 7. Grupo de adicionais "Gelo" + adicionais (SINGLE? MULTIPLE)
  // ---------------------------------------------------------------
  const geloGroup = await prisma.modifierGroup.create({
    data: {
      id: T.geloGroup,
      establishmentId: estId,
      name: 'Gelo',
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 2,
      modifiers: {
        create: [
          { id: T.geloCom, name: 'Com gelo', price: 0 },
          { id: T.geloExtra, name: 'Gelo extra', price: 1.5 },
        ],
      },
    },
  });

  // ---------------------------------------------------------------
  // 8. Produtos + vínculo com o grupo "Gelo"
  // ---------------------------------------------------------------
  const products: Array<{
    id: string;
    name: string;
    price: number;
    withIce?: boolean;
  }> = [
    {
      id: T.suco,
      name: 'Suco de Laranja',
      price: 7,
      withIce: true,
    },
    {
      id: T.coca,
      name: 'Coca-Cola 350ml',
      price: 8.5,
      withIce: true,
    },
    { id: 'f0000000-0000-4000-8000-000000000001', name: 'Água Mineral', price: 4, withIce: true },
    { id: 'f0000000-0000-4000-8000-000000000002', name: 'Cerveja Pilsen', price: 9, withIce: true },
    { id: 'f0000000-0000-4000-8000-000000000003', name: 'Filé à Parmegiana', price: 18.9 },
    { id: 'f0000000-0000-4000-8000-000000000004', name: 'Pastel de Queijo', price: 8 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        id: product.id,
        establishmentId: estId,
        categoryId: product.withIce ? T.catBebidas : T.catPratos,
        name: product.name,
        price: product.price,
        available: true,
        active: true,
        displayOrder: products.indexOf(product),
        modifierGroups: product.withIce
          ? { create: [{ modifierGroupId: geloGroup.id, displayOrder: 0 }] }
          : undefined,
      },
    });
  }

  console.log('[seed] Estabelecimento pronto:', establishment.slug);
  console.log('[seed] Usuários: admin@balneario.dev, waiter@balneario.dev, kitchen@balneario.dev');
  console.log(`[seed] ${tables.length} mesas recriadas com qrCode UUID v4 único:`);
  for (const t of tables) {
    console.log(`       ${t.number} @ ${t.qrCode}`);
  }
}

main()
  .catch((error) => {
    console.error('[seed] Falha ao executar seed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
