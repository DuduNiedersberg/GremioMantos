import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getItens, deleteItem, publicarItemVitrine } from '../../lib/api';
import { Item } from '../../types';
import { formatCurrency } from '../../shared/utils/formatters';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Shirt, Eye, EyeOff } from 'lucide-react';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { SITUACOES } from '../../shared/utils/constants';

export default function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteModalItem, setDeleteModalItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { success, error: showError } = useToast();

  const perPage = 12;

  useEffect(() => {
    loadItems();
  }, [page, situacaoFilter]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const params: any = { page, perPage };
      if (situacaoFilter) params.situacao = situacaoFilter;
      
      const response = await getItens(params);
      const data = response.data.data;
      setItems(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      showError('Erro ao carregar itens');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalItem) return;

    try {
      setDeleting(true);
      await deleteItem(deleteModalItem.id);
      success('Item excluído com sucesso!');
      setDeleteModalItem(null);
      loadItems();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao excluir item');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleVitrine = async (item: Item, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const novoEstado = !item.publicado_vitrine;
      await publicarItemVitrine(item.id, { publicado: novoEstado });
      success(novoEstado ? 'Item publicado na vitrine!' : 'Item removido da vitrine');
      loadItems();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao alterar vitrine');
    }
  };

  const filteredItems = items.filter(item =>
    item.nome.toLowerCase().includes(search.toLowerCase()) ||
    item.jogador?.toLowerCase().includes(search.toLowerCase()) ||
    item.marca?.toLowerCase().includes(search.toLowerCase())
  );

  const situacaoColors: Record<string, string> = {
    disponivel: 'bg-green-100 text-green-800',
    vendido: 'bg-blue-100 text-blue-800',
    trocado: 'bg-purple-100 text-purple-800',
    reservado: 'bg-yellow-100 text-yellow-800',
  };

  if (loading && items.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Camisetas</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {total} itens no acervo
          </p>
        </div>
        <Link to="/itens/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <Input
              placeholder="Buscar por nome, jogador ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={situacaoFilter}
            onChange={(e) => {
              setSituacaoFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: '', label: 'Todas as situações' }, ...SITUACOES.map(s => ({ value: s.value, label: s.label }))]}
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="card hover:shadow-lg transition-shadow">
            <Link to={`/itens/${item.id}`}>
              <div className="aspect-square bg-neutral-100 dark:bg-neutral-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {item.imagem_principal_url ? (
                  <img 
                    src={item.imagem_principal_thumbnail || item.imagem_principal_url} 
                    alt={item.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shirt className="w-16 h-16 text-neutral-400" />
                )}
              </div>
              <h3 className="font-bold text-lg mb-2 line-clamp-1">{item.nome}</h3>
              <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                {item.ano && <p>📅 {item.ano}</p>}
                {item.marca && <p>👕 {item.marca}</p>}
                {item.jogador && <p>⭐ {item.jogador} {item.numero && `#${item.numero}`}</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Valor</span>
                  <span className="font-bold text-gremio-celeste">
                    {formatCurrency(item.valor_mercado || item.valor_venda)}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`badge ${situacaoColors[item.situacao] || 'bg-neutral-100 text-neutral-800'}`}>
                    {item.situacao}
                  </span>
                  {item.publicado_vitrine && (
                    <span className="badge bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ml-1">
                      Na Vitrine
                    </span>
                  )}
                </div>
              </div>
            </Link>
            {/* Actions */}
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleToggleVitrine(item, e)}
                title={item.publicado_vitrine ? 'Remover da vitrine' : 'Publicar na vitrine'}
              >
                {item.publicado_vitrine ? (
                  <Eye className="w-4 h-4 text-green-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-neutral-400" />
                )}
              </Button>
              <Link to={`/itens/${item.id}/editar`}>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteModalItem(item);
                }}
              >
                <Trash2 className="w-4 h-4 text-error" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500">Nenhum item encontrado</p>
        </div>
      )}

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

      {/* Delete Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Exclusão</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Tem certeza que deseja excluir o item <strong>{deleteModalItem.nome}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setDeleteModalItem(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
