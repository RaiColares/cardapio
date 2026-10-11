import { z } from 'zod';

import { emailSchema, registerPasswordSchema } from '../auth/auth.schemas.js';

/**
 * Schemas de validação do módulo de ADMINISTRAÇÃO DA PLATAFORMA (FASE 27).
 *
 * Rotas exclusivas do SUPER_ADMIN (`/api/v1/admin/*`). O backend nunca
 * confia no payload do cliente: o `:id` da URL e o body são validados
 * antes de qualquer consulta.
 */

/**
 * `:id` de estabelecimento nas rotas `/admin/establishments/:id/*`.
 * Exige formato UUID — evita que um id malformado vire erro 500 do Prisma
 * (P2023) em vez de um 400 limpo.
 */
export const establishmentIdParamSchema = z.uuid(
  'Identificador de estabelecimento inválido.',
);

/**
 * Corpo do `PATCH /admin/establishments/:id/password`.
 *
 * Reutiliza a política de senha do onboarding SaaS (FASE 25): mínimo de 6
 * caracteres, máximo de 128. A nova senha é recebida em texto puro APENAS
 * no request; o service faz o hash bcrypt antes de persistir.
 */
export const updateClientPasswordSchema = z.object({
  password: registerPasswordSchema,
});

export type UpdateClientPasswordInput = z.infer<
  typeof updateClientPasswordSchema
>;

/**
 * Corpo do `POST /admin/authorized-emails` (FASE 27).
 *
 * Autoriza um e-mail para o onboarding SaaS (`POST /auth/register`): sem
 * autorização prévia o registro responde 403 REGISTRATION_NOT_AUTHORIZED e
 * a autorização é consumida (removida) quando o cliente conclui o cadastro.
 * A normalização (trim + minúsculas) é a mesma do login/registro.
 */
export const authorizeClientEmailSchema = z.object({
  email: emailSchema,
});

export type AuthorizeClientEmailInput = z.infer<
  typeof authorizeClientEmailSchema
>;

/**
 * Corpo do `PATCH /admin/establishments/:id/status` (FASE 27).
 *
 * `isActive` é o interruptor operacional SaaS (FASE 26): `false` suspende
 * o cliente e o login passa a responder 403 ESTABLISHMENT_SUSPENDED;
 * `true` reativa. O tipo é booleano estrito — strings como `"false"` são
 * rejeitadas, sem coerção implícita.
 */
export const updateClientStatusSchema = z.object({
  isActive: z.boolean('isActive deve ser um valor booleano.'),
});

export type UpdateClientStatusInput = z.infer<
  typeof updateClientStatusSchema
>;