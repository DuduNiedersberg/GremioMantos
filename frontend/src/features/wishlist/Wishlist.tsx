import React, { useEffect, useState } from 'react';
import { getWishlist } from '../../lib/api';
import { WishlistItem } from '../../types';
import { formatCurrency } from '../../shared/utils/formatters';
import { Plus, Heart } from 'lucide-react';
import Button from '../../shared/components/Button';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { PRIORIDADES } from '../../shared/utils/constants';

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { error: showError } = useToast();

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await getWishlist();
      setItems(response.data.data.data || []);
    } catch (err) {
      showError('Erro ao carregar wishlist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Wishlist</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {items.filter(i => i.status === 'ativo').length} itens desejados
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const prioridade = PRIORIDADES.find(p => p.value === item.prioridade);
          return (
            <div key={item.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Heart className={`w-6 h-6 ${item.status === 'ativo' ? 'text-error fill-error' : 'text-neutral-400'}`} />
                <span className={`badge ${prioridade?.color} text-white`}>
                  {prioridade?.label}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-2">{item.nome}</h3>
              <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                {item.ano && <p>📅 {item.ano}</p>}
                {item.marca && <p>👕 {item.marca}</p>}
                {item.jogador && <p>⭐ {item.jogador}</p>}
              </div>
              {item.valor_estimado && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Valor estimado</span>
                    <span className="font-bold text-gremio-celeste">
                      {formatCurrency(item.valor_estimado)}
                    </span>
                  </div>
                </div>
              )}
              {item.observacoes && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                  {item.observacoes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
          <p className="text-neutral-500">Nenhum item na wishlist</p>
        </div>
      )}
    </div>
  );
}
