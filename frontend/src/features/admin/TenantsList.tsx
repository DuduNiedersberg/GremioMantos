import React, { useEffect, useState } from 'react';
import { getAdminTenants, getAdminPlanos, createAdminTenant, updateAdminTenant, toggleTenantAtivo, suspendTenant } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import Button from '../../shared/components/Button';
import { Building2, Search, Edit2, Power, Ban } from 'lucide-react';

interface Tenant {
  id: number;
  nome: string;
  slug: string;
  cidade?: string;
  estado?: string;
  plano_nome?: string;
  total_usuarios: number;
  total_itens: number;
  ativo: boolean;
  suspenso: boolean;
  criado_em: string;
}

interface Plano {
  id: number;
  codigo: string;
  nome: string;
}

export default function TenantsList() {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { success, error } = useToast();

  useEffect(() => {
    loadTenants();
    loadPlanos();
  }, [page, search]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const params: any = { page, perPage: 30 };
      if (search) params.search = search;

      const response = await getAdminTenants(params);
      // Handle both { data: [...] } and { success: true, data: { data: [...], total: ... } } shapes
      const payload = response.data?.data ?? response.data;
      const tenantsArray = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setTenants(tenantsArray);
      setTotal(response.data?.total ?? payload?.total ?? 0);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao carregar tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadPlanos = async () => {
    try {
      const response = await getAdminPlanos();
      // Handle both { data: [...] } and { success: true, data: [...] } shapes
      const payload = response.data?.data ?? response.data;
      const planosArray = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setPlanos(planosArray);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    }
  };

  const handleCreate = async (formData: any) => {
    try {
      await createAdminTenant(formData);
      success('Tenant criado com sucesso');
      setShowCreateModal(false);
      loadTenants();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao criar tenant');
    }
  };

  const handleEdit = async (formData: any) => {
    if (!selectedTenant) return;
    try {
      await updateAdminTenant(selectedTenant.id, formData);
      success('Tenant atualizado com sucesso');
      setShowEditModal(false);
      setSelectedTenant(null);
      loadTenants();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao atualizar tenant');
    }
  };

  const handleToggleAtivo = async (tenant: Tenant) => {
    try {
      await toggleTenantAtivo(tenant.id);
      success(`Tenant ${tenant.ativo ? 'desativado' : 'ativado'} com sucesso`);
      loadTenants();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const handleSuspend = async (suspenso: boolean, motivo?: string) => {
    if (!selectedTenant) return;
    try {
      await suspendTenant(selectedTenant.id, { suspenso, motivo_suspensao: motivo });
      success(suspenso ? 'Tenant suspenso' : 'Tenant reativado');
      setShowSuspendModal(false);
      setSelectedTenant(null);
      loadTenants();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao suspender/reativar tenant');
    }
  };

  if (loading && tenants.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-50">
            Tenants
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Gerencie os tenants da plataforma
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Building2 className="w-4 h-4 mr-2" />
          Novo Tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <Input
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome ou slug..."
        />
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="text-left p-4">Nome</th>
              <th className="text-left p-4">Slug</th>
              <th className="text-left p-4">Plano</th>
              <th className="text-left p-4">Usuários</th>
              <th className="text-left p-4">Itens</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="p-4 font-medium">{tenant.nome}</td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  {tenant.slug}
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {tenant.plano_nome || '-'}
                  </span>
                </td>
                <td className="p-4 text-center">{tenant.total_usuarios ?? 0}</td>
                <td className="p-4 text-center">{tenant.total_itens ?? 0}</td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        tenant.ativo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {tenant.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {tenant.suspenso && (
                      <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        Suspenso
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setShowEditModal(true);
                      }}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(tenant)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                      title={tenant.ativo ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setShowSuspendModal(true);
                      }}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                      title="Suspender/Reativar"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="px-4 py-2">
            Página {page} de {Math.ceil(total / 30)}
          </span>
          <Button
            variant="secondary"
            disabled={page >= Math.ceil(total / 30)}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <TenantFormModal
          title="Criar Tenant"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          planos={planos}
        />
      )}

      {showEditModal && selectedTenant && (
        <TenantFormModal
          title="Editar Tenant"
          tenant={selectedTenant}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTenant(null);
          }}
          onSubmit={handleEdit}
          planos={planos}
        />
      )}

      {showSuspendModal && selectedTenant && (
        <SuspendModal
          tenant={selectedTenant}
          onClose={() => {
            setShowSuspendModal(false);
            setSelectedTenant(null);
          }}
          onSubmit={handleSuspend}
        />
      )}
    </div>
  );
}

// Modal components
function TenantFormModal({ title, tenant, onClose, onSubmit, planos }: any) {
  const [formData, setFormData] = useState({
    nome: tenant?.nome || '',
    slug: tenant?.slug || '',
    descricao: tenant?.descricao || '',
    email: tenant?.email || '',
    telefone: tenant?.telefone || '',
    cidade: tenant?.cidade || '',
    estado: tenant?.estado || '',
    cep: tenant?.cep || '',
    plano_id: tenant?.plano_id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const generateSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full p-6 my-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={formData.nome}
              onChange={(e) => {
                const nome = e.target.value;
                setFormData({ ...formData, nome, slug: tenant ? formData.slug : generateSlug(nome) });
              }}
              required
            />
            <Input
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            />
            <Input
              label="Cidade"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            />
            <Input
              label="Estado"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            />
            <Input
              label="CEP"
              value={formData.cep}
              onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
            />
            <Select
              label="Plano"
              value={formData.plano_id}
              onChange={(e) => setFormData({ ...formData, plano_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {planos.map((p: Plano) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Descrição"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuspendModal({ tenant, onClose, onSubmit }: any) {
  const [suspenso, setSuspenso] = useState(!tenant.suspenso);
  const [motivo, setMotivo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(suspenso, motivo);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">
          {tenant.suspenso ? 'Reativar' : 'Suspender'} Tenant
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          <strong>{tenant.nome}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!tenant.suspenso && (
            <Input
              label="Motivo da suspensão"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Digite o motivo..."
            />
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {tenant.suspenso ? 'Reativar' : 'Suspender'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
