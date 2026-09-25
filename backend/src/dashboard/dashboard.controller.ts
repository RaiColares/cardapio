import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import { salesQuerySchema } from './dashboard.schemas.js';
import { getMetrics, getSalesExportRows, getSalesReport } from './dashboard.service.js';

/**
 * Controller do módulo de Dashboard.
 * Acesso restrito a MANAGER e ADMIN (middleware na rota).
 * Multi-tenancy: establishmentId SEMPRE do JWT.
 */

/** GET /api/v1/dashboard/metrics — métricas em tempo real do dia */
export async function metricsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const metrics = await getMetrics(req.user.establishmentId);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/dashboard/sales?startDate&endDate — relatório de vendas */
export async function salesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const query = salesQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        query.error.issues[0]?.message ?? 'Parâmetros de período inválidos.',
      );
    }

    const report = await getSalesReport(
      req.user.establishmentId,
      query.data.startDate,
      query.data.endDate,
    );
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

/**
 * Serializa uma célula para o formato CSV.
 *
 * FASE 22: delimitador ponto e vírgula (;) — compatibilidade nativa com o
 * Excel na configuração brasileira (decimal vírgula + separador de coluna ;).
 * Campos com ;, aspas ou quebra de linha são envolvidos em aspas duplas e as
 * aspas internas são dobradas (regra básica de escape).
 */
function escapeCsv(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Constrói o CSV de vendas: cabeçalho fixo (ID, Data, Total, Taxa,
 * Pagamentos) seguido de uma linha por comanda encerrada no período.
 * Números em ponto fixo com 2 casas decimais (ponto como separador).
 * Um BOM (UTF-8) prefixa o arquivo para o Excel abrir acentuação correta.
 */
function buildSalesCsv(
  rows: { sessionId: string; closedAt: Date; total: number; serviceFee: number; paid: number }[],
): string {
  const header = ['ID', 'Data', 'Total', 'Taxa', 'Pagamentos'];

  const lines = rows.map((row) => [
    row.sessionId,
    row.closedAt.toISOString(),
    row.total.toFixed(2),
    row.serviceFee.toFixed(2),
    row.paid.toFixed(2),
  ]);

  const body = [header, ...lines]
    .map((cells) => cells.map(escapeCsv).join(';'))
    .join('\r\n');

  return `\uFEFF${body}`;
}

/**
 * GET /api/v1/dashboard/sales/export?startDate&endDate
 *
 * Comandas CLOSED do período convertidas em CSV. A resposta é um
 * download com `Content-Type: text/csv; charset=utf-8` (+ Content-
 * Disposition para nome de arquivo amigável). Acesso em barra:
 * o rótulo ASCII `attachment` evita a quebra do header pelo shell.
 */
export async function salesExportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const query = salesQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        query.error.issues[0]?.message ?? 'Parâmetros de período inválidos.',
      );
    }

    const rows = await getSalesExportRows(
      req.user.establishmentId,
      query.data.startDate,
      query.data.endDate,
    );

    const csv = buildSalesCsv(rows);
    const filename = `vendas-${query.data.startDate.slice(0, 10)}_${query.data.endDate.slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}
