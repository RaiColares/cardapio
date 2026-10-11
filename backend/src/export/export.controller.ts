import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../common/types/auth-request.js';

import { AppError } from '../common/errors/AppError.js';
import { buildCsv } from '../common/utils/csv.js';
import { getEstablishmentBackup, type EstablishmentBackup } from './export.service.js';

/**
 * Controller do módulo de Exportação.
 *
 * Gera o backup estrutural do estabelecimento autenticado em **um único
 * CSV consolidado em seções** (Estabelecimento, Equipe, Áreas, Mesas,
 * Categorias e Produtos). Escolha de formato: um CSV com seções é o mais
 * leve e prático em Node (sem dependência de ZIP) e abre nativamente no
 * Excel; cada seção começa com uma linha `# Título` e é separada por uma
 * linha em branco.
 *
 * O formato do arquivo (delimitador `;`, escape RFC 4180, BOM UTF-8 e
 * CRLF) é o padrão compartilhado de `common/utils/csv.ts`.
 *
 * Acesso: SOMENTE ADMIN (middleware na rota). O backup inclui dados de
 * equipe (e-mails/papéis), por isso NÃO é liberado a MANAGER/WAITER/
 * KITCHEN. Multi-tenancy: `establishmentId` sempre do JWT.
 */

const BOOLEAN_TRUE = 'Sim';
const BOOLEAN_FALSE = 'Não';

/** Texto seguro: `null`/`undefined` viram célula vazia. */
function text(value: string | null | undefined): string {
  return value ?? '';
}

/** Número opcional como texto (vazio quando ausente). */
function num(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Valor monetário/percentual em ponto fixo com 2 casas (Decimal → number). */
function decimal(value: unknown): string {
  return value === null || value === undefined ? '' : Number(value).toFixed(2);
}

/** Booleano legível em pt-BR. */
function yesNo(value: boolean): string {
  return value ? BOOLEAN_TRUE : BOOLEAN_FALSE;
}

/** Seção "Estabelecimento" — cadastro e configuração. */
function establishmentSection(backup: EstablishmentBackup): string[][] {
  const header = [
    'Nome',
    'Slug',
    'Telefone',
    'WhatsApp',
    'Endereço',
    'Cidade',
    'Estado',
    'CEP',
    'Taxa de serviço ativa',
    'Taxa de serviço (%)',
    'Formas de pagamento',
    'Cadastrado em',
  ];

  if (!backup.establishment) {
    return [['# Estabelecimento'], header];
  }

  const establishment = backup.establishment;

  return [
    ['# Estabelecimento'],
    header,
    [
      establishment.name,
      establishment.slug,
      text(establishment.phone),
      text(establishment.whatsapp),
      text(establishment.address),
      text(establishment.city),
      text(establishment.state),
      text(establishment.zipCode),
      yesNo(establishment.serviceFeeEnabled),
      decimal(establishment.serviceFeeRate),
      establishment.acceptedPaymentMethods.join('|'),
      establishment.createdAt.toISOString(),
    ],
  ];
}

/** Seção "Equipe" — usuários do estabelecimento (sem `passwordHash`). */
function teamSection(backup: EstablishmentBackup): string[][] {
  return [
    ['# Equipe'],
    ['ID', 'Nome', 'E-mail', 'Função', 'Telefone', 'Ativo', 'Cadastrado em'],
    ...backup.users.map((user) => [
      user.id,
      user.name,
      user.email,
      user.role,
      text(user.phone),
      yesNo(user.active),
      user.createdAt.toISOString(),
    ]),
  ];
}

/** Seção "Áreas". */
function areaSection(backup: EstablishmentBackup): string[][] {
  return [
    ['# Áreas'],
    ['ID', 'Nome', 'Descrição', 'Ativo', 'Cadastrado em'],
    ...backup.areas.map((area) => [
      area.id,
      area.name,
      text(area.description),
      yesNo(area.active),
      area.createdAt.toISOString(),
    ]),
  ];
}

/** Seção "Mesas". */
function tableSection(backup: EstablishmentBackup): string[][] {
  return [
    ['# Mesas'],
    ['ID', 'Número', 'Nome', 'Área', 'Capacidade', 'Status', 'Ativo', 'QR Code', 'Cadastrado em'],
    ...backup.tables.map((table) => [
      table.id,
      table.number,
      text(table.name),
      table.area.name,
      String(table.capacity),
      table.status,
      yesNo(table.active),
      table.qrCode,
      table.createdAt.toISOString(),
    ]),
  ];
}

/** Seção "Categorias". */
function categorySection(backup: EstablishmentBackup): string[][] {
  return [
    ['# Categorias'],
    ['ID', 'Nome', 'Descrição', 'Ordem', 'Ativo', 'Cadastrado em'],
    ...backup.categories.map((category) => [
      category.id,
      category.name,
      text(category.description),
      String(category.displayOrder),
      yesNo(category.active),
      category.createdAt.toISOString(),
    ]),
  ];
}

/** Seção "Produtos". */
function productSection(backup: EstablishmentBackup): string[][] {
  return [
    ['# Produtos'],
    [
      'ID',
      'Nome',
      'Categoria',
      'Descrição',
      'Preço',
      'Preço promocional',
      'Tempo de preparo (min)',
      'Ingredientes',
      'Alergénios',
      'Ordem',
      'Destaque',
      'Ativo',
      'Disponível',
      'Cadastrado em',
    ],
    ...backup.products.map((product) => [
      product.id,
      product.name,
      product.category.name,
      text(product.description),
      decimal(product.price),
      decimal(product.promotionalPrice),
      num(product.preparationTime),
      text(product.ingredients),
      text(product.allergens),
      String(product.displayOrder),
      yesNo(product.featured),
      yesNo(product.active),
      yesNo(product.available),
      product.createdAt.toISOString(),
    ]),
  ];
}

/**
 * Monta o CSV consolidado (seções separadas por linha em branco) já no
 * formato compartilhado do projeto.
 */
function buildBackupCsv(backup: EstablishmentBackup): string {
  return buildCsv([
    ...establishmentSection(backup),
    [],
    ...teamSection(backup),
    [],
    ...areaSection(backup),
    [],
    ...tableSection(backup),
    [],
    ...categorySection(backup),
    [],
    ...productSection(backup),
  ]);
}

/**
 * GET /api/v1/export/csv
 *
 * Download do backup estrutural do estabelecimento autenticado.
 * Responde `text/csv` com `Content-Disposition: attachment` — o navegador
 * baixa o ficheiro diretamente (`backup-dados.csv`) em vez de renderizar.
 */
export async function exportCsvController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const backup = await getEstablishmentBackup(req.user.establishmentId);
    const csv = buildBackupCsv(backup);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="backup-dados.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}
