import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { ClipboardList, LayoutGrid, RefreshCw, Wallet } from 'lucide-react';

import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { getDashboardMetrics } from '../../services/dashboard.js';
import { formatBRL } from '../../utils/format.js';

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
 * Dashboard administrativo (ADMIN/MANAGER).
 * Consome GET /dashboard/metrics — o backend é a autoridade dos valores.
 * Atualiza a cada 30s + botão de atualização manual.
 */
export function AdminDashboardPage() {
  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: getDashboardMetrics,
    refetchInterval: 30_000,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Visão geral do movimento de hoje no balneário.
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
              label="Faturamento de hoje"
              value={formatBRL(metricsQuery.data.totalRevenueToday)}
              helper={`Referente a ${formatDateBR(metricsQuery.data.date)}`}
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
              <h2 className="font-display text-base font-semibold text-stone-900">
                Sobre as métricas
              </h2>
            </div>
            <ol className="flex flex-col gap-3 px-4 py-4 text-sm text-stone-600">
              <li>
                <strong className="font-semibold text-stone-800">Faturamento de hoje:</strong>{' '}
                soma dos pagamentos confirmados (PAID) no dia, no fuso do estabelecimento —
                mesma base usada na conciliação do fechamento de comandas.
              </li>
              <li>
                <strong className="font-semibold text-stone-800">Mesas ativas:</strong>{' '}
                comandas abertas (uma mesa com conta solicitada continua ativa até o fechamento).
              </li>
              <li>
                <strong className="font-semibold text-stone-800">Pedidos pendentes:</strong>{' '}
                pedidos na fila da operação: novos, confirmados e em preparo (exclui prontos e entregues).
              </li>
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}
