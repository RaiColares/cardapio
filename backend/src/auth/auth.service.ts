import { Prisma } from '@prisma/client';

import { signAccessToken } from '../common/auth/jwt.js';
import { hashPassword, verifyPassword } from '../common/auth/password.js';
import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

/**
 * Autentica um usuário e retorna o access token JWT.
 *
 * Regras de negócio:
 * 1. usuário deve existir (buscado por e-mail normalizado);
 * 2. usuário deve estar ativo;
 * 3. estabelecimento deve estar ativo;
 * 4. senha deve corresponder ao hash armazenado;
 * 5. payload do token: { sub: userId, establishmentId, role }.
 *
 * Falhas de credenciais usam mensagem genérica para não revelar
 * se o e-mail existe ou não (evita enumeração de usuários).
 */
export async function loginWithCredentials(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Usuário não encontrado: aplica hash dummy para manter tempo de resposta
  // semelhante ao caso de senha errada (mitiga enumeração por timing).
  if (!user) {
    await verifyPassword(input.password, '$2b$12$WPhGd4ul5a0FUrhCTqaaceT/8UBpptob3DjRuR6YpJt8AU/CvAhqy');
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }

  if (!user.active) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }

  const establishment = await prisma.establishment.findUnique({
    where: { id: user.establishmentId },
    select: { status: true },
  });

  if (!establishment || establishment.status !== 'ACTIVE') {
    throw new AppError(403, 'ESTABLISHMENT_INACTIVE', 'Estabelecimento inativo.');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }

  const token = signAccessToken({
    sub: user.id,
    establishmentId: user.establishmentId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      establishmentId: user.establishmentId,
    },
  };
}

// ============================================================
// FASE 25 — Onboarding de clientes SaaS (POST /auth/register)
// ============================================================

/**
 * Métodos de pagamento padrão aplicados a todo estabelecimento novo.
 *
 * Espelha o default da migração `split_card_payment_methods` (FASE 24):
 * `CASH | CREDIT_CARD | DEBIT_CARD | PIX`. O Prisma já aplica esse valor
 * pelo default do schema; defini-lo explicitamente deixa a intenção
 * registrada no código do onboarding e documenta o contrato de criação.
 */
const DEFAULT_ACCEPTED_PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'] as const;

/**
 * Onboarding de clientes SaaS: cria o estabelecimento e o usuário
 * proprietário (role `ADMIN`) atomicamente em UMA transação.
 *
 * Regras de negócio:
 * 1. `slug` (estabelecimento) é globalmente único — conflito responde 400;
 * 2. `email` (usuário) é globalmente único — conflito responde 400;
 * 3. a senha recebe hash bcrypt ANTES da transação (nunca passa em texto
 *    puro adiante; dentro do `$transaction` interativo não há operação
 *    assíncrona externa);
 * 4. o Establishment nasce com as configurações padrão: sem taxa de
 *    serviço (`serviceFeeEnabled=false`, `serviceFeeRate=0`) e com os
 *    métodos de pagamento padrão da FASE 24;
 * 5. o usuário proprietário é criado vinculado ao estabelecimento com a
 *    role `ADMIN` (o ADMIN nasce SOMENTE aqui — nenhum fluxo de equipe
 *    cria administradores);
 * 6. retorna mensagem de sucesso (o proprietário faz login no fluxo
 *    seguinte, como em `/auth/login`).
 *
 * Proteção contra corrida: o catch de P2002 (unique constraint) cobre a
 * janela entre a pré-checagem e o `create`, respondendo 400 no lugar de 500.
 */
export async function registerEstablishmentWithOwner(input: RegisterInput) {
  const [slugInUse, emailInUse] = await Promise.all([
    prisma.establishment.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    }),
  ]);

  if (slugInUse) {
    throw new AppError(
      400,
      'SLUG_ALREADY_IN_USE',
      'Este slug já está em uso por outro estabelecimento.',
    );
  }

  if (emailInUse) {
    throw new AppError(400, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
  }

  const ownerPasswordHash = await hashPassword(input.password);

  try {
    await prisma.$transaction(async (tx) => {
      const establishment = await tx.establishment.create({
        data: {
          name: input.establishmentName,
          slug: input.slug,
          // Configurações padrão de pagamento (FASE 24).
          serviceFeeEnabled: false,
          serviceFeeRate: 0,
          acceptedPaymentMethods: [...DEFAULT_ACCEPTED_PAYMENT_METHODS],
        },
        select: { id: true },
      });

      await tx.user.create({
        data: {
          establishmentId: establishment.id,
          name: input.ownerName,
          email: input.email,
          passwordHash: ownerPasswordHash,
          role: 'ADMIN',
          active: true,
        },
        select: { id: true },
      });
    });

    return {
      message: 'Estabelecimento registrado com sucesso. Faça login para continuar.',
    };
  } catch (error) {
    // Conflito de unicidade global disparado na transação (slug ou e-mail):
    // a janela entre a pré-checagem e o create é coberta aqui — jamais 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target : [String(target)];

      if (fields.includes('slug')) {
        throw new AppError(
          400,
          'SLUG_ALREADY_IN_USE',
          'Este slug já está em uso por outro estabelecimento.',
        );
      }

      throw new AppError(400, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
    }

    throw error;
  }
}
