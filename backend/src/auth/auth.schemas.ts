import { z } from 'zod';

/**
 * Schemas de validação do módulo de autenticação.
 *
 * O backend nunca confia em dados do cliente: todo payload é validado
 * e normalizado aqui antes de qualquer consulta ou regra de negócio.
 */

/** E-mail com normalização: trim + minúsculas (compartilhado por login e registro). */
const emailSchema = z
  .string('E-mail é obrigatório.')
  .trim()
  .toLowerCase()
  .email('E-mail inválido.')
  .max(255, 'E-mail muito longo.');

/**
 * Schema de validação do login (POST /auth/login).
 *
 * A senha do login exige no mínimo 8 caracteres (política mais estrita
 * para credenciais de painel). O registro (FASE 25) tem política própria.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string('Senha é obrigatória.')
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================
// FASE 25 — Onboarding de clientes SaaS (POST /auth/register)
// ============================================================

const nameSchema = z
  .string('Nome é obrigatório.')
  .trim()
  .min(2, 'O nome deve ter no mínimo 2 caracteres.')
  .max(150, 'O nome deve ter no máximo 150 caracteres.');

/**
 * Slug do estabelecimento: minúsculo, sem acentos, hífens entre
 * segmentos. Globalmente único na plataforma — é usado na URL pública
 * do cardápio (`/public/menu/:slug`).
 */
const slugSchema = z
  .string('Slug é obrigatório.')
  .trim()
  .toLowerCase()
  .min(3, 'O slug deve ter no mínimo 3 caracteres.')
  .max(120, 'O slug deve ter no máximo 120 caracteres.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'O slug deve conter apenas letras minúsculas, números e hífens (ex.: balneario-praia-azul).',
  );

/**
 * Senha de onboarding (FASE 25): mínimo 6 caracteres, conforme o
 * contrato do registro SaaS. Máximo 128 limita custo do hash bcrypt.
 */
const registerPasswordSchema = z
  .string('Senha é obrigatória.')
  .min(6, 'A senha deve ter no mínimo 6 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.');

/**
 * Onboarding de clientes SaaS (POST /auth/register, sem JWT).
 *
 * Cria o Establishment (com configurações padrão de pagamento) e o
 * User proprietário (role ADMIN) atomicamente em uma transação.
 *
 * Campos:
 * - `establishmentName`: nome do estabelecimento;
 * - `slug`: slug único da URL pública do cardápio;
 * - `ownerName`: nome do proprietário/usuário ADMIN;
 * - `email`: e-mail único do proprietário (global na plataforma);
 * - `password`: senha do proprietário (mín. 6 caracteres).
 */
export const registerSchema = z.object({
  establishmentName: nameSchema,
  slug: slugSchema,
  ownerName: nameSchema,
  email: emailSchema,
  password: registerPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;