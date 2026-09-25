import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  availabilitySchema,
  createProductSchema,
  createVariantSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
  variantIdParamSchema,
} from './products.schemas.js';
import {
  addVariant,
  createProduct,
  deleteProduct,
  deleteVariant,
  getProductById,
  listProducts,
  listVariants,
  setProductAvailability,
  updateProduct,
} from './products.service.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
  }
  return req.user;
}

/** GET /api/v1/products */
export async function listProductsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = listProductsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetros inválidos.',
      );
    }

    const products = await listProducts(user.establishmentId, parsed.data);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/products/:id */
export async function getProductController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = productIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const product = await getProductById(parsed.data.id, user.establishmentId);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/products */
export async function createProductController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = createProductSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const product = await createProduct(parsed.data, user.establishmentId);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/v1/products/:id */
export async function updateProductController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);

    const paramsParsed = productIdParamSchema.safeParse(req.params);

    if (!paramsParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        paramsParsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const bodyParsed = updateProductSchema.safeParse(req.body);

    if (!bodyParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        bodyParsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const product = await updateProduct(
      paramsParsed.data.id,
      bodyParsed.data,
      user.establishmentId,
    );
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/v1/products/:id/availability — pausar/liberar item */
export async function availabilityController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);

    const paramsParsed = productIdParamSchema.safeParse(req.params);

    if (!paramsParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        paramsParsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const bodyParsed = availabilitySchema.safeParse(req.body);

    if (!bodyParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        bodyParsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const product = await setProductAvailability(
      paramsParsed.data.id,
      user.establishmentId,
      bodyParsed.data.available,
    );
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/products/:id */
export async function deleteProductController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = productIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteProduct(parsed.data.id, user.establishmentId);
    res.json({ success: true, data: { id: parsed.data.id } });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/products/:id/variants — adicionar variação */
export async function addVariantController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);

    const paramsParsed = productIdParamSchema.safeParse(req.params);

    if (!paramsParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        paramsParsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const bodyParsed = createVariantSchema.safeParse(req.body);

    if (!bodyParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        bodyParsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const variant = await addVariant(
      paramsParsed.data.id,
      bodyParsed.data,
      user.establishmentId,
    );
    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/products/:id/variants — listar variações */
export async function listVariantsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = productIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const variants = await listVariants(parsed.data.id, user.establishmentId);
    res.json({ success: true, data: variants });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/products/:id/variants/:variantId — remover variação */
export async function deleteVariantController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = variantIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteVariant(parsed.data.id, parsed.data.variantId, user.establishmentId);
    res.json({ success: true, data: { id: parsed.data.variantId } });
  } catch (error) {
    next(error);
  }
}
