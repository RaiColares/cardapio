import type { PlatformClient } from '../types/domain.js';
import { api } from './api.js';

/**
 * Serviço do painel de ADMINISTRAÇÃO DA PLATAFORMA (FASE 27).
 *
 * Consome o router `/admin` do backend — exclusivo de SUPER_ADMIN e de
 * escopo GLOBAL (não há tenant). O token JWT é injetado pelo interceptor
 * da api; qualquer outro papel recebe 403 FORBIDDEN do backend.
 */

/**
 * GET /admin/establishments — lista os clientes cadastrados na plataforma
 * (mais recentes primeiro), com o e-mail do proprietário de cada um.
 */
export async function listEstablishments(): Promise<PlatformClient[]> {
  const { data } = await api.get<{ success: true; data: PlatformClient[] }>(
    '/admin/establishments',
  );
  return data.data;
}

/**
 * PATCH /admin/establishments/:id/password — redefine a senha do usuário
 * proprietário (role ADMIN) do cliente.
 *
 * O formulário espelha a política do backend (mín. 6, máx. 128 — a mesma
 * do onboarding SaaS); o backend valida novamente e é a autoridade.
 */
export async function updateClientPassword(
  establishmentId: string,
  password: string,
): Promise<{ message: string }> {
  const { data } = await api.patch<{ success: true; data: { message: string } }>(
    `/admin/establishments/${establishmentId}/password`,
    { password },
  );
  return data.data;
}

/**
 * POST /admin/authorized-emails — autoriza um e-mail a concluir o
 * onboarding SaaS (`POST /auth/register`). Sem autorização prévia, o
 * registro responde 403 REGISTRATION_NOT_AUTHORIZED.
 *
 * A autorização é CONSUMIDA quando o cadastro é concluído — e-mails já
 * autorizados respondem `409 EMAIL_ALREADY_AUTHORIZED` (checagem
 * case-insensitive). Validação idêntica à do backend (trim + minúsculas).
 */
export async function authorizeClientEmail(
  email: string,
): Promise<{ email: string; message: string }> {
  const { data } = await api.post<{ success: true; data: { email: string; message: string } }>(
    '/admin/authorized-emails',
    { email },
  );
  return data.data;
}

/**
 * PATCH /admin/establishments/:id/status — altera o interruptor operacional
 * (`isActive`) do cliente: suspende (`false`, inadimplência) ou reativa
 * (`true`). Enquanto suspenso, o login responde `403 ESTABLISHMENT_SUSPENDED`.
 *
 * `isActive` é booleano estrito no backend (`"false"` é rejeitado — nunca
 * coerção no frontend).
 */
export async function updateClientStatus(
  establishmentId: string,
  isActive: boolean,
): Promise<{ message: string }> {
  const { data } = await api.patch<{ success: true; data: { message: string } }>(
    `/admin/establishments/${establishmentId}/status`,
    { isActive },
  );
  return data.data;
}

/**
 * DELETE /admin/establishments/:id — exclusão DEFINITIVA do cliente e de
 * todos os dados vinculados (usuários, catálogo, mesas, comandas, pedidos,
 * pagamentos). Operação IRREVERSÍVEL; o backend executa a remoção em ordem
 * de dependência dentro de uma transação.
 *
 * Respostas: `200` `{ id, name, message }`; `400` id inválido; `404`
 * inexistente; `409 CANNOT_DELETE_OWN_ESTABLISHMENT` quando o alvo é o
 * estabelecimento do próprio SUPER_ADMIN; `403` para outro papel.
 */
export async function deleteEstablishment(
  establishmentId: string,
): Promise<{ id: string; name: string; message: string }> {
  const { data } = await api.delete<{
    success: true;
    data: { id: string; name: string; message: string };
  }>(`/admin/establishments/${establishmentId}`);
  return data.data;
}