import { prisma } from '../common/prisma/prisma.js';

/**
 * Service do módulo de Relatórios (FASE 19 — Auditoria).
 *
 * A listagem consome a tabela `audit_logs`, alimentada desde a FASE 22
 * pelo middleware global de auditoria (src/common/middlewares/audit.ts),
 * que grava as mutações autenticadas (POST/PUT/PATCH/DELETE em /api/v1).
 *
 * Multi-tenancy: o log é escopado pelo estabelecimento VIA A RELAÇÃO
 * com o usuário que praticou a ação (AuditLog.user.establishmentId) —
 * nunca confiando em IDs enviados pelo cliente. Logs de usuários
 * removidos (userId nulo, onDelete: SetNull) não podem mais ser
 * atribuídos a um tenant e ficam de fora da listagem.
 */
export async function getAuditLogs(establishmentId: string) {
  return prisma.auditLog.findMany({
    where: {
      user: { establishmentId },
    },
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
