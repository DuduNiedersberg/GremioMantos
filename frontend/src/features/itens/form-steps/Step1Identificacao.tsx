import React from 'react';
import { Item } from '../../../types';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import { TIPOS_ITEM, MARCAS } from '../../../shared/utils/constants';

interface Step1Props {
  formData: Partial<Item>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function Step1Identificacao({ formData, onChange }: Step1Props) {
  return (
    <div className="space-y-4">
      <Select
        label="Tipo"
        name="tipo"
        value={formData.tipo || ''}
        onChange={onChange}
        options={TIPOS_ITEM.map(t => ({ value: t.value, label: t.label }))}
      />
      <Input
        label="Nome *"
        name="nome"
        value={formData.nome || ''}
        onChange={onChange}
        placeholder="Ex: Camiseta 2023 - Suárez #9"
        required
        helperText="Será preenchido automaticamente com base nos campos preenchidos"
      />
      <Input
        label="Ano"
        name="ano"
        type="number"
        value={formData.ano || ''}
        onChange={onChange}
        placeholder="2023"
        min={1900}
        max={2100}
      />
      <Select
        label="Marca"
        name="marca"
        value={formData.marca || ''}
        onChange={onChange}
        options={MARCAS.map(m => ({ value: m, label: m }))}
      />
    </div>
  );
}
