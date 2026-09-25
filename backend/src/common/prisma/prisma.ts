import { PrismaClient } from '@prisma/client';

/**
 * Instância única do Prisma Client.
 *
 * Um único client é compartilhado pela aplicação para evitar
 * esgotamento de conexões com o PostgreSQL (singleton).
 */
export const prisma = new PrismaClient();
