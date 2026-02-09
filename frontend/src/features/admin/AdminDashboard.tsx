import React, { useEffect, useState } from 'react';
import { getAdminMetricas } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { BarChart3, Users, Building2, ShirtIcon, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatters';

interface Metrics {
  tenants: {
    total: number;
    ativos: number;
    suspensos: number;
    novos_30d: number;
  };
  usuarios: {
    total: number;
    ativos: number;
    novos_7d: number;
    novos_30d: number;
    por_tipo: Record<string, number>;
  };
  itens: {
    total: number;
    estoque: number;
    vendidos: number;
    trocados: number;
  };
  financeiro: {
    total_vendas: number;
    lucro_total: number;
    margem_media: number;
  };
  top_tenants: Array<{
    id: number;
    nome: string;
    slug: string;
    total_itens: number;
    total_vendas: number;
  }>;
  tenants_por_plano: Array<{
    plano: string;
    count: number;
  }>;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const { error } = useToast();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await getAdminMetricas();
      setMetrics(response.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">
          Erro ao carregar métricas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-50">
          Métricas da Plataforma
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Visão geral das estatísticas da plataforma
        </p>
      </div>

      {/* Tenant Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Total de Tenants"
          value={metrics.tenants.total}
          color="blue"
        />
        <StatCard
          icon={Building2}
          label="Tenants Ativos"
          value={metrics.tenants.ativos}
          color="green"
        />
        <StatCard
          icon={Building2}
          label="Tenants Suspensos"
          value={metrics.tenants.suspensos}
          color="red"
        />
        <StatCard
          icon={Building2}
          label="Novos (30d)"
          value={metrics.tenants.novos_30d}
          color="purple"
        />
      </div>

      {/* User Stats */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Usuários
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gremio-celeste">
              {metrics.usuarios.total}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Total
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {metrics.usuarios.ativos}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Ativos
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.usuarios.novos_7d}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Novos (7d)
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {metrics.usuarios.novos_30d}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Novos (30d)
            </div>
          </div>
        </div>
        
        {/* Users by type */}
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold mb-3">Usuários por Tipo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(metrics.usuarios.por_tipo).map(([tipo, count]) => (
              <div key={tipo} className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  {tipo.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Item Stats */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShirtIcon className="w-5 h-5" />
          Itens
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gremio-celeste">
              {metrics.itens.total}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Total
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.itens.estoque}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Em Estoque
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {metrics.itens.vendidos}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Vendidos
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {metrics.itens.trocados}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Trocados
            </div>
          </div>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financeiro
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(metrics.financeiro.total_vendas)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Total em Vendas
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gremio-celeste">
              {formatCurrency(metrics.financeiro.lucro_total)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Lucro Total
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {metrics.financeiro.margem_media.toFixed(1)}%
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Margem Média
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tenants */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top 10 Tenants
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
                  <th className="p-2 text-sm font-semibold">Tenant</th>
                  <th className="p-2 text-sm font-semibold text-right">Itens</th>
                  <th className="p-2 text-sm font-semibold text-right">Vendas</th>
                </tr>
              </thead>
              <tbody>
                {metrics.top_tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="p-2">
                      <div className="font-medium">{tenant.nome}</div>
                      <div className="text-xs text-neutral-500">@{tenant.slug}</div>
                    </td>
                    <td className="p-2 text-right">{tenant.total_itens}</td>
                    <td className="p-2 text-right font-medium text-green-600">
                      {formatCurrency(Number(tenant.total_vendas))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metrics.top_tenants.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                Nenhum tenant encontrado
              </div>
            )}
          </div>
        </div>

        {/* Tenants by Plan */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Tenants por Plano
          </h2>
          <div className="space-y-3">
            {metrics.tenants_por_plano.map((item) => (
              <div
                key={item.plano}
                className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg"
              >
                <span className="font-medium capitalize">
                  {item.plano.replace('_', ' ')}
                </span>
                <span className="text-lg font-bold text-gremio-celeste">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
          {metrics.tenants_por_plano.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'purple';
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200',
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
