import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ArrowLeftRight } from 'lucide-react';
import { createTroca, getItens } from '../../lib/api';
import { Item } from '../../types';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import SearchSelect from '../../shared/components/SearchSelect';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../shared/utils/formatters';

export default function TrocaRegistro() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [selectedItemDado, setSelectedItemDado] = useState<Item | null>(null);

  const [formData, setFormData] = useState({
    item_dado_id: '',
    item_recebido_nome: '',
    item_recebido_valor: '',
    valor_adicional: '',
    quem_pagou: '',
    data_troca: new Date().toISOString().split('T')[0],
    observacoes: '',
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await getItens({ situacao: 'disponivel', perPage: 100 });
      setMyItems(response.data.data.data || []);
    } catch (err) {
      showError('Erro ao carregar itens');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'item_dado_id' && value) {
      const item = myItems.find(i => i.id === parseInt(value));
      setSelectedItemDado(item || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item_dado_id) {
      showError('Selecione o item que será dado na troca');
      return;
    }

    if (!formData.item_recebido_nome) {
      showError('Informe o nome do item que será recebido');
      return;
    }

    try {
      setSaving(true);
      
      await createTroca({
        item_dado_id: parseInt(formData.item_dado_id),
        item_recebido_nome: formData.item_recebido_nome,
        item_recebido_valor: formData.item_recebido_valor ? parseFloat(formData.item_recebido_valor) : null,
        valor_adicional: formData.valor_adicional ? parseFloat(formData.valor_adicional) : null,
        quem_pagou: formData.quem_pagou || null,
        data_troca: formData.data_troca,
        observacoes: formData.observacoes || null,
      });
      
      success('Troca registrada com sucesso!');
      navigate('/trocas');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao registrar troca');
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
        <Button variant="ghost" onClick={() => navigate('/trocas')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Registrar Nova Troca</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Selection - My Item */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Item que você dará</h2>
          <Select
            label="Selecione o item do seu acervo *"
            name="item_dado_id"
            value={formData.item_dado_id}
            onChange={handleChange}
            options={myItems.map(i => ({ 
              value: i.id, 
              label: `${i.nome}${i.jogador ? ` - ${i.jogador}` : ''}${i.ano ? ` (${i.ano})` : ''}`
            }))}
          />
          
          {selectedItemDado && (
            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
              <h3 className="font-medium mb-2">{selectedItemDado.nome}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {selectedItemDado.marca && (
                  <div>
                    <span className="text-neutral-500">Marca:</span>
                    <span className="ml-1">{selectedItemDado.marca}</span>
                  </div>
                )}
                {selectedItemDado.tamanho && (
                  <div>
                    <span className="text-neutral-500">Tamanho:</span>
                    <span className="ml-1">{selectedItemDado.tamanho}</span>
                  </div>
                )}
                <div>
                  <span className="text-neutral-500">Valor:</span>
                  <span className="ml-1">{formatCurrency(selectedItemDado.valor_mercado || selectedItemDado.valor_venda || selectedItemDado.valor_compra)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Arrow between items */}
        <div className="flex justify-center">
          <div className="bg-gremio-celeste p-3 rounded-full">
            <ArrowLeftRight className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Item Received */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Item que você receberá</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do item *"
              name="item_recebido_nome"
              value={formData.item_recebido_nome}
              onChange={handleChange}
              placeholder="Ex: Camisa Grêmio Home 2020"
              required
            />
            <Input
              label="Valor estimado (R$)"
              name="item_recebido_valor"
              type="number"
              step="0.01"
              value={formData.item_recebido_valor}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Additional Value */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Valor Adicional (volta)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Valor adicional (R$)"
              name="valor_adicional"
              type="number"
              step="0.01"
              value={formData.valor_adicional}
              onChange={handleChange}
              placeholder="0.00"
              helperText="Valor que foi pago além da troca"
            />
            <Select
              label="Quem pagou o valor adicional?"
              name="quem_pagou"
              value={formData.quem_pagou}
              onChange={handleChange}
              options={[
                { value: 'eu', label: 'Eu paguei' },
                { value: 'outro', label: 'A outra pessoa pagou' },
              ]}
            />
          </div>
        </div>

        {/* Trade Details */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Detalhes da Troca</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data da Troca *"
              name="data_troca"
              type="date"
              value={formData.data_troca}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Observations */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Observações</h2>
          <textarea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            placeholder="Informações adicionais sobre a troca..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border transition-all duration-200
              bg-white dark:bg-neutral-800
              text-neutral-900 dark:text-neutral-50
              placeholder:text-neutral-400 dark:placeholder:text-neutral-500
              border-neutral-300 dark:border-neutral-600
              focus:outline-none focus:ring-2 focus:ring-gremio-celeste-500/20 focus:border-gremio-celeste-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" type="button" onClick={() => navigate('/trocas')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Registrar Troca
          </Button>
        </div>
      </form>
    </div>
  );
}
