import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getVendas } from '../../lib/api';
import { Venda } from '../../types';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';

export default function VendaHistorico() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: showError } = useToast();

  const perPage = 10;

  useEffect(() => {
    loadVendas();
  }, [page]);

  const loadVendas = async () => {
    try {
      setLoading(true);
      const response = await getVendas({ page, perPage });
      const data = response.data.data;
      setVendas(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      showError('Erro ao carregar vendas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendas = vendas.filter(venda =>
    venda.item_nome?.toLowerCase().includes(search.toLowerCase()) ||
    venda.cliente_nome?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && vendas.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Vendas</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {total} vendas realizadas
          </p>
        </div>
        <Link to="/vendas/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <Input
            placeholder="Buscar por item ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Vendas Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Item</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Cliente</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Data</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Valor Compra</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Valor Venda</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendas.map((venda) => (
                <tr 
                  key={venda.id} 
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium">{venda.item_nome || `Item #${venda.item_id}`}</span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {venda.cliente_nome || '-'}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {formatDate(venda.data_venda)}
                  </td>
                  <td className="py-3 px-4 text-right text-neutral-600 dark:text-neutral-400">
                    {formatCurrency(venda.valor_compra)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-green-600">
                    {formatCurrency(venda.valor_venda)}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold ${(venda.lucro || 0) >= 0 ? 'text-green-600' : 'text-error'}`}>
                    {formatCurrency(venda.lucro)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVendas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-500">Nenhuma venda encontrada</p>
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
    </div>
  );
}
