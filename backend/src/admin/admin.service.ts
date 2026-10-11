import { Prisma } from '@prisma/client';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import { hashPassword } from '../common/auth/password.js';

/**
 * Service do módulo de ADMINISTRAÇÃO DA PLATAFORMA (FASE 27).
 *
 * Rotas exclusivas do SUPER_ADMIN (`/api/v1/admin/*`). Diferente de
 * todos os outros módulos, NÃO há tenant: esses endpoints são
 * deliberadamente de escopo GLOBAL (a plataforma gerencia a base de
 * clientes). O isolamento agrícola é garantido pela RBAC estrita
 * (`authorizeSuperAdminOnly`) aplicada em nível de router.
 */

/**
 * GET /admin/establishments
 *
 * Lista todos os clientes cadastrados na plataforma (ordem de criação,
 * mais recentes primeiro), incluindo o e-mail do usuário proprietário
 * (role ADMIN) de cada estabelecimento.
 *
 * Retorna também `status` (cadastro) e `isActive` (interruptor operacional
 * SaaS da FASE 26) — juntos dão o estado real do cliente na listagem.
 */
export async function listEstablishments() {
  const establishments = await prisma.establishment.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
      createdAt: true,
      users: {
        where: { role: 'ADMIN' },
        select: { email: true },
        take: 1,
      },
    },
  });

  return establishments.map(({ users, ...establishment }) => ({
    ...establishment,
    ownerEmail: users[0]?.email ?? null,
  }));
}

/**
 * PATCH /admin/establishments/:id/password
 *
 * Redefine a senha do USUÁRIO PROPRIETÁRIO (role ADMIN) do cliente.
 *
 * Regras:
 * 1. o estabelecimento deve existir — senão 404 ESTABLISHMENT_NOT_FOUND;
 * 2. deve haver um usuário dono ADMIN associado — senão 404
 *    CLIENT_OWNER_NOT_FOUND (todo cliente da FASE 25 nasce com um);
 * 3. a senha é validada pelo schema (mín. 6, máx. 128), faz hash bcrypt
 *    (12 rodadas) e atualiza APENAS o hash — nunca texto puro;
 * 4. o dono é resolvido por `establishmentId` + `role ADMIN` vindo do
 *    banco — a relação nunca vem do payload do cliente.
 *
 * A gravação cai na auditoria global (FASE 22): o auditMiddleware saneia
 * o body e descarta o campo `password` no metadata.
 */
export async function updateClientPassword(
  establishmentId: string,
  newPassword: string,
) {
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true, name: true },
  });

  if (!establishment) {
    throw new AppError(
      404,
      'ESTABLISHMENT_NOT_FOUND',
      'Cliente não encontrado.',
    );
  }

  const owner = await prisma.user.findFirst({
    where: { establishmentId, role: 'ADMIN' },
    select: { id: true },
  });

  if (!owner) {
    throw new AppError(
      404,
      'CLIENT_OWNER_NOT_FOUND',
      'Estabelecimento sem usuário proprietário para alterar a senha.',
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: owner.id },
    data: { passwordHash },
    select: { id: true },
  });

  return {
    message: 'Senha do cliente atualizada com sucesso.',
  };
}

/**
 * POST /admin/authorized-emails (FASE 27)
 *
 * Autoriza um e-mail para o onboarding SaaS (FASE 26): com o registro
 * concluído, a autorização é CONSUMIDA (removida da tabela) e o e-mail
 * volta a poder ser autorizado novamente no futuro.
 *
 * Regras:
 * 1. e-mail normalizado pelo schema (trim + minúsculas);
 * 2. já autorizado → 409 EMAIL_ALREADY_AUTHORIZED;
 * 3. o insert trata a corrida via unique constraint (`email @unique`):
 *    o P2002 é convertido para o MESMO 409 (nunca 500).
 */
export async function authorizeClientEmail(email: string) {
  const existing = await prisma.authorizedEmail.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_AUTHORIZED',
      'Este e-mail já está autorizado para cadastro na plataforma.',
    );
  }

  try {
    await prisma.authorizedEmail.create({
      data: { email },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        409,
        'EMAIL_ALREADY_AUTHORIZED',
        'Este e-mail já está autorizado para cadastro na plataforma.',
      );
    }
    throw error;
  }

  return {
    email,
    message: 'E-mail autorizado para cadastro na plataforma.',
  };
}

/**
 * PATCH /admin/establishments/:id/status (FASE 27)
 *
 * Suspende ou reativa o cliente pelo interruptor operacional SaaS
 * (`isActive`, FASE 26). O efeito no login é imediato:
 * - `isActive: false` → 403 ESTABLISHMENT_SUSPENDED (inadimplência);
 * - `isActive: true` → acesso normal restaurado.
 *
 * A alteração é idempotente e NÃO mexe no `status` do cadastro (que reflete
 * o registro); suspensão é uma decisão operacional reversível.
 */
