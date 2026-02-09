import React, { useEffect, useState } from 'react';
import { getAdminPlanos, createAdminPlano, updateAdminPlano, togglePlanoAtivo } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import { CreditCard, Check, X, Plus, Edit2, Power } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatters';

interface Plano {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  preco_mensal: number;
  taxa_comissao: number;
  limite_itens?: number;
  limite_imagens_por_item?: number;
  permite_automacoes: boolean;
  permite_api: boolean;
  total_tenants: number;
  ativo: boolean;
}

export default function PlanosList() {
  const [loading, setLoading] = useState(true);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const { success, error } = useToast();

  useEffect(() => {
    loadPlanos();
  }, []);

  const loadPlanos = async () => {
    try {
      setLoading(true);
      const response = await getAdminPlanos();
      setPlanos(response.data.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData: any) => {
    try {
      await createAdminPlano(formData);
      success('Plano criado com sucesso');
      setShowCreateModal(false);
      loadPlanos();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao criar plano');
    }
  };

  const handleEdit = async (formData: any) => {
    if (!selectedPlano) return;
    try {
      await updateAdminPlano(selectedPlano.id, formData);
      success('Plano atualizado com sucesso');
      setShowEditModal(false);
      setSelectedPlano(null);
      loadPlanos();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao atualizar plano');
    }
  };

  const handleToggleAtivo = async (plano: Plano) => {
    try {
      await togglePlanoAtivo(plano.id);
      success(`Plano ${plano.ativo ? 'desativado' : 'ativado'} com sucesso`);
      loadPlanos();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao alterar status');
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-50">
            Planos
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Gerencie os planos disponíveis na plataforma
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map((plano) => (
          <div
            key={plano.id}
            className="card hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gremio-celeste text-white">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{plano.nome}</h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {plano.codigo}
                </span>
              </div>
            </div>

            {plano.descricao && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {plano.descricao}
              </p>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Preço Mensal
                </span>
                <span className="font-bold text-gremio-celeste">
                  {formatCurrency(plano.preco_mensal)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Taxa de Comissão
                </span>
                <span className="font-medium">
                  {plano.taxa_comissao}%
                </span>
              </div>

              {plano.limite_itens && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Limite de Itens
                  </span>
                  <span className="font-medium">
                    {plano.limite_itens}
                  </span>
                </div>
              )}

              {plano.limite_imagens_por_item && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Imagens por Item
                  </span>
                  <span className="font-medium">
                    {plano.limite_imagens_por_item}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Automações
                </span>
                {plano.permite_automacoes ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  API
                </span>
                {plano.permite_api ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Tenants usando
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                {plano.total_tenants}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setSelectedPlano(plano);
                  setShowEditModal(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => handleToggleAtivo(plano)}
                className={`flex-1 px-4 py-2 rounded transition-colors flex items-center justify-center gap-2 ${
                  plano.ativo
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                }`}
                title={plano.ativo ? 'Desativar' : 'Ativar'}
              >
                <Power className="w-4 h-4" />
                {plano.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {planos.length === 0 && (
        <div className="card text-center py-12">
          <CreditCard className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Nenhum plano cadastrado
          </p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <PlanoFormModal
          title="Criar Plano"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPlano && (
        <PlanoFormModal
          title="Editar Plano"
          plano={selectedPlano}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlano(null);
          }}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}

// Modal component
interface PlanoFormModalProps {
  title: string;
  plano?: Plano;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

function PlanoFormModal({ title, plano, onClose, onSubmit }: PlanoFormModalProps) {
  const { error } = useToast();
  const [formData, setFormData] = useState({
    codigo: plano?.codigo || '',
    nome: plano?.nome || '',
    descricao: plano?.descricao || '',
    preco_mensal: plano?.preco_mensal || 0,
    taxa_comissao: plano?.taxa_comissao || 0,
    limite_itens: plano?.limite_itens || '',
    limite_imagens_por_item: plano?.limite_imagens_por_item || '',
    permite_automacoes: plano?.permite_automacoes || false,
    permite_api: plano?.permite_api || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { ...formData };
    
    // Convert empty strings to null for numeric fields
    if (data.limite_itens === '') data.limite_itens = null;
    if (data.limite_imagens_por_item === '') data.limite_imagens_por_item = null;
    
    if (!data.codigo || !data.nome) {
      error('Código e nome são obrigatórios');
      return;
    }
    
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Código"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              required
              disabled={!!plano}
              placeholder="ex: FREE, PRO"
            />
            <Input
              label="Nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              placeholder="ex: Plano Grátis"
            />
          </div>
          
          <Input
            label="Descrição"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Descrição do plano"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Preço Mensal (R$)"
              type="number"
              step="0.01"
              min="0"
              value={formData.preco_mensal}
              onChange={(e) => setFormData({ ...formData, preco_mensal: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Taxa de Comissão (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.taxa_comissao}
              onChange={(e) => setFormData({ ...formData, taxa_comissao: parseFloat(e.target.value) || 0 })}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Limite de Itens"
              type="number"
              min="0"
              value={formData.limite_itens}
              onChange={(e) => setFormData({ ...formData, limite_itens: e.target.value })}
              placeholder="Deixe vazio para ilimitado"
            />
            <Input
              label="Imagens por Item"
              type="number"
              min="0"
              value={formData.limite_imagens_por_item}
              onChange={(e) => setFormData({ ...formData, limite_imagens_por_item: e.target.value })}
              placeholder="Deixe vazio para ilimitado"
            />
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.permite_automacoes}
                onChange={(e) => setFormData({ ...formData, permite_automacoes: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-gremio-celeste focus:ring-gremio-celeste"
              />
              <span className="text-sm font-medium">Permite Automações</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.permite_api}
                onChange={(e) => setFormData({ ...formData, permite_api: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-gremio-celeste focus:ring-gremio-celeste"
              />
              <span className="text-sm font-medium">Permite API</span>
            </label>
          </div>
          
          <div className="flex gap-2 justify-end pt-4">
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
