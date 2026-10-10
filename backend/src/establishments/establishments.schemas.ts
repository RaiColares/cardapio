import { z } from 'zod';

/**
 * Schemas do módulo de Estabelecimentos (FASE 18 — Multi-tenant SaaS).
 *
 * - `registerEstablishmentSchema`: onboarding público (sem JWT). Cria o
 *   estabelecimento e o usuário ADMIN proprietário.
 * - `updateEstablishmentSettingsSchema`: atualização das configurações pelo
 *   próprio estabelecimento. O `establishmentId` NUNCA vem do corpo: é
 *   extraído do JWT.
 *
 * O slug de um estabelecimento é globalmente único na plataforma (rota
 * pública de menu usa `/public/menu/:slug`).
 */

/** Slug normalizado: minúsculo, sem acentos, hífens entre segmentos. */
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

/**
 * Onboarding público de novos restaurantes (SaaS).
 *
 * Body: dados do local (name, slug) + dados do proprietário
 * (ownerName, ownerEmail, ownerPassword).
 */
export const registerEstablishmentSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  ownerName: nameSchema,
  ownerEmail: emailSchema,
  ownerPassword: passwordSchema,
});

/**
 * FASE 24 — métodos de pagamento aceites pelo estabelecimento.
 * Espelha o enum PaymentMethod do domínio
 * (CASH | CREDIT_CARD | DEBIT_CARD | PIX). Lista única, não vazia, com no
 * máximo os quatro valores existentes. Crédito e débito são independentes.
 */
export const acceptedPaymentMethodsSchema = z
  .array(
    z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'] as const, {
      error: 'Método de pagamento inválido (use CASH, CREDIT_CARD, DEBIT_CARD ou PIX).',
    }),
  )
  .min(1, 'Informe ao menos um método de pagamento.')
  .max(4, 'No máximo 4 métodos de pagamento.')
  .refine((methods) => new Set(methods).size === methods.length, {
    message: 'Métodos de pagamento duplicados.',
  });

/**
 * Parcial de configurações do estabelecimento (GET/PUT /establishments/me).
 *
 * Todos os campos são opcionais no PUT (o service ignora `undefined` e
 * atualiza apenas o que foi enviado), seguindo o mesmo padrão do PUT de
 * produtos.
 */
export const updateEstablishmentSettingsSchema = z.object({
  name: nameSchema.optional(),
  logoUrl: z
    .string('URL inválida.')
    .trim()
    .url('URL de imagem inválida.')
    .max(500, 'URL de imagem muito longa.')
    .nullable()
    .optional(),
  serviceFeeEnabled: z.boolean('serviceFeeEnabled deve ser true ou false.').optional(),
  // Taxa de serviço em percentual 0–100 (Decimal(5,2) do banco).
  serviceFeeRate: z
    .number('A taxa de serviço deve ser um número.')
    .min(0, 'A taxa de serviço não pode ser negativa.')
    .max(100, 'A taxa de serviço deve ser no máximo 100%.')
    .refine((value) => {
      const [, decimals] = String(value).split('.');
      return decimals === undefined || decimals.length <= 2;
    }, {
      message: 'A taxa de serviço deve ter no máximo 2 casas decimais.',
    })
    .optional(),
  // FASE 24 — métodos de pagamento aceites (lista única, CASH|CREDIT_CARD|DEBIT_CARD|PIX).
  acceptedPaymentMethods: acceptedPaymentMethodsSchema.optional(),
});

export type RegisterEstablishmentInput = z.infer<typeof registerEstablishmentSchema>;
export type UpdateEstablishmentSettingsInput = z.infer<typeof updateEstablishmentSettingsSchema>;
