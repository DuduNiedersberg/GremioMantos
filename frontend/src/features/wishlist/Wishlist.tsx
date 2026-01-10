import React, { useEffect, useState } from 'react';
import { getWishlist, createWishlistItem, updateWishlistItem, deleteWishlistItem, convertWishlistItem } from '../../lib/api';
import { WishlistItem } from '../../types';
import { formatCurrency } from '../../shared/utils/formatters';
import { Plus, Heart, Edit, Trash2, Search, ChevronLeft, ChevronRight, X, Save, ShirtIcon } from 'lucide-react';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { PRIORIDADES, WISHLIST_STATUS, TAMANHOS, MARCAS, MODELOS } from '../../shared/utils/constants';

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prioridadeFilter, setPrioridadeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<WishlistItem | null>(null);
  const [convertModalItem, setConvertModalItem] = useState<WishlistItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertValorCompra, setConvertValorCompra] = useState('');
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    ano: '',
    marca: '',
    modelo: '',
    jogador: '',
    tamanho: '',
    valor_estimado: '',
    prioridade: 'media',
    observacoes: '',
    status: 'ativo',
  });

  const perPage = 12;

  useEffect(() => {
    loadWishlist();
  }, [page, statusFilter, prioridadeFilter]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const params: any = { page, perPage };
      if (statusFilter) params.status = statusFilter;
      if (prioridadeFilter) params.prioridade = prioridadeFilter;
      
      const response = await getWishlist(params);
      const data = response.data.data;
      setItems(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      showError('Erro ao carregar wishlist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      ano: '',
      marca: '',
      modelo: '',
      jogador: '',
      tamanho: '',
      valor_estimado: '',
      prioridade: 'media',
      observacoes: '',
      status: 'ativo',
    });
    setEditingItem(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: WishlistItem) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome || '',
      ano: item.ano?.toString() || '',
      marca: item.marca || '',
      modelo: item.modelo || '',
      jogador: item.jogador || '',
      tamanho: item.tamanho || '',
      valor_estimado: item.valor_estimado?.toString() || '',
      prioridade: item.prioridade || 'media',
      observacoes: item.observacoes || '',
      status: item.status || 'ativo',
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      showError('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      const dataToSave = {
        nome: formData.nome,
        ano: formData.ano ? parseInt(formData.ano) : null,
        marca: formData.marca || null,
        modelo: formData.modelo || null,
        jogador: formData.jogador || null,
        tamanho: formData.tamanho || null,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
        prioridade: formData.prioridade,
        observacoes: formData.observacoes || null,
        status: formData.status,
      };

      if (editingItem) {
        await updateWishlistItem(editingItem.id, dataToSave);
        success('Item atualizado com sucesso!');
      } else {
        await createWishlistItem(dataToSave);
        success('Item adicionado à wishlist!');
      }
      
      setShowModal(false);
      resetForm();
      loadWishlist();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao salvar item');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalItem) return;

    try {
      setDeleting(true);
      await deleteWishlistItem(deleteModalItem.id);
      success('Item removido da wishlist!');
      setDeleteModalItem(null);
      loadWishlist();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao excluir item');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleConvert = async () => {
    if (!convertModalItem) return;

    try {
      setConverting(true);
      await convertWishlistItem(convertModalItem.id, {
        valor_compra: convertValorCompra ? parseFloat(convertValorCompra) : convertModalItem.valor_estimado,
      });
      success('Item convertido para o acervo!');
      setConvertModalItem(null);
      setConvertValorCompra('');
      loadWishlist();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao converter item');
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.nome.toLowerCase().includes(search.toLowerCase()) ||
    item.jogador?.toLowerCase().includes(search.toLowerCase()) ||
    item.marca?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && items.length === 0) {
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
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: '', label: 'Todos os status' }, ...WISHLIST_STATUS.map(s => ({ value: s.value, label: s.label }))]}
          />
          <Select
            value={prioridadeFilter}
            onChange={(e) => {
              setPrioridadeFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: '', label: 'Todas as prioridades' }, ...PRIORIDADES.map(p => ({ value: p.value, label: p.label }))]}
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const prioridade = PRIORIDADES.find(p => p.value === item.prioridade);
          const statusObj = WISHLIST_STATUS.find(s => s.value === item.status);
          
          return (
            <div key={item.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Heart className={`w-6 h-6 ${item.status === 'ativo' ? 'text-error fill-error' : 'text-neutral-400'}`} />
                <div className="flex items-center space-x-2">
                  <span className={`badge ${prioridade?.color} text-white text-xs`}>
                    {prioridade?.label}
                  </span>
                  {item.status !== 'ativo' && (
                    <span className={`badge ${item.status === 'encontrado' ? 'bg-green-500' : 'bg-neutral-500'} text-white text-xs`}>
                      {statusObj?.label}
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-2">{item.nome}</h3>
              
              <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                {item.ano && <p>📅 {item.ano}</p>}
                {item.marca && <p>👕 {item.marca}</p>}
                {item.jogador && <p>⭐ {item.jogador}</p>}
                {item.tamanho && <p>📏 {item.tamanho}</p>}
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

              {/* Actions */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteModalItem(item)}>
                    <Trash2 className="w-4 h-4 text-error" />
                  </Button>
                </div>
                {item.status === 'ativo' && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      setConvertModalItem(item);
                      setConvertValorCompra(item.valor_estimado?.toString() || '');
                    }}
                  >
                    <ShirtIcon className="w-4 h-4 mr-1" />
                    Converter
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
          <p className="text-neutral-500">Nenhum item na wishlist</p>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Editar Item' : 'Novo Item na Wishlist'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome *"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Camisa Grêmio Libertadores 1995"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ano"
                  name="ano"
                  type="number"
                  value={formData.ano}
                  onChange={handleChange}
                  placeholder="1995"
                  min={1900}
                  max={2100}
                />
                <Select
                  label="Marca"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  options={MARCAS.map(m => ({ value: m, label: m }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Modelo"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  options={MODELOS.map(m => ({ value: m, label: m }))}
                />
                <Select
                  label="Tamanho"
                  name="tamanho"
                  value={formData.tamanho}
                  onChange={handleChange}
                  options={TAMANHOS.map(t => ({ value: t, label: t }))}
                />
              </div>
              <Input
                label="Jogador"
                name="jogador"
                value={formData.jogador}
                onChange={handleChange}
                placeholder="Nome do jogador"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Valor Estimado (R$)"
                  name="valor_estimado"
                  type="number"
                  step="0.01"
                  value={formData.valor_estimado}
                  onChange={handleChange}
                  placeholder="0.00"
                />
                <Select
                  label="Prioridade *"
                  name="prioridade"
                  value={formData.prioridade}
                  onChange={handleChange}
                  options={PRIORIDADES.map(p => ({ value: p.value, label: p.label }))}
                />
              </div>
              {editingItem && (
                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={WISHLIST_STATUS.map(s => ({ value: s.value, label: s.label }))}
                />
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Onde encontrar, contatos, etc..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border transition-all duration-200
                    bg-white dark:bg-neutral-800
                    text-neutral-900 dark:text-neutral-50
                    placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                    border-neutral-300 dark:border-neutral-600
                    focus:outline-none focus:ring-2 focus:ring-gremio-celeste-500/20 focus:border-gremio-celeste-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingItem ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Remover da Wishlist</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Tem certeza que deseja remover <strong>{deleteModalItem.nome}</strong> da wishlist?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setDeleteModalItem(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Item Modal */}
      {convertModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Converter para Acervo</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Converter <strong>{convertModalItem.nome}</strong> para um item do acervo?
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              Isso criará um novo item com os dados da wishlist e marcará este item como "encontrado".
            </p>
            <Input
              label="Valor de Compra (R$)"
              type="number"
              step="0.01"
              value={convertValorCompra}
              onChange={(e) => setConvertValorCompra(e.target.value)}
              placeholder="0.00"
              helperText="Informe o valor pelo qual você comprou o item"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={() => setConvertModalItem(null)}>
                Cancelar
              </Button>
              <Button onClick={handleConvert} loading={converting}>
                <ShirtIcon className="w-4 h-4 mr-2" />
                Converter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
