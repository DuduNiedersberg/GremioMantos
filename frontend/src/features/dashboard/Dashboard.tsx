import React, { useEffect, useState } from 'react';
import { getDashboard } from '../../lib/api';
import { DashboardMetrics } from '../../types';
import { formatCurrency, formatNumber } from '../../shared/utils/formatters';
import { TrendingUp, ShirtIcon, DollarSign, Package } from 'lucide-react';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await getDashboard();
      setMetrics(response.data.data.metrics);
    } catch (err) {
      showError('Erro ao carregar dashboard');
      console.error(err);
    } finally {
      setLoading(false);
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

  const cards = [
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-50">
          Dashboard
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Visão geral do seu acervo de camisetas do Grêmio
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
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
