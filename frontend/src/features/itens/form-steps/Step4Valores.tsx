import React from 'react';
import { Item } from '../../../types';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import { SITUACOES } from '../../../shared/utils/constants';

interface Step4Props {
  formData: Partial<Item>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function Step4Valores({ formData, onChange }: Step4Props) {
  return (
    <div className="space-y-4">
      <Input
        label="Valor de Compra (R$)"
        name="valor_compra"
        type="number"
        step="0.01"
        value={formData.valor_compra !== undefined ? formData.valor_compra : ''}
        onChange={onChange}
        placeholder="0.00"
      />
      <Input
        label="Valor de Venda (R$)"
        name="valor_venda"
        type="number"
        step="0.01"
        value={formData.valor_venda !== undefined ? formData.valor_venda : ''}
        onChange={onChange}
        placeholder="0.00"
      />
      <Input
        label="Valor de Mercado (R$)"
        name="valor_mercado"
        type="number"
        step="0.01"
        value={formData.valor_mercado !== undefined ? formData.valor_mercado : ''}
        onChange={onChange}
        placeholder="0.00"
      />
      <Select
        label="Situação"
        name="situacao"
        value={formData.situacao || 'estoque'}
        onChange={onChange}
        options={SITUACOES.map(s => ({ value: s.value, label: s.label }))}
      />
      <Input
        label="Data de Aquisição"
        name="data_aquisicao"
        type="date"
        value={formData.data_aquisicao || ''}
        onChange={onChange}
      />
      <div className="w-full">
        <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
          Observações
        </label>
        <textarea
          name="observacoes"
          value={formData.observacoes || ''}
          onChange={onChange}
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
    </div>
  );
}
