import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { createItem, updateItem, getItem, getLotes } from '../../lib/api';
import { Item, Lote } from '../../types';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { SITUACOES, TAMANHOS, MARCAS, MODELOS, TIPOS_ITEM, CONDICOES } from '../../shared/utils/constants';
import ImageUploader from '../../components/ImageUploader';

export default function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [formData, setFormData] = useState<Partial<Item>>({
    nome: '',
    tipo: '',
    ano: undefined,
    marca: '',
    modelo: '',
    jogador: '',
    numero: undefined,
    tamanho: '',
    cor_principal: '',
    condicao: '',
    autografada: false,
    autografo_descricao: '',
    valor_compra: undefined,
    valor_venda: undefined,
    valor_mercado: undefined,
    situacao: 'estoque',
    destino: '',
    data_aquisicao: '',
    observacoes: '',
    lote_id: undefined,
  });

  useEffect(() => {
    loadLotes();
    if (isEditing && id) {
      loadItem(parseInt(id));
    }
  }, [id, isEditing]);

  const loadLotes = async () => {
    try {
      const response = await getLotes({ perPage: 100 });
      setLotes(response.data.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar lotes:', err);
    }
  };

  const loadItem = async (itemId: number) => {
    try {
      setLoading(true);
      const response = await getItem(itemId);
      const item = response.data.data;
      setFormData({
        ...item,
        data_aquisicao: item.data_aquisicao ? item.data_aquisicao.split('T')[0] : '',
      });
    } catch (err) {
      showError('Erro ao carregar item');
      console.error(err);
      navigate('/itens');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      newValue = value === '' ? undefined : parseFloat(value);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
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
        ...formData,
        valor_compra: formData.valor_compra ?? 0,
      };

      if (isEditing && id) {
        await updateItem(parseInt(id), dataToSave);
        success('Item atualizado com sucesso!');
      } else {
        await createItem(dataToSave);
        success('Item criado com sucesso!');
      }
      
      navigate('/itens');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao salvar item');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/itens')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Item' : 'Nova Camiseta'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Nome *"
              name="nome"
              value={formData.nome || ''}
              onChange={handleChange}
              placeholder="Ex: Camisa Grêmio Home 2023"
              required
            />
            <Select
              label="Tipo"
              name="tipo"
              value={formData.tipo || ''}
              onChange={handleChange}
              options={TIPOS_ITEM.map(t => ({ value: t.value, label: t.label }))}
            />
            <Input
              label="Ano"
              name="ano"
              type="number"
              value={formData.ano || ''}
              onChange={handleChange}
              placeholder="2023"
              min={1900}
              max={2100}
            />
            <Select
              label="Marca"
              name="marca"
              value={formData.marca || ''}
              onChange={handleChange}
              options={MARCAS.map(m => ({ value: m, label: m }))}
            />
            <Select
              label="Modelo"
              name="modelo"
              value={formData.modelo || ''}
              onChange={handleChange}
              options={MODELOS.map(m => ({ value: m, label: m }))}
            />
            <Input
              label="Cor Principal"
              name="cor_principal"
              value={formData.cor_principal || ''}
              onChange={handleChange}
              placeholder="Azul/Preto/Branco"
            />
          </div>
        </div>

        {/* Player/Number Info */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Jogador e Numeração</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Jogador"
              name="jogador"
              value={formData.jogador || ''}
              onChange={handleChange}
              placeholder="Nome do jogador"
            />
            <Input
              label="Número"
              name="numero"
              type="number"
              value={formData.numero || ''}
              onChange={handleChange}
              placeholder="10"
              min={0}
              max={99}
            />
            <Select
              label="Tamanho"
              name="tamanho"
              value={formData.tamanho || ''}
              onChange={handleChange}
              options={TAMANHOS.map(t => ({ value: t, label: t }))}
            />
          </div>
        </div>

        {/* Condition Info */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Condição e Autógrafo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Condição"
              name="condicao"
              value={formData.condicao || ''}
              onChange={handleChange}
              options={CONDICOES.map(c => ({ value: c.value, label: c.label }))}
            />
            <div className="flex items-center space-x-4 pt-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="autografada"
                  checked={formData.autografada || false}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-neutral-300 text-gremio-celeste focus:ring-gremio-celeste"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Autografada
                </span>
              </label>
            </div>
            {formData.autografada && (
              <Input
                label="Descrição do Autógrafo"
                name="autografo_descricao"
                value={formData.autografo_descricao || ''}
                onChange={handleChange}
                placeholder="Ex: Autógrafo do Renato Portaluppi"
              />
            )}
          </div>
        </div>

        {/* Values Info */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Valor de Compra (R$)"
              name="valor_compra"
              type="number"
              step="0.01"
              value={formData.valor_compra || ''}
              onChange={handleChange}
              placeholder="0.00"
            />
            <Input
              label="Valor de Venda (R$)"
              name="valor_venda"
              type="number"
              step="0.01"
              value={formData.valor_venda || ''}
              onChange={handleChange}
              placeholder="0.00"
            />
            <Input
              label="Valor de Mercado (R$)"
              name="valor_mercado"
              type="number"
              step="0.01"
              value={formData.valor_mercado || ''}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Status Info */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Status e Origem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Situação"
              name="situacao"
              value={formData.situacao || 'estoque'}
              onChange={handleChange}
              options={SITUACOES.map(s => ({ value: s.value, label: s.label }))}
            />
            <Input
              label="Destino"
              name="destino"
              value={formData.destino || ''}
              onChange={handleChange}
              placeholder="Ex: Venda, Coleção pessoal"
            />
            <Input
              label="Data de Aquisição"
              name="data_aquisicao"
              type="date"
              value={formData.data_aquisicao || ''}
              onChange={handleChange}
            />
            <Select
              label="Lote"
              name="lote_id"
              value={formData.lote_id || ''}
              onChange={handleChange}
              options={lotes.map(l => ({ value: l.id, label: l.nome }))}
            />
          </div>
        </div>

        {/* Observations */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Observações</h2>
          <textarea
            name="observacoes"
            value={formData.observacoes || ''}
            onChange={handleChange}
            placeholder="Informações adicionais sobre o item..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border transition-all duration-200
              bg-white dark:bg-neutral-800
              text-neutral-900 dark:text-neutral-50
              placeholder:text-neutral-400 dark:placeholder:text-neutral-500
              border-neutral-300 dark:border-neutral-600
              focus:outline-none focus:ring-2 focus:ring-gremio-celeste-500/20 focus:border-gremio-celeste-500"
          />
        </div>

        {/* Image Upload - Only available when editing */}
        {isEditing && id && (
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Imagens do Item</h2>
            <ImageUploader
              tipo="item"
              itemId={parseInt(id, 10)}
              maxFiles={5}
              onUploadComplete={(uploadedImages) => {
                const message = uploadedImages.length === 1 
                  ? '1 imagem enviada com sucesso!' 
                  : `${uploadedImages.length} imagens enviadas com sucesso!`;
                success(message);
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" type="button" onClick={() => navigate('/itens')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Salvar Alterações' : 'Criar Item'}
          </Button>
        </div>
      </form>
    </div>
  );
}
