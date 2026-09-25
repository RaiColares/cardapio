import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, RefreshCw, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import type { BadgeProps } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Input } from '../../components/ui/Input.js';
import { Loading } from '../../components/ui/Loading.js';
import { Table, TBody, TD, THead, TH, TRow } from '../../components/ui/Table.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { useToast } from '../../components/ui/Toast.js';
import { ApiError } from '../../services/api.js';
import { exportSalesCsv, getAuditLogs } from '../../services/reports.js';

/** "YYYY-MM-DD" no fuso local do dispositivo (ex.: hoje no operador). */
function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY = toDateInput(new Date());

/**
 * Converte "YYYY-MM-DD" (input date) em ISO 8601 com offset local.
 * O backend exige datetime com offset (schema .datetime({ offset: true })) e
 * compara com closedAt (UTC). Usar o fuso do dispositivo preserva o sentido
 * de "dia" para o operador (balneário gerencia no fuso local).
 */
function toIsoLocal(dateInput: string, endOfDay: boolean): string {
  const [yearRaw, monthRaw, dayRaw] = dateInput.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return date.toISOString();
}

/** Dispara o download de um Blob via objectURL + <a> invisível. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Validação local do período (espelha o contrato do backend).
 * As datas do input viram ISO 8601 com offset na hora de chamar a API.
 */
const salesFilterSchema = z
  .object({
    startDate: z.string().min(1, 'Informe a data inicial.'),
    endDate: z.string().min(1, 'Informe a data final.'),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'A data inicial não pode ser maior que a data final.',
    path: ['endDate'],
  });

type SalesFilterValues = z.infer<typeof salesFilterSchema>;

const defaultFilter: SalesFilterValues = { startDate: TODAY, endDate: TODAY };

