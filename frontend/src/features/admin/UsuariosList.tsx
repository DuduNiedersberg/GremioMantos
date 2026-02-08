import React, { useEffect, useState } from 'react';
import { getAdminUsuarios, createAdminUsuario, updateAdminUsuario, toggleUsuarioAtivo, resetUsuarioSenha, getAdminTenants } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import Button from '../../shared/components/Button';
import { UserPlus, Search, Edit2, Key, Power } from 'lucide-react';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  tipo: string;
  tenant_id: number | null;
  tenant_nome?: string;
  ativo: boolean;
  criado_em: string;
  ultimo_login?: string;
}

interface Tenant {
  id: number;
  nome: string;
  slug: string;
}

export default function UsuariosList() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const { success, error } = useToast();
  const { user } = useAuth();

  const isPlatformAdmin = user?.tipo === 'platform_admin';

  useEffect(() => {
    loadUsuarios();
    if (isPlatformAdmin) {
      loadTenants();
    }
  }, [page, search, tipoFilter, tenantFilter]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const params: any = { page, perPage: 30 };
      if (search) params.search = search;
      if (tipoFilter) params.tipo = tipoFilter;
      if (tenantFilter) params.tenant_id = tenantFilter;

      const response = await getAdminUsuarios(params);
      setUsuarios(response.data.data);
      setTotal(response.data.total);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await getAdminTenants();
      setTenants(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar tenants:', err);
    }
  };

  const handleCreate = async (formData: any) => {
    try {
      await createAdminUsuario(formData);
      success('Usuário criado com sucesso');
      setShowCreateModal(false);
      loadUsuarios();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao criar usuário');
    }
  };

  const handleEdit = async (formData: any) => {
    if (!selectedUsuario) return;
    try {
      await updateAdminUsuario(selectedUsuario.id, formData);
      success('Usuário atualizado com sucesso');
      setShowEditModal(false);
      setSelectedUsuario(null);
      loadUsuarios();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao atualizar usuário');
    }
  };

  const handleToggleAtivo = async (usuario: Usuario) => {
    try {
      await toggleUsuarioAtivo(usuario.id);
      success(`Usuário ${usuario.ativo ? 'desativado' : 'ativado'} com sucesso`);
      loadUsuarios();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const handleResetPassword = async (novaSenha: string) => {
    if (!selectedUsuario) return;
    try {
      await resetUsuarioSenha(selectedUsuario.id, { nova_senha: novaSenha });
      success('Senha redefinida com sucesso');
      setShowResetModal(false);
      setSelectedUsuario(null);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao redefinir senha');
    }
  };

  if (loading && usuarios.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-50">
            Usuários
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Gerencie os usuários da plataforma
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              label="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou email..."
              icon={Search}
            />
          </div>
          <div>
            <Select
              label="Tipo"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="platform_admin">Platform Admin</option>
              <option value="tenant_admin">Tenant Admin</option>
              <option value="tenant_member">Tenant Member</option>
              <option value="colecionador">Colecionador</option>
            </Select>
          </div>
          {isPlatformAdmin && (
            <div>
              <Select
                label="Tenant"
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="text-left p-4">Nome</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Tipo</th>
              {isPlatformAdmin && <th className="text-left p-4">Tenant</th>}
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="p-4 font-medium">{usuario.nome}</td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  {usuario.email}
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {usuario.tipo}
                  </span>
                </td>
                {isPlatformAdmin && (
                  <td className="p-4 text-sm">{usuario.tenant_nome || '-'}</td>
                )}
                <td className="p-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      usuario.ativo
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedUsuario(usuario);
                        setShowEditModal(true);
                      }}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUsuario(usuario);
                        setShowResetModal(true);
                      }}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                      title="Redefinir senha"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(usuario)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                      title={usuario.ativo ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-4 h-4" />
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
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="px-4 py-2">
            Página {page} de {Math.ceil(total / 30)}
          </span>
          <Button
            variant="outline"
            disabled={page >= Math.ceil(total / 30)}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <UsuarioFormModal
          title="Criar Usuário"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          tenants={tenants}
          isPlatformAdmin={isPlatformAdmin}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUsuario && (
        <UsuarioFormModal
          title="Editar Usuário"
          usuario={selectedUsuario}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUsuario(null);
          }}
          onSubmit={handleEdit}
          tenants={tenants}
          isPlatformAdmin={isPlatformAdmin}
        />
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUsuario && (
        <ResetPasswordModal
          usuario={selectedUsuario}
          onClose={() => {
            setShowResetModal(false);
            setSelectedUsuario(null);
          }}
          onSubmit={handleResetPassword}
        />
      )}
    </div>
  );
}

// Modal components
interface UsuarioFormModalProps {
  title: string;
  usuario?: Usuario;
  onClose: () => void;
  onSubmit: (data: any) => void;
  tenants: Tenant[];
  isPlatformAdmin: boolean;
}

function UsuarioFormModal({ title, usuario, onClose, onSubmit, tenants, isPlatformAdmin }: UsuarioFormModalProps) {
  const { error } = useToast();
  const [formData, setFormData] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    senha: '',
    telefone: usuario?.telefone || '',
    tipo: usuario?.tipo || 'colecionador',
    tenant_id: usuario?.tenant_id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { ...formData };
    if (!usuario && !data.senha) {
      error('Senha é obrigatória para criar usuário');
      return;
    }
    if (usuario) {
      delete data.senha; // Don't update password in edit mode
      delete data.email; // Don't update email
    }
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          {!usuario && (
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          )}
          {!usuario && (
            <Input
              label="Senha"
              type="password"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              required
            />
          )}
          <Input
            label="Telefone"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          />
          <Select
            label="Tipo"
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          >
            {isPlatformAdmin ? (
              <>
                <option value="platform_admin">Platform Admin</option>
                <option value="tenant_admin">Tenant Admin</option>
                <option value="tenant_member">Tenant Member</option>
                <option value="colecionador">Colecionador</option>
              </>
            ) : (
              <>
                <option value="tenant_member">Tenant Member</option>
                <option value="colecionador">Colecionador</option>
              </>
            )}
          </Select>
          {isPlatformAdmin && (
            <Select
              label="Tenant"
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ usuario, onClose, onSubmit }: any) {
  const { error } = useToast();
  const [novaSenha, setNovaSenha] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSenha) {
      error('Senha é obrigatória');
      return;
    }
    onSubmit(novaSenha);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Redefinir Senha</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          Redefinir senha para <strong>{usuario.nome}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nova Senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Redefinir</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
