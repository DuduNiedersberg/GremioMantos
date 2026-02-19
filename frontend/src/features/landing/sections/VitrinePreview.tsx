import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shirt } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://gremiomantosapi-d6gshveqc4fee0c2.brazilsouth-01.azurewebsites.net/api';

interface VitrineItem {
  id: number;
  nome: string;
  ano?: number;
  marca?: string;
  jogador?: string;
  valor_venda?: number;
  imagem_url?: string;
  thumbnail_url?: string;
  tenant_slug?: string;
  tenant_nome?: string;
}

function formatBRL(value?: number) {
  if (!value) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function VitrinePreview() {
  const [itens, setItens] = useState<VitrineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/vitrine/preview`)
      .then((res) => setItens(res.data?.data || []))
      .catch(() => setItens([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Camisetas em Destaque
          </h2>
          <Link to="/vitrine" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            Ver Todas as Camisetas →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse aspect-square" />
            ))}
          </div>
        ) : itens.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum item disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {itens.map((item) => (
              <Link
                key={item.id}
                to={`/vitrine${item.tenant_slug ? `/${item.tenant_slug}` : ''}`}
                className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {item.thumbnail_url || item.imagem_url ? (
                    <img
                      src={item.thumbnail_url || item.imagem_url}
                      alt={item.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Shirt className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{item.nome}</p>
                  {item.ano && <p className="text-xs text-gray-500">{item.ano}{item.marca ? ` · ${item.marca}` : ''}</p>}
                  {item.valor_venda && (
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {formatBRL(item.valor_venda)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
