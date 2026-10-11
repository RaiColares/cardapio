import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import { buildCsv } from '../common/utils/csv.js';
import { metricsQuerySchema, salesQuerySchema } from './dashboard.schemas.js';
import { getMetrics, getSalesExportRows, getSalesReport } from './dashboard.service.js';

/**
 * Controller do módulo de Dashboard.
 * Acesso restrito a MANAGER e ADMIN (middleware na rota).
 * Multi-tenancy: establishmentId SEMPRE do JWT.
 */

/**
 * GET /api/v1/dashboard/metrics
 *
 * Métricas do dashboard. Suporta período opcional (FASE 26):
 * `?startDate&endDate` (dias, ISO 8601) ou `?month&year` (mês inteiro).
 * Sem parâmetros, responde o dia atual (comportamento padrão).
 */
export async function metricsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const query = metricsQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        query.error.issues[0]?.message ?? 'Parâmetros de período inválidos.',
      );
    }

    const metrics = await getMetrics(req.user.establishmentId, query.data);
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
 * Constrói o CSV de vendas: cabeçalho fixo (ID, Data, Total, Taxa,
 * Pagamentos) seguido de uma linha por comanda encerrada no período.
 * Números em ponto fixo com 2 casas decimais (ponto como separador).
 * O formato (delimitador `;`, escape RFC 4180, BOM UTF-8 e CRLF) vem do
 * utilitário compartilhado `common/utils/csv.ts`.
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

  return buildCsv([header, ...lines]);
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
