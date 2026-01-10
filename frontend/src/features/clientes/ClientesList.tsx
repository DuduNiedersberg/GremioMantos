import React, { useEffect, useState } from 'react';
import { Plus, Users, Search, Edit, Trash2, ChevronLeft, ChevronRight, X, Save } from 'lucide-react';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../../lib/api';
import { Cliente } from '../../types';
import { formatDate } from '../../shared/utils/formatters';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { TIPOS_CLIENTE, ESTADOS_BR } from '../../shared/utils/constants';

export default function ClientesList() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteModalCliente, setDeleteModalCliente] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    apelido: '',
    telefone: '',
    instagram: '',
    cidade: '',
    estado: '',
    tipo: '',
    observacoes: '',
  });

  const perPage = 10;

  useEffect(() => {
    loadClientes();
  }, [page]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const response = await getClientes({ page, perPage });
      const data = response.data.data;
      setClientes(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      showError('Erro ao carregar clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      apelido: '',
      telefone: '',
      instagram: '',
      cidade: '',
      estado: '',
      tipo: '',
      observacoes: '',
    });
    setEditingCliente(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome || '',
      apelido: cliente.apelido || '',
      telefone: cliente.telefone || '',
      instagram: cliente.instagram || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      tipo: cliente.tipo || '',
      observacoes: cliente.observacoes || '',
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
      
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData);
        success('Cliente atualizado com sucesso!');
      } else {
        await createCliente(formData);
        success('Cliente criado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
      loadClientes();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao salvar cliente');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalCliente) return;

    try {
      setDeleting(true);
      await deleteCliente(deleteModalCliente.id);
      success('Cliente excluído com sucesso!');
      setDeleteModalCliente(null);
      loadClientes();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao excluir cliente');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
    cliente.apelido?.toLowerCase().includes(search.toLowerCase()) ||
    cliente.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && clientes.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Clientes</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {total} clientes cadastrados
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nome, apelido ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clientes Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Apelido</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Telefone</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Instagram</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Cidade</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Tipo</th>
                <th className="text-center py-3 px-4 font-medium text-neutral-600 dark:text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr 
                  key={cliente.id} 
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium">{cliente.nome}</span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {cliente.apelido || '-'}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {cliente.telefone || '-'}
                  </td>
                  <td className="py-3 px-4">
                    {cliente.instagram ? (
                      <a 
                        href={`https://instagram.com/${cliente.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gremio-celeste hover:underline"
                      >
                        {cliente.instagram}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {cliente.cidade || '-'}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {cliente.tipo || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(cliente)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteModalCliente(cliente)}>
                        <Trash2 className="w-4 h-4 text-error" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClientes.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-neutral-500">Nenhum cliente encontrado</p>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
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
                placeholder="Nome completo"
                required
              />
              <Input
                label="Apelido"
                name="apelido"
                value={formData.apelido}
                onChange={handleChange}
                placeholder="Apelido ou nome de tratamento"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
                <Input
                  label="Instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder="@usuario"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  placeholder="Cidade"
                />
                <Select
                  label="Estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  options={ESTADOS_BR.map(e => ({ value: e, label: e }))}
                />
              </div>
              <Select
                label="Tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                options={TIPOS_CLIENTE.map(t => ({ value: t.value, label: t.label }))}
              />
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
                  {editingCliente ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Exclusão</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Tem certeza que deseja excluir o cliente <strong>{deleteModalCliente.nome}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setDeleteModalCliente(null)}>
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
