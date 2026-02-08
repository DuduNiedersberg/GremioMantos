import React, { useEffect, useState } from 'react';
import { getDashboard, getAdminMetricas, getAdminTenants } from '../../lib/api';
import { DashboardMetrics } from '../../types';
import { formatCurrency, formatNumber } from '../../shared/utils/formatters';
import { TrendingUp, ShirtIcon, DollarSign, Package, Users, Building2 } from 'lucide-react';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import Select from '../../shared/components/Select';

interface AdminMetrics {
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
    total_itens: number;
    total_vendas: number;
  }>;
}

interface Tenant {
  id: number;
  nome: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const { error: showError } = useToast();
  const { user } = useAuth();

  const isPlatformAdmin = user?.tipo === 'platform_admin';

  useEffect(() => {
    loadDashboard();
    if (isPlatformAdmin) {
      loadAdminMetrics();
      loadTenants();
    }
  }, [selectedTenantId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const params = selectedTenantId ? { tenant_id: selectedTenantId } : {};
      const response = await getDashboard(params);
      const apiMetrics = response.data.data?.metrics || response.data.data || response.data;
      
      // Map API fields to component expected fields
      setMetrics({
        total_itens: apiMetrics.total_itens ?? 0,
        total_disponiveis: apiMetrics.itens_estoque ?? apiMetrics.total_disponiveis ?? 0,
        total_vendidos: apiMetrics.itens_vendidos ?? apiMetrics.total_vendidos ?? 0,
        valor_acervo_atual: apiMetrics.capital_estoque ?? apiMetrics.valor_acervo_atual ?? 0,
        valor_total_investido: apiMetrics.total_investido_vendas ?? apiMetrics.valor_total_investido ?? 0,
        valor_total_vendas: apiMetrics.total_vendas ?? apiMetrics.valor_total_vendas ?? 0,
        lucro_total: apiMetrics.lucro_total ?? 0,
        itens_estoque: apiMetrics.itens_estoque ?? 0,
        itens_vendidos: apiMetrics.itens_vendidos ?? 0,
        itens_trocados: apiMetrics.itens_trocados ?? 0,
        capital_estoque: apiMetrics.capital_estoque ?? 0,
        total_investido_vendas: apiMetrics.total_investido_vendas ?? 0,
        total_vendas: apiMetrics.total_vendas ?? 0,
        margem_media: apiMetrics.margem_media ?? 0,
      });
    } catch (err) {
      showError('Erro ao carregar dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminMetrics = async () => {
    try {
      const response = await getAdminMetricas();
      setAdminMetrics(response.data);
    } catch (err) {
      console.error('Erro ao carregar métricas admin:', err);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await getAdminTenants();
      setTenants(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar tenants:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Não foi possível carregar os dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-50">
            Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Visão geral do seu acervo de camisetas do Grêmio
          </p>
        </div>
        
        {/* Tenant Selector for Platform Admin */}
        {isPlatformAdmin && tenants.length > 0 && (
          <div className="w-64">
            <Select
              label="Visualizar Tenant"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
            >
              <option value="">Todos os Tenants (Global)</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.nome}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Admin Metrics (only for platform_admin and global view) */}
      {isPlatformAdmin && !selectedTenantId && adminMetrics && (
        <>
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <h2 className="text-xl font-bold mb-4">📊 Métricas da Plataforma</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-blue-100 text-sm">Total de Tenants</p>
                <p className="text-3xl font-bold">{adminMetrics.tenants.total}</p>
                <p className="text-blue-100 text-xs mt-1">
                  {adminMetrics.tenants.novos_30d} novos últimos 30 dias
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Total de Usuários</p>
                <p className="text-3xl font-bold">{adminMetrics.usuarios.total}</p>
                <p className="text-blue-100 text-xs mt-1">
                  {adminMetrics.usuarios.novos_30d} novos últimos 30 dias
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Receita Total</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(adminMetrics.financeiro.total_vendas)}
                </p>
                <p className="text-blue-100 text-xs mt-1">
                  Lucro: {formatCurrency(adminMetrics.financeiro.lucro_total)}
                </p>
              </div>
            </div>
          </div>

          {/* Top Tenants */}
          {adminMetrics.top_tenants.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4">🏆 Top Tenants</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="text-left p-2">Nome</th>
                      <th className="text-center p-2">Itens</th>
                      <th className="text-right p-2">Vendas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminMetrics.top_tenants.slice(0, 5).map((tenant) => (
                      <tr key={tenant.id} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-2 font-medium">{tenant.nome}</td>
                        <td className="p-2 text-center">{tenant.total_itens}</td>
                        <td className="p-2 text-right">{formatCurrency(tenant.total_vendas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total de Itens',
            value: formatNumber(metrics.total_itens),
            icon: ShirtIcon,
            color: 'bg-blue-500',
            subtitle: `${metrics.total_disponiveis} disponíveis`,
          },
          {
            title: 'Vendas Realizadas',
            value: formatNumber(metrics.total_vendidos),
            icon: Package,
            color: 'bg-green-500',
            subtitle: formatCurrency(metrics.valor_total_vendas),
          },
          {
            title: 'Lucro Total',
            value: formatCurrency(metrics.lucro_total),
            icon: TrendingUp,
            color: 'bg-gremio-celeste',
            subtitle: 'Margem de lucro',
          },
          {
            title: 'Valor do Acervo',
            value: formatCurrency(metrics.valor_acervo_atual),
            icon: DollarSign,
            color: 'bg-purple-500',
            subtitle: 'Itens disponíveis',
          },
        ].map((card, index) => (
          <div
            key={index}
            className="card hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {card.title}
                </p>
                <p className="text-2xl font-bold mt-1 text-neutral-900 dark:text-neutral-50">
                  {card.value}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {card.subtitle}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Welcome Message */}
      <div className="card bg-gradient-to-r from-gremio-celeste-500 to-gremio-celeste-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold">
              🔵⚫⚪ Bolicho do Grêmio
            </h2>
            <p className="mt-2 opacity-90">
              Sistema completo de gestão de camisetas colecionáveis - Vale dos Sinos
            </p>
            <p className="mt-4 text-sm opacity-80">
              💙🖤🤍 Tricolor de coração!
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Investimento</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">Total Investido</span>
              <span className="font-bold">{formatCurrency(metrics.valor_total_investido)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">Total em Vendas</span>
              <span className="font-bold text-green-600">{formatCurrency(metrics.valor_total_vendas)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-600 dark:text-neutral-400">Lucro</span>
              <span className="font-bold text-gremio-celeste">{formatCurrency(metrics.lucro_total)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold mb-4">Distribuição</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">Disponíveis</span>
              <span className="font-bold text-green-600">{formatNumber(metrics.total_disponiveis)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">Vendidos</span>
              <span className="font-bold text-blue-600">{formatNumber(metrics.total_vendidos)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-600 dark:text-neutral-400">Total</span>
              <span className="font-bold">{formatNumber(metrics.total_itens)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