/** Rótulo e cor da badge a partir da ação (vocabulário livre do backend). */
function actionMeta(action: string): { label: string; variant: BadgeProps['variant'] } {
  const normalized = action.toLowerCase();
  if (normalized.includes('create') || normalized.includes('insert')) {
    return { label: 'Criar', variant: 'success' };
  }
  if (
    normalized.includes('delete') ||
    normalized.includes('remove') ||
    normalized.includes('cancel')
  ) {
    return { label: 'Excluir', variant: 'danger' };
  }
  if (
    normalized.includes('update') ||
    normalized.includes('edit') ||
    normalized.includes('change') ||
    normalized.includes('status')
  ) {
    return { label: 'Atualizar', variant: 'info' };
  }
  return { label: action, variant: 'neutral' };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Prévia compacta do metadata (JSON do backend) para a coluna Entidade. */
function metadataPreview(value: unknown): string | null {
  if (value == null) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text && text.length > 80 ? `${text.slice(0, 80)}…` : (text ?? null);
}

/**
 * Relatórios (ADMIN/MANAGER).
 *  - Vendas: seleção de período + download do CSV (GET /dashboard/sales/export).
 *  - Auditoria: últimas ações do estabelecimento (GET /reports/audit).
 * O backend é a autoridade dos dados; o frontend apenas apresenta e exporta.
 */
export function AdminReportsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'sales' | 'audit'>('sales');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SalesFilterValues>({
    resolver: zodResolver(salesFilterSchema),
    defaultValues: defaultFilter,
  });

  const exportMutation = useMutation({
    mutationFn: (values: SalesFilterValues) =>
      exportSalesCsv(
        toIsoLocal(values.startDate, false),
        toIsoLocal(values.endDate, true),
      ),
    onSuccess: (blob, values) => {
      downloadBlob(blob, `vendas-${values.startDate}_${values.endDate}.csv`);
      showToast('success', 'CSV de vendas baixado.');
    },
    onError: (error: unknown) => {
      showToast(
        'error',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível baixar o CSV de vendas.',
      );
    },
  });

  const auditQuery = useQuery({
    queryKey: ['reports', 'audit'],
    queryFn: getAuditLogs,
    enabled: tab === 'audit',
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-900">Relatórios</h1>
        <p className="mt-1 text-sm text-stone-500">
          Exporte vendas do período e acompanhe as ações registradas no balneário.
        </p>
      </div>

      <Tabs
        items={[
          { value: 'sales', label: 'Vendas (CSV)', icon: FileSpreadsheet },
          { value: 'audit', label: 'Auditoria', icon: ScrollText },
        ]}
        value={tab}
        onChange={(value) => setTab(value as 'sales' | 'audit')}
        ariaLabel="Seções de relatórios"
      />

      {tab === 'sales' && (
        <Card>
          <h2 className="font-display text-base font-semibold text-stone-900">
            Exportar vendas do período
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Comandas encerradas no intervalo selecionado (colunas: ID, Data,
            Total, Taxa e Pagamentos).
          </p>

          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(event) => void handleSubmit((values) => exportMutation.mutate(values))(event)}
            noValidate
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="sales-start"
                type="date"
                label="Data inicial"
                error={errors.startDate?.message}
                disabled={exportMutation.isPending}
                {...register('startDate')}
              />
              <Input
                id="sales-end"
                type="date"
                label="Data final"
                error={errors.endDate?.message}
                disabled={exportMutation.isPending}
                {...register('endDate')}
              />
            </div>

            <div>
              <Button type="submit" loading={exportMutation.isPending}>
                <Download className="size-4" aria-hidden="true" />
                Baixar CSV de Vendas
              </Button>
              <p className="mt-2 text-xs text-stone-500">
                O arquivo é gerado pelo servidor com os valores validados no
                backend.
              </p>
            </div>
          </form>
        </Card>
      )}

      {tab === 'audit' && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <div>
              <h2 className="font-display text-base font-semibold text-stone-900">
                Auditoria
              </h2>
              <p className="text-xs text-stone-500">
                Últimas 100 ações registradas no estabelecimento.
              </p>
            </div>
            {auditQuery.isSuccess && (
              <Button
                variant="secondary"
                size="sm"
                loading={auditQuery.isFetching}
                onClick={() => void auditQuery.refetch()}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Atualizar
              </Button>
            )}
          </div>

          {auditQuery.isLoading && <Loading label="Carregando auditoria…" />}

          {auditQuery.isError && (
            <div className="p-4">
              <Alert variant="danger" title="Não foi possível carregar a auditoria">
                {auditQuery.error instanceof Error
                  ? auditQuery.error.message
                  : 'Erro inesperado ao buscar os registros.'}
                <div className="mt-3">
                  <Button variant="secondary" size="sm" onClick={() => void auditQuery.refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              </Alert>
            </div>
          )}

          {auditQuery.isSuccess && auditQuery.data.length === 0 && (
            <EmptyState
              icon={ScrollText}
              title="Nenhum registro de auditoria"
              description="As ações dos usuários aparecerão aqui assim que o gravador de logs estiver ativo."
            />
          )}

          {auditQuery.isSuccess && auditQuery.data.length > 0 && (
            <Table>
              <THead>
                <tr>
                  <TH>Data e hora</TH>
                  <TH>Ação</TH>
                  <TH>Entidade</TH>
                  <TH>Usuário</TH>
                </tr>
              </THead>
              <TBody>
                {auditQuery.data.map((log) => {
                  const meta = actionMeta(log.action);
                  const metadata = metadataPreview(log.metadata);

                  return (
                    <TRow key={log.id}>
                      <TD className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TD>
                      <TD>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TD>
                      <TD>
                        <div className="flex flex-col">
                          <span className="font-semibold text-stone-900">{log.entity}</span>
                          {log.entityId && (
                            <span className="truncate font-mono text-xs text-stone-500">
                              {log.entityId}
                            </span>
                          )}
                          {metadata && (
                            <span
                              className="max-w-56 truncate text-xs text-stone-400"
                              title={metadata}
                            >
                              {metadata}
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD>
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-stone-900">{log.user.name}</span>
                            <span className="truncate text-xs text-stone-500">
                              {log.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </TD>
                    </TRow>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}