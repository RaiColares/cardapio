import { Prisma } from '@prisma/client';

import { hashPassword } from '../common/auth/password.js';
import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type {
  RegisterEstablishmentInput,
  UpdateEstablishmentSettingsInput,
} from './establishments.schemas.js';

/**
 * Service do módulo de Estabelecimentos (FASE 18 — Multi-tenant SaaS).
 *
 * - `registerEstablishment`: onboarding público — cria Establishment + User
 *   ADMIN atomicamente em UMA transação.
 * - `getEstablishmentSettings` / `updateEstablishmentSettings`: leitura e
 *   atualização das configurações; o tenant vem do JWT, nunca do corpo.
 */

/** Campos seguros de configurações retornados nas respostas. */
const settingsSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  serviceFeeEnabled: true,
  serviceFeeRate: true,
  // FASE 24 — métodos de pagamento aceites pelo estabelecimento.
  acceptedPaymentMethods: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EstablishmentSelect;

/** Converte Decimal do Prisma em number para o contrato da API. */
function normalizeSettings<T extends { serviceFeeRate: unknown }>(settings: T) {
  return { ...settings, serviceFeeRate: Number(settings.serviceFeeRate) };
}

/**
 * Onboarding público: cria o estabelecimento e o usuário proprietário
 * (role ADMIN) atomicamente em uma transação ($transaction).
 *
 * A senha recebe hash bcrypt ANTES da transação — dentro do `$transaction`
 * interativo nenhuma operação assíncrona externa é executada, e a senha em
 * texto puro nunca é passada adiante.
 *
 * Conflitos de slug/e-mail (unicidade global) retornam 409
 * (`SLUG_ALREADY_IN_USE` / `EMAIL_ALREADY_IN_USE`).
 */
export async function registerEstablishment(input: RegisterEstablishmentInput) {
  // Pré-checagem para mensagens precisas. O catch de P2002 abaixo cobre
  // corridas entre a checagem e a criação.
  const [slugInUse, emailInUse] = await Promise.all([
    prisma.establishment.findUnique({ where: { slug: input.slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: input.ownerEmail }, select: { id: true } }),
  ]);

  if (slugInUse) {
    throw new AppError(
      409,
      'SLUG_ALREADY_IN_USE',
      'Este slug já está em uso por outro estabelecimento.',
    );
  }

  if (emailInUse) {
    throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
  }

  const ownerPasswordHash = await hashPassword(input.ownerPassword);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const establishment = await tx.establishment.create({
        data: {
          name: input.name,
          slug: input.slug,
          serviceFeeEnabled: false,
          serviceFeeRate: 0,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
        },
      });

      const owner = await tx.user.create({
        data: {
          establishmentId: establishment.id,
          name: input.ownerName,
          email: input.ownerEmail,
          passwordHash: ownerPasswordHash,
          role: 'ADMIN',
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      return { establishment, owner };
    });

    return result;
  } catch (error) {
    // Unique constraint global: slug (establishments) ou e-mail (users).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target : [String(target)];

      if (fields.includes('slug')) {
        throw new AppError(
          409,
          'SLUG_ALREADY_IN_USE',
          'Este slug já está em uso por outro estabelecimento.',
        );
      }

      throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
    }

    throw error;
  }
}

/** Lê as configurações do estabelecimento autenticado (tenant do JWT). */
export async function getEstablishmentSettings(establishmentId: string) {
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: settingsSelect,
  });

  if (!establishment) {
    throw new AppError(404, 'ESTABLISHMENT_NOT_FOUND', 'Estabelecimento não encontrado.');
  }

  return normalizeSettings(establishment);
}

/**
 * Atualiza as configurações do estabelecimento autenticado.
 *
 * Campos ausentes no body são ignorados (Prisma ignora `undefined`):
 * atualiza apenas o que foi enviado — mesmo comportamento do PUT de produtos.
 */
export async function updateEstablishmentSettings(
  establishmentId: string,
  input: UpdateEstablishmentSettingsInput,
) {
  await getEstablishmentSettings(establishmentId);

  const updated = await prisma.establishment.update({
    where: { id: establishmentId },
    data: {
      name: input.name,
      logoUrl: input.logoUrl,
      serviceFeeEnabled: input.serviceFeeEnabled,
      serviceFeeRate: input.serviceFeeRate,
      acceptedPaymentMethods: input.acceptedPaymentMethods,
    },
    select: settingsSelect,
  });

  return normalizeSettings(updated);
}
