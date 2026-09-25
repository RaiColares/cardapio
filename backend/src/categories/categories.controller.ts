import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  categoryIdParamSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './categories.schemas.js';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from './categories.service.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
  }
  return req.user;
}

/** GET /api/v1/categories — lista com ordenação por displayOrder (padrão) */
export async function listCategoriesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);

    const queryParsed = listCategoriesQuerySchema.safeParse(req.query);

    if (!queryParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        queryParsed.error.issues[0]?.message ?? 'Parâmetros inválidos.',
      );
    }

    const categories = await listCategories(user.establishmentId, queryParsed.data);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/categories/:id */
export async function getCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = categoryIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const category = await getCategoryById(parsed.data.id, user.establishmentId);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/categories */
export async function createCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = createCategorySchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const category = await createCategory(parsed.data, user.establishmentId);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/v1/categories/:id */
export async function updateCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);

    const paramsParsed = categoryIdParamSchema.safeParse(req.params);

    if (!paramsParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        paramsParsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const bodyParsed = updateCategorySchema.safeParse(req.body);

    if (!bodyParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        bodyParsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const category = await updateCategory(
      paramsParsed.data.id,
      bodyParsed.data,
      user.establishmentId,
    );
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/categories/:id */
export async function deleteCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = categoryIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteCategory(parsed.data.id, user.establishmentId);
    res.json({ success: true, data: { id: parsed.data.id } });
  } catch (error) {
    next(error);
  }
}
