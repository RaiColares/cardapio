import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { CalendarRange, ClipboardList, LayoutGrid, RefreshCw, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Input } from '../../components/ui/Input.js';
import { Loading } from '../../components/ui/Loading.js';
import { Select } from '../../components/ui/Select.js';
import type { SelectOption } from '../../components/ui/Select.js';
import { getDashboardMetrics } from '../../services/dashboard.js';
import type { DashboardMetricsParams } from '../../services/dashboard.js';
import type { DashboardMetricsPeriod } from '../../types/domain.js';
import { formatBRL } from '../../utils/format.js';
import { toDateInput, toIsoLocal } from '../../utils/time.js';

/**
 * Filtro de período das métricas (FASE 26, simplificado):
 * - hoje (padrão): sem parâmetros na API;
 * - período personalizado: envia `startDate`/`endDate` em ISO 8601.
 */
type MetricsMode = 'today' | 'range';

const MODE_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'range', label: 'Período personalizado' },
];

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  accent: string;
}

function MetricCard({ label, value, helper, icon: Icon, accent }: MetricCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <p className="mt-0.5 truncate font-display text-2xl font-semibold text-stone-900">
          {value}
        </p>
        {helper && <p className="mt-1 text-xs text-stone-400">{helper}</p>}
      </div>
    </Card>
  );
}

function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/**
 * Rótulo do período efetivo devolvido pelo backend. Prefere o `period`
 * ecoado (fim inclusivo); na ausência (respostas antigas) cai no `date`.
 */
function formatPeriodHelper(
  period: DashboardMetricsPeriod | undefined,
  fallbackDate: string,
): string {
  if (!period) return `Referente a ${formatDateBR(fallbackDate)}`;
  const start = formatDateBR(period.startDate.slice(0, 10));
  const end = formatDateBR(period.endDate.slice(0, 10));
  return start === end ? `Referente a ${start}` : `Referente a ${start} a ${end}`;
}

/**
 * Dashboard administrativo (ADMIN/MANAGER).
 * Consome GET /dashboard/metrics — o backend é a autoridade dos valores;
 * aqui apenas coletamos o período escolhido e enviamos os parâmetros.
 * Atualiza a cada 30s + botão de atualização manual.
 */
export function AdminDashboardPage() {
  const now = new Date();
  const [mode, setMode] = useState<MetricsMode>('today');
  const [startDate, setStartDate] = useState(toDateInput(now));
  const [endDate, setEndDate] = useState(toDateInput(now));

  // Parâmetros enviados à API. `null` = filtro incompleto/inválido
  // (a query fica pausada e mantém os dados exibidos por último).
  const params = useMemo<DashboardMetricsParams | null>(() => {
    if (mode === 'range') {
      if (!startDate || !endDate) return null;
      if (startDate > endDate) return null;
      return {
        startDate: toIsoLocal(startDate, false),
        endDate: toIsoLocal(endDate, true),
      };
    }
    return {};
  }, [mode, startDate, endDate]);

  const rangeError =
    mode === 'range' && startDate && endDate && startDate > endDate
      ? 'A data inicial não pode ser maior que a data final.'
      : null;

  const incompleteRange = mode === 'range' && (!startDate || !endDate);

  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'metrics', params],
    queryFn: () => getDashboardMetrics(params ?? {}),
    enabled: params !== null,
    refetchInterval: 30_000,
  });

  const revenueLabel =
    mode === 'today' ? 'Faturamento de hoje' : 'Faturamento do período';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Receita do período selecionado e estado atual de mesas e pedidos.
          </p>
        </div>

        {metricsQuery.isSuccess && (
          <Button
            variant="secondary"
            size="sm"
            loading={metricsQuery.isFetching}
            onClick={() => void metricsQuery.refetch()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-stone-700">Período das métricas</p>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="Filtro"
              options={MODE_OPTIONS}
              value={mode}
              onChange={(event) => setMode(event.target.value as MetricsMode)}
              className="w-full sm:w-48"
            />

            {mode === 'range' && (
              <>
                <Input
                  label="Data inicial"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full sm:w-44"
                />
                <Input
                  label="Data final"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full sm:w-44"
                />
              </>
            )}
          </div>
        </div>

        {(rangeError || incompleteRange) && (
          <Alert variant="danger" title="Período inválido">
            {rangeError ?? 'Informe a data inicial e a data final.'}
          </Alert>
        )}
      </Card>

      {metricsQuery.isLoading && <Loading label="Carregando métricas…" />}

      {metricsQuery.isError && (
        <Alert variant="danger" title="Não foi possível carregar as métricas">
          {metricsQuery.error instanceof Error
            ? metricsQuery.error.message
            : 'Erro inesperado ao buscar os dados.'}
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => void metricsQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {metricsQuery.isSuccess && metricsQuery.data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label={revenueLabel}
              value={formatBRL(metricsQuery.data.totalRevenueToday)}
              helper={formatPeriodHelper(metricsQuery.data.period, metricsQuery.data.date)}
              icon={Wallet}
              accent="bg-green-100 text-green-700"
            />
            <MetricCard
              label="Mesas ativas"
              value={String(metricsQuery.data.activeSessionsCount)}
              helper="Comandas abertas no momento"
              icon={LayoutGrid}
              accent="bg-aqua-100 text-aqua-700"
            />
            <MetricCard
              label="Pedidos pendentes"
              value={String(metricsQuery.data.pendingOrdersCount)}
              helper="Fila: novos, confirmados e em preparo"
              icon={ClipboardList}
              accent="bg-amber-100 text-amber-700"
            />
          </div>

          <Card padded={false}>
            <div className="border-b border-stone-100 px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-stone-900">
                <CalendarRange className="size-4" aria-hidden="true" />
                Sobre as métricas
              </h2>
            </div>
            <ol className="flex flex-col gap-3 px-4 py-4 text-sm text-stone-600">
              <li>
                <strong className="font-semibold text-stone-800">Faturamento:</strong> soma dos
                pagamentos confirmados (PAID) no <em>período selecionado</em>, no fuso do
                estabelecimento — mesma base usada na conciliação do fechamento de comandas.
              </li>
              <li>
                <strong className="font-semibold text-stone-800">Mesas ativas:</strong> comandas
                abertas no momento (uma mesa com conta solicitada continua ativa até o fechamento).
                Não é afetada pelo filtro de período.
              </li>
              <li>
                <strong className="font-semibold text-stone-800">Pedidos pendentes:</strong> pedidos
                na fila da operação agora: novos, confirmados e em preparo (exclui prontos e
                entregues). Não é afetada pelo filtro de período.
              </li>
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}