export async function updateClientStatus(
  establishmentId: string,
  isActive: boolean,
) {
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true },
  });

  if (!establishment) {
    throw new AppError(
      404,
      'ESTABLISHMENT_NOT_FOUND',
      'Cliente não encontrado.',
    );
  }

  const updated = await prisma.establishment.update({
    where: { id: establishmentId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
    },
  });

  return {
    ...updated,
    message: isActive
      ? 'Cliente reativado com sucesso.'
      : 'Cliente suspenso com sucesso.',
  };
}

/**
 * DELETE /admin/establishments/:id (FASE 27)
 *
 * Exclusão DEFINITIVA de um cliente da plataforma.
 *
 * Estratégia (verificada no schema): TODAS as relações de `Establishment`
 * usam `onDelete: Cascade` (users, áreas, mesas, sessões, categorias,
 * produtos, adicionais, combos, promoções, clientes, pedidos). Porém, as
 * relações INTERNAS entre essas entidades são `onDelete: Restrict` (default
 * do Prisma para relações obrigatórias) e o Postgres verifica o `RESTRICT`
 * IMEDIATAMENTE — logo, um `delete` direto no estabelecimento seria rejeitado
 * (ex.: `order_items.product_id → products`).
 *
 * Essas travas NÃO podem virar `Cascade`: apagar um produto não pode destruir
 * itens de pedidos antigos (regra de ouro #9 — histórico preservado pelos
 * snapshots). Por isso a exclusão é feita em ORDEM DE DEPENDÊNCIA, dentro de
 * UMA transação — mesmo padrão confiável usado por `prisma/seed.ts` — e o
 * `delete` final do estabelecimento deixa o cascade do banco limpar o que
 * resta (ex.: usuários). Tudo é atômico: ou apaga tudo, ou nada.
 *
 * Os registros de `audit_logs` NÃO são apagados: a FK de usuário vira `NULL`
 * (`SetNull`), preservando o histórico da plataforma.
 *
 * Regras:
 * 1. o SUPER_ADMIN NÃO pode excluir o estabelecimento ao qual a PRÓPRIA
 *    conta pertence — isso apagaria a própria credencial e travaria a
 *    administração da plataforma (409 CANNOT_DELETE_OWN_ESTABLISHMENT);
 * 2. o cliente deve existir — senão 404 ESTABLISHMENT_NOT_FOUND;
 * 3. a operação é irreversível.
 *
 * A exclusão cai na auditoria global (FASE 22) como
 * `DELETE /api/v1/admin/establishments/:id` (entity ADMIN).
 */
export async function deleteEstablishment(
  establishmentId: string,
  actorEstablishmentId: string,
) {
  // Trava de segurança (anti-lockout): o SUPER_ADMIN pertence a um
  // estabelecimento; excluí-lo removeria também a própria conta.
  if (establishmentId === actorEstablishmentId) {
    throw new AppError(
      409,
      'CANNOT_DELETE_OWN_ESTABLISHMENT',
      'Não é possível excluir o estabelecimento ao qual a sua conta pertence.',
    );
  }

  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true, name: true },
  });

  if (!establishment) {
    throw new AppError(
      404,
      'ESTABLISHMENT_NOT_FOUND',
      'Cliente não encontrado.',
    );
  }

  await prisma.$transaction(async (tx) => {
    // Ordem de dependência (filhos antes dos pais) — respeita os RESTRICT
    // internos. As remoções usam o vínculo por `establishmentId` (ou pela
    // relação) para não tocar em dados de outros clientes.
    await tx.orderItemModifier.deleteMany({
      where: { orderItem: { order: { establishmentId } } },
    });
    await tx.orderItem.deleteMany({ where: { order: { establishmentId } } });
    await tx.payment.deleteMany({
      where: { tableSession: { establishmentId } },
    });
    await tx.order.deleteMany({ where: { establishmentId } });
    await tx.tableSession.deleteMany({ where: { establishmentId } });
    await tx.productModifierGroup.deleteMany({
      where: { product: { establishmentId } },
    });
    await tx.modifier.deleteMany({
      where: { modifierGroup: { establishmentId } },
    });
    await tx.modifierGroup.deleteMany({ where: { establishmentId } });
    await tx.product.deleteMany({ where: { establishmentId } });
    await tx.category.deleteMany({ where: { establishmentId } });
    await tx.table.deleteMany({ where: { establishmentId } });
    await tx.area.deleteMany({ where: { establishmentId } });
    await tx.customer.deleteMany({ where: { establishmentId } });
    await tx.combo.deleteMany({ where: { establishmentId } });
    await tx.promotion.deleteMany({ where: { establishmentId } });

    // Cascade do banco remove o restante (ex.: users; audit_logs.user_id→NULL).
    await tx.establishment.delete({ where: { id: establishmentId } });
  });

  return {
    id: establishment.id,
    name: establishment.name,
    message: 'Cliente excluído definitivamente.',
  };
}