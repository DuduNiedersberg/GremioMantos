import React from 'react';
import { Item } from '../../../types';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import { CONDICOES } from '../../../shared/utils/constants';

interface Step3Props {
  formData: Partial<Item>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function Step3Condicao({ formData, onChange }: Step3Props) {
  return (
    <div className="space-y-4">
      <Select
        label="Estado / Condição"
        name="condicao"
        value={formData.condicao || ''}
        onChange={onChange}
        options={CONDICOES.map(c => ({ value: c.value, label: c.label }))}
      />
      <div className="flex items-center space-x-3 pt-2">
        <input
          type="checkbox"
          id="autografada"
          name="autografada"
          checked={formData.autografada || false}
          onChange={onChange}
          className="w-4 h-4 rounded border-neutral-300 text-gremio-celeste focus:ring-gremio-celeste"
        />
        <label htmlFor="autografada" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
          Autografada?
        </label>
      </div>
      {formData.autografada && (
        <Input
          label="Descrição do Autógrafo"
          name="autografo_descricao"
          value={formData.autografo_descricao || ''}
          onChange={onChange}
          placeholder="Ex: Autógrafo do Renato Portaluppi"
        />
      )}
    </div>
  );
}
