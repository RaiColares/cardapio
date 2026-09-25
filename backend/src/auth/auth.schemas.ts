import { z } from 'zod';

/**
 * Schema de validação do login.
 *
 * O backend nunca confia em dados do cliente: e-mail e senha são
 * validados e normalizados aqui antes de qualquer consulta.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .max(255, 'E-mail muito longo.'),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
