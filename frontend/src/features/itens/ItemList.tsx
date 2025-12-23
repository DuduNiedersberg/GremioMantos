import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getItens } from '../../lib/api';
import { Item } from '../../types';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import { Plus, Search } from 'lucide-react';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';

export default function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { error: showError } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await getItens();
      setItems(response.data.data.data || []);
    } catch (err) {
      showError('Erro ao carregar itens');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.nome.toLowerCase().includes(search.toLowerCase()) ||
    item.jogador?.toLowerCase().includes(search.toLowerCase()) ||
    item.marca?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Camisetas</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {items.length} itens no acervo
          </p>
        </div>
        <Link to="/itens/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </Link>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nome, jogador ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Link key={item.id} to={`/itens/${item.id}`}>
            <div className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="aspect-square bg-neutral-100 dark:bg-neutral-700 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-6xl">👕</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{item.nome}</h3>
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
                  <span className={`badge ${
                    item.situacao === 'disponivel' ? 'bg-green-100 text-green-800' :
                    item.situacao === 'vendido' ? 'bg-blue-100 text-blue-800' :
                    item.situacao === 'reservado' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-neutral-100 text-neutral-800'
                  }`}>
                    {item.situacao}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500">Nenhum item encontrado</p>
        </div>
      )}
    </div>
  );
}
