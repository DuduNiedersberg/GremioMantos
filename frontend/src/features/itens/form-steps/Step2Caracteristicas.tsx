import React from 'react';
import { Item } from '../../../types';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import { MODELOS, TAMANHOS } from '../../../shared/utils/constants';

interface Step2Props {
  formData: Partial<Item>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function Step2Caracteristicas({ formData, onChange }: Step2Props) {
  return (
    <div className="space-y-4">
      <Select
        label="Modelo"
        name="modelo"
        value={formData.modelo || ''}
        onChange={onChange}
        options={MODELOS.map(m => ({ value: m, label: m }))}
      />
      <Input
        label="Jogador"
        name="jogador"
        value={formData.jogador || ''}
        onChange={onChange}
        placeholder="Nome do jogador"
      />
      <Input
        label="Número"
        name="numero"
        type="number"
        value={formData.numero !== undefined ? formData.numero : ''}
        onChange={onChange}
        placeholder="10"
        min={0}
        max={99}
      />
      <Select
        label="Tamanho"
        name="tamanho"
        value={formData.tamanho || ''}
        onChange={onChange}
        options={TAMANHOS.map(t => ({ value: t, label: t }))}
      />
      <Input
        label="Cor Principal"
        name="cor_principal"
        value={formData.cor_principal || ''}
        onChange={onChange}
        placeholder="Azul/Preto/Branco"
      />
    </div>
  );
}
