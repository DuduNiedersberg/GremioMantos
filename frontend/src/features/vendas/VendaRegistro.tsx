import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { createVenda, getItens, getClientes } from '../../lib/api';
import { Item, Cliente } from '../../types';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import Select from '../../shared/components/Select';
import SearchSelect from '../../shared/components/SearchSelect';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { FORMAS_PAGAMENTO } from '../../shared/utils/constants';
import { formatCurrency } from '../../shared/utils/formatters';

export default function VendaRegistro() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [formData, setFormData] = useState({
    item_id: '',
    cliente_id: '',
    valor_venda: '',
    data_venda: new Date().toISOString().split('T')[0],
    forma_pagamento: '',
    observacoes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, clientesRes] = await Promise.all([
        getItens({ situacao: 'estoque', perPage: 100 }),
        getClientes({ perPage: 100 }),
      ]);
      setItems(itemsRes.data.data.data || []);
      setClientes(clientesRes.data.data.data || []);
    } catch (err) {
      showError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'item_id' && value) {
      const item = items.find(i => i.id === parseInt(value));
      setSelectedItem(item || null);
      if (item?.valor_venda) {
        setFormData(prev => ({ ...prev, valor_venda: item.valor_venda?.toString() || '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item_id) {
      showError('Selecione um item');
      return;
    }

    if (!formData.valor_venda || parseFloat(formData.valor_venda) <= 0) {
      showError('Informe o valor da venda');
      return;
    }

    try {
      setSaving(true);
      
      await createVenda({
        item_id: parseInt(formData.item_id),
        cliente_id: formData.cliente_id ? parseInt(formData.cliente_id) : null,
        valor_venda: parseFloat(formData.valor_venda),
        data_venda: formData.data_venda,
        forma_pagamento: formData.forma_pagamento || null,
        observacoes: formData.observacoes || null,
      });
      
      success('Venda registrada com sucesso!');
      navigate('/vendas');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao registrar venda');
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
        <Button variant="ghost" onClick={() => navigate('/vendas')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Registrar Nova Venda</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Selection */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Selecione o Item</h2>
          <SearchSelect
            label="Item *"
            name="item_id"
            value={formData.item_id}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, item_id: value.toString() }));
              const item = items.find(i => i.id === parseInt(value.toString()));
              setSelectedItem(item || null);
              if (item?.valor_venda) {
                setFormData(prev => ({ ...prev, valor_venda: item.valor_venda?.toString() || '' }));
              }
            }}
            options={items.map(i => ({ 
              value: i.id, 
              label: `${i.nome}${i.jogador ? ` - ${i.jogador}` : ''}${i.ano ? ` (${i.ano})` : ''}`,
              searchTerms: `${i.marca || ''} ${i.jogador || ''} ${i.ano || ''} ${i.tamanho || ''}`
            }))}
            placeholder="Digite para buscar item..."
          />
          
          {selectedItem && (
            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
              <h3 className="font-medium mb-2">{selectedItem.nome}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {selectedItem.marca && (
                  <div>
                    <span className="text-neutral-500">Marca:</span>
                    <span className="ml-1">{selectedItem.marca}</span>
                  </div>
                )}
                {selectedItem.tamanho && (
                  <div>
                    <span className="text-neutral-500">Tamanho:</span>
                    <span className="ml-1">{selectedItem.tamanho}</span>
                  </div>
                )}
                <div>
                  <span className="text-neutral-500">Valor Compra:</span>
                  <span className="ml-1">{formatCurrency(selectedItem.valor_compra)}</span>
                </div>
                {selectedItem.valor_venda && (
                  <div>
                    <span className="text-neutral-500">Valor Sugerido:</span>
                    <span className="ml-1 text-green-600 font-medium">{formatCurrency(selectedItem.valor_venda)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Client Selection */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Cliente (opcional)</h2>
          <Select
            label="Cliente"
            name="cliente_id"
            value={formData.cliente_id}
            onChange={handleChange}
            options={clientes.map(c => ({ 
              value: c.id, 
              label: `${c.nome}${c.apelido ? ` (${c.apelido})` : ''}`
            }))}
          />
        </div>

        {/* Sale Details */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Detalhes da Venda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Valor da Venda (R$) *"
              name="valor_venda"
              type="number"
              step="0.01"
              value={formData.valor_venda}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
            <Input
              label="Data da Venda *"
              name="data_venda"
              type="date"
              value={formData.data_venda}
              onChange={handleChange}
              required
            />
            <Select
              label="Forma de Pagamento"
              name="forma_pagamento"
              value={formData.forma_pagamento}
              onChange={handleChange}
              options={FORMAS_PAGAMENTO.map(f => ({ value: f, label: f }))}
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
            placeholder="Informações adicionais sobre a venda..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border transition-all duration-200
              bg-white dark:bg-neutral-800
              text-neutral-900 dark:text-neutral-50
              placeholder:text-neutral-400 dark:placeholder:text-neutral-500
              border-neutral-300 dark:border-neutral-600
              focus:outline-none focus:ring-2 focus:ring-gremio-celeste-500/20 focus:border-gremio-celeste-500"
          />
        </div>

        {/* Profit Preview */}
        {selectedItem && formData.valor_venda && (
          <div className="card bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
            <h2 className="text-lg font-bold mb-2">Previsão de Lucro</h2>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Lucro estimado:
              </span>
              <span className={`text-2xl font-bold ${
                parseFloat(formData.valor_venda) - (selectedItem.valor_compra || 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-error'
              }`}>
                {formatCurrency(parseFloat(formData.valor_venda) - (selectedItem.valor_compra || 0))}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" type="button" onClick={() => navigate('/vendas')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Registrar Venda
          </Button>
        </div>
      </form>
    </div>
  );
}
