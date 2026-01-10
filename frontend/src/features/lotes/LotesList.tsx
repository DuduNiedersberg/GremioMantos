import React, { useEffect, useState } from 'react';
import { Plus, Package, Search, Edit, Trash2, ChevronLeft, ChevronRight, X, Save } from 'lucide-react';
import { getLotes, createLote, updateLote, deleteLote } from '../../lib/api';
import { Lote } from '../../types';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';

export default function LotesList() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [deleteModalLote, setDeleteModalLote] = useState<Lote | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    quantidade_total: '',
    quantidade_disponivel: '',
    valor_unitario_compra: '',
    data_aquisicao: '',
    observacoes: '',
  });

  const perPage = 10;

  useEffect(() => {
    loadLotes();
  }, [page]);

  const loadLotes = async () => {
    try {
      setLoading(true);
      const response = await getLotes({ page, perPage });
      const data = response.data.data;
      setLotes(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      showError('Erro ao carregar lotes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      quantidade_total: '',
      quantidade_disponivel: '',
      valor_unitario_compra: '',
      data_aquisicao: '',
      observacoes: '',
    });
    setEditingLote(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (lote: Lote) => {
    setEditingLote(lote);
    setFormData({
      nome: lote.nome || '',
      quantidade_total: lote.quantidade_total?.toString() || '',
      quantidade_disponivel: lote.quantidade_disponivel?.toString() || '',
      valor_unitario_compra: lote.valor_unitario_compra?.toString() || '',
      data_aquisicao: lote.data_aquisicao ? lote.data_aquisicao.split('T')[0] : '',
      observacoes: lote.observacoes || '',
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        quantidade_total: formData.quantidade_total ? parseInt(formData.quantidade_total) : null,
        quantidade_disponivel: formData.quantidade_disponivel ? parseInt(formData.quantidade_disponivel) : null,
        valor_unitario_compra: formData.valor_unitario_compra ? parseFloat(formData.valor_unitario_compra) : null,
        data_aquisicao: formData.data_aquisicao || null,
        observacoes: formData.observacoes || null,
      };

      if (editingLote) {
        await updateLote(editingLote.id, dataToSave);
        success('Lote atualizado com sucesso!');
      } else {
        await createLote(dataToSave);
        success('Lote criado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
      loadLotes();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao salvar lote');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalLote) return;

    try {
      setDeleting(true);
      await deleteLote(deleteModalLote.id);
      success('Lote excluído com sucesso!');
      setDeleteModalLote(null);
      loadLotes();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao excluir lote');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredLotes = lotes.filter(lote =>
    lote.nome.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && lotes.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Lotes</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {total} lotes cadastrados
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Lote
        </Button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lotes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLotes.map((lote) => (
          <div key={lote.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gremio-celeste p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(lote)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteModalLote(lote)}>
                  <Trash2 className="w-4 h-4 text-error" />
                </Button>
              </div>
            </div>
            
            <h3 className="font-bold text-lg mb-3">{lote.nome}</h3>
            
            <div className="space-y-2 text-sm">
              {lote.quantidade_total !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Quantidade Total:</span>
                  <span className="font-medium">{lote.quantidade_total}</span>
                </div>
              )}
              {lote.quantidade_disponivel !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Disponível:</span>
                  <span className="font-medium text-green-600">{lote.quantidade_disponivel}</span>
                </div>
              )}
              {lote.valor_unitario_compra !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Valor Unitário:</span>
                  <span className="font-medium">{formatCurrency(lote.valor_unitario_compra)}</span>
                </div>
              )}
              {lote.data_aquisicao && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Data Aquisição:</span>
                  <span className="font-medium">{formatDate(lote.data_aquisicao)}</span>
                </div>
              )}
            </div>

            {lote.observacoes && (
              <p className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                {lote.observacoes}
              </p>
            )}
          </div>
        ))}
      </div>

      {filteredLotes.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
          <p className="text-neutral-500">Nenhum lote encontrado</p>
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
                {editingLote ? 'Editar Lote' : 'Novo Lote'}
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
                placeholder="Ex: Lote Janeiro 2024"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantidade Total"
                  name="quantidade_total"
                  type="number"
                  value={formData.quantidade_total}
                  onChange={handleChange}
                  placeholder="0"
                  min={0}
                />
                <Input
                  label="Quantidade Disponível"
                  name="quantidade_disponivel"
                  type="number"
                  value={formData.quantidade_disponivel}
                  onChange={handleChange}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Valor Unitário (R$)"
                  name="valor_unitario_compra"
                  type="number"
                  step="0.01"
                  value={formData.valor_unitario_compra}
                  onChange={handleChange}
                  placeholder="0.00"
                />
                <Input
                  label="Data de Aquisição"
                  name="data_aquisicao"
                  type="date"
                  value={formData.data_aquisicao}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Informações adicionais..."
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
                  {editingLote ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Exclusão</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Tem certeza que deseja excluir o lote <strong>{deleteModalLote.nome}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setDeleteModalLote(null)}>
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
