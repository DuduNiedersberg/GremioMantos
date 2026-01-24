import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { getTrocas, cancelTroca } from '../../lib/api';
import { Troca } from '../../types';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';

export default function TrocaHistorico() {
  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [cancelModalTroca, setCancelModalTroca] = useState<Troca | null>(null);
  const [canceling, setCanceling] = useState(false);
  const { success, error: showError } = useToast();

  const perPage = 10;

  useEffect(() => {
    loadTrocas();
  }, [page, statusFilter]);

  const loadTrocas = async () => {
    try {
      setLoading(true);
      const params: any = { page, perPage };
      if (statusFilter) params.status = statusFilter;
      
      const response = await getTrocas(params);
      const data = response.data.data;
      setTrocas(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      showError('Erro ao carregar trocas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelModalTroca) return;

    try {
      setCanceling(true);
      await cancelTroca(cancelModalTroca.id);
      success('Troca cancelada com sucesso!');
      setCancelModalTroca(null);
      loadTrocas();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao cancelar troca');
      console.error(err);
    } finally {
      setCanceling(false);
    }
  };

  const filteredTrocas = trocas.filter(troca =>
    troca.item_dado_nome?.toLowerCase().includes(search.toLowerCase()) ||
    troca.item_recebido_nome?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    ativa: 'bg-green-100 text-green-800',
    cancelada: 'bg-red-100 text-red-800',
  };

  if (loading && trocas.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Trocas</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {total} trocas realizadas
          </p>
        </div>
        <Link to="/trocas/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Troca
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <Input
              placeholder="Buscar por item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'ativa', label: 'Ativas' },
              { value: 'cancelada', label: 'Canceladas' },
            ]}
          />
        </div>
      </div>

      {/* Trocas Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Item Dado</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Item Recebido</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Data</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Valor Adicional</th>
                <th className="text-center py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Status</th>
                <th className="text-center py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrocas.map((troca) => (
                <tr 
                  key={troca.id} 
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium">{troca.item_dado_nome || `Item #${troca.item_dado_id}`}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{troca.item_recebido_nome || `Item #${troca.item_recebido_id}`}</span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {formatDate(troca.data_troca)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {troca.valor_adicional ? (
                      <span className="font-medium">
                        {formatCurrency(troca.valor_adicional)}
                        {troca.quem_pagou && (
                          <span className="text-xs text-neutral-500 ml-1">
                            ({troca.quem_pagou === 'nos' ? 'paguei' : 'recebi'})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`badge ${statusColors[troca.status] || 'bg-neutral-100 text-neutral-800'}`}>
                      {troca.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {troca.status === 'ativa' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setCancelModalTroca(troca)}
                      >
                        <XCircle className="w-4 h-4 text-error" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTrocas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-500">Nenhuma troca encontrada</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Cancelar Troca</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Tem certeza que deseja cancelar esta troca?<br />
              <span className="text-sm">
                <strong>{cancelModalTroca.item_dado_nome}</strong> ↔ <strong>{cancelModalTroca.item_recebido_nome}</strong>
              </span>
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setCancelModalTroca(null)}>
                Voltar
              </Button>
              <Button variant="danger" onClick={handleCancel} loading={canceling}>
                Cancelar Troca
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
