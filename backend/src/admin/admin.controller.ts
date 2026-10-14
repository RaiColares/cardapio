import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../common/types/auth-request.js';

import { AppError } from '../common/errors/AppError.js';
import {
  authorizeClientEmailSchema,
  establishmentIdParamSchema,
  updateClientPasswordSchema,
  updateClientStatusSchema,
} from './admin.schemas.js';
import {
  authorizeClientEmail,
  deleteEstablishment,
  listEstablishments,
  updateClientPassword,
  updateClientStatus,
} from './admin.service.js';

/**
 * Controllers do módulo de ADMINISTRAÇÃO DA PLATAFORMA (FASE 27).
 *
 * Todos os endpoints são restritos a SUPER_ADMIN pelo router
 * (`authorizeSuperAdminOnly`). Nenhum usa `req.user.establishmentId`
 * para escopo — são rotas globais de plataforma.
 */

/**
 * GET /api/v1/admin/establishments
 *
 * Lista a base de clientes cadastrados.
 */
export async function listEstablishmentsController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await listEstablishments();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/establishments/:id/password
 *
 * Redefine a senha do usuário proprietário (ADMIN) do cliente.
 *
 * Validações:
 * - `:id` deve ser UUID válido → 400 VALIDATION_ERROR;
 * - `body.password` segue a política de senha (mín. 6, máx. 128) → 400
 *   VALIDATION_ERROR com a mensagem do schema.
 */
export async function updateClientPasswordController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const idParsed = establishmentIdParamSchema.safeParse(req.params.id);

    if (!idParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        idParsed.error.issues[0]?.message ?? 'Identificador inválido.',
      );
    }

    const parsed = updateClientPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const result = await updateClientPassword(
      idParsed.data,
      parsed.data.password,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/authorized-emails
 *
 * Autoriza um e-mail para o onboarding SaaS (FASE 26/27).
 *
 * Validações:
 * - e-mail obrigatório, trim + minúsculas e formato válido → 400
 *   VALIDATION_ERROR;
 * - já autorizado → 409 EMAIL_ALREADY_AUTHORIZED.
 */
export async function authorizeClientEmailController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = authorizeClientEmailSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const result = await authorizeClientEmail(parsed.data.email);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/establishments/:id/status
 *
 * Suspende/reativa o cliente pelo interruptor operacional SaaS.
 *
 * Validações:
 * - `:id` deve ser UUID válido → 400 VALIDATION_ERROR;
 * - `body.isActive` deve ser booleano estrito (sem coerção) → 400
 *   VALIDATION_ERROR;
 * - estabelecimento inexistente → 404 ESTABLISHMENT_NOT_FOUND.
 */
export async function updateClientStatusController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const idParsed = establishmentIdParamSchema.safeParse(req.params.id);

    if (!idParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        idParsed.error.issues[0]?.message ?? 'Identificador inválido.',
      );
    }

    const parsed = updateClientStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const result = await updateClientStatus(idParsed.data, parsed.data.isActive);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/admin/establishments/:id
 *
 * Exclusão DEFINITIVA do cliente: o cascade do banco remove todos os dados
 * vinculados (ver `deleteEstablishment`). A operação é irreversível.
 *
 * Validações:
 * - `:id` deve ser UUID válido → 400 VALIDATION_ERROR;
 * - cliente inexistente → 404 ESTABLISHMENT_NOT_FOUND;
 * - cliente ao qual o próprio SUPER_ADMIN pertence → 409
 *   CANNOT_DELETE_OWN_ESTABLISHMENT (anti-lockout da plataforma).
 */
export async function deleteEstablishmentController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const actor = req.user;

    if (!actor) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const idParsed = establishmentIdParamSchema.safeParse(req.params.id);

    if (!idParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        idParsed.error.issues[0]?.message ?? 'Identificador inválido.',
      );
    }

    const result = await deleteEstablishment(
      idParsed.data,
      actor.establishmentId,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}