import React, { useEffect, useState } from 'react';
import { getAdminPlanos } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { CreditCard, Check, X } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatters';

interface Plano {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  preco_mensal: number;
  taxa_comissao: number;
  limite_itens?: number;
  limite_imagens_por_item?: number;
  permite_automacoes: boolean;
  permite_api: boolean;
  total_tenants: number;
  ativo: boolean;
}

export default function PlanosList() {
  const [loading, setLoading] = useState(true);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const { error } = useToast();

  useEffect(() => {
    loadPlanos();
  }, []);

  const loadPlanos = async () => {
    try {
      setLoading(true);
      const response = await getAdminPlanos();
      setPlanos(response.data.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-50">
          Planos
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Visualize os planos disponíveis na plataforma
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map((plano) => (
          <div
            key={plano.id}
            className="card hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gremio-celeste text-white">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{plano.nome}</h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {plano.codigo}
                </span>
              </div>
            </div>

            {plano.descricao && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {plano.descricao}
              </p>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Preço Mensal
                </span>
                <span className="font-bold text-gremio-celeste">
                  {formatCurrency(plano.preco_mensal)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Taxa de Comissão
                </span>
                <span className="font-medium">
                  {plano.taxa_comissao}%
                </span>
              </div>

              {plano.limite_itens && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Limite de Itens
                  </span>
                  <span className="font-medium">
                    {plano.limite_itens}
                  </span>
                </div>
              )}

              {plano.limite_imagens_por_item && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Imagens por Item
                  </span>
                  <span className="font-medium">
                    {plano.limite_imagens_por_item}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Automações
                </span>
                {plano.permite_automacoes ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  API
                </span>
                {plano.permite_api ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Tenants usando
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                {plano.total_tenants}
              </span>
            </div>
          </div>
        ))}
      </div>

      {planos.length === 0 && (
        <div className="card text-center py-12">
          <CreditCard className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Nenhum plano cadastrado
          </p>
        </div>
      )}
    </div>
  );
}
