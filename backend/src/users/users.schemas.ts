import { z } from 'zod';

/**
 * Schemas de validação do CRUD de usuários da equipe (FASE 18).
 *
 * O `establishmentId` NUNCA vem do corpo: é injetado passivamente a partir
 * do token do ADMIN autenticado (multi-tenancy).
 *
 * A role ADMIN não pode ser criada por este fluxo: usuários ADMIN nascem
 * somente no onboarding (`/establishments/register`). A equipe gerenciável
 * é composta por MANAGER, WAITER e KITCHEN.
 */

/** Papéis que o ADMIN pode gerenciar na equipe do estabelecimento. */
export const teamRoles = ['MANAGER', 'WAITER', 'KITCHEN'] as const;
export type TeamRole = (typeof teamRoles)[number];

const nameSchema = z
  .string('Nome é obrigatório.')
  .trim()
  .min(2, 'O nome deve ter no mínimo 2 caracteres.')
  .max(150, 'O nome deve ter no máximo 150 caracteres.');

const emailSchema = z
  .string('E-mail é obrigatório.')
  .trim()
  .toLowerCase()
  .email('E-mail inválido.')
  .max(255, 'E-mail muito longo.');

const passwordSchema = z
  .string('Senha é obrigatória.')
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.');

const roleSchema = z.enum(teamRoles, { error: 'Role inválida (permitidas: MANAGER, WAITER, KITCHEN).' });

/** Criação de membro da equipe por um ADMIN. */
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
  phone: z
    .string('Telefone inválido.')
    .trim()
    .max(30, 'O telefone deve ter no máximo 30 caracteres.')
    .optional()
    .nullable(),
});

/**
 * Atualização parcial de membro da equipe.
 * A role permanece restrita a MANAGER/WAITER/KITCHEN (nunca ADMIN).
 */
export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: roleSchema.optional(),
  phone: z
    .string('Telefone inválido.')
    .trim()
    .max(30, 'O telefone deve ter no máximo 30 caracteres.')
    .optional()
    .nullable(),
  active: z.boolean('active deve ser true ou false.').optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('ID do usuário inválido.'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
