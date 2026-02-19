import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Shirt, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import VitrineItemCard from './VitrineItemCard';
import VitrineFilters from './VitrineFilters';
import VitrineItemModal from './VitrineItemModal';
import { API_URL } from '../../lib/api';

interface VitrineItem {
  id: number;
  nome: string;
  ano?: number;
  marca?: string;
  modelo?: string;
  jogador?: string;
  tamanho?: string;
  condicao?: string;
  valor_venda?: number;
  imagem_url?: string;
  thumbnail_url?: string;
  imagens?: Array<{ url: string; thumbnail_url?: string }>;
  tenant_whatsapp?: string;
  tenant_slug?: string;
}

interface TenantInfo {
  nome: string;
  slug: string;
  vitrine_titulo?: string;
  vitrine_descricao?: string;
  vitrine_banner_url?: string;
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface Filters {
  marca?: string;
  ano?: string;
  tamanho?: string;
  preco_min?: string;
  preco_max?: string;
}

export default function VitrinePage() {
  const { slug } = useParams<{ slug?: string }>();

  const [items, setItems] = useState<VitrineItem[]>([]);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, perPage: 12, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VitrineItem | null>(null);
  const [tenantWhatsapp, setTenantWhatsapp] = useState<string | undefined>();

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      if (!slug) {
        const res = await axios.get(`${API_URL}/vitrine/preview`);
        const data = res.data;
        const list: VitrineItem[] = Array.isArray(data?.data) ? data.data : [];
        setItems(list);
        setPagination({ page: 1, perPage: list.length, total: list.length, totalPages: 1 });
        if (list.length > 0 && list[0].tenant_whatsapp) {
          setTenantWhatsapp(list[0].tenant_whatsapp);
        }
      } else {
        const params: Record<string, any> = { page, perPage: 12, ...filters };
        Object.keys(params).forEach((k) => {
          if (params[k] === '' || params[k] == null) delete params[k];
        });
        const res = await axios.get(`${API_URL}/vitrine/${slug}`, { params });
        const body = res.data;
        if (body?.success && body?.data) {
          setTenant(body.data.tenant || null);
          setItems(body.data.itens || []);
          if (body.data.pagination) setPagination(body.data.pagination);
          const wpp = body.data.tenant?.whatsapp || body.data.tenant?.telefone;
          setTenantWhatsapp(wpp);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar vitrine.');
    } finally {
      setLoading(false);
    }
  }, [slug, filters]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => setFilters({});

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchData(newPage);
  };

  const title = tenant?.vitrine_titulo || (tenant ? `Vitrine de ${tenant.nome}` : 'Vitrine de Camisetas');
  const description = tenant?.vitrine_descricao;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top navigation bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="flex items-center gap-1.5">
            <Shirt className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900 dark:text-white text-sm hidden sm:inline">GremioMantos</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/login"
              className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </header>

      {/* Banner */}
      {tenant?.vitrine_banner_url && (
        <div className="w-full h-48 sm:h-64 overflow-hidden">
          <img
            src={tenant.vitrine_banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Page title */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>

      {/* Main layout: filters + grid */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters sidebar — only shown when slug is present */}
          {slug && (
            <aside className="w-full lg:w-64 flex-shrink-0">
              <VitrineFilters
                filters={filters}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
              />
            </aside>
          )}

          {/* Items grid */}
          <main className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-24">
                <p className="text-red-500 font-medium">{error}</p>
                <button
                  onClick={() => fetchData(pagination.page)}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Shirt className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum item encontrado.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {items.map((item) => (
                    <VitrineItemCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modal */}
      {selectedItem && (
        <VitrineItemModal
          item={selectedItem}
          tenantWhatsapp={selectedItem.tenant_whatsapp || tenantWhatsapp}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
