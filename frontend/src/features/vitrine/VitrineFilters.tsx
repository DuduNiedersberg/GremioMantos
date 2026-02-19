import React from 'react';
import { X } from 'lucide-react';

interface VitrineFiltersProps {
  filters: {
    marca?: string;
    ano?: string;
    tamanho?: string;
    preco_min?: string;
    preco_max?: string;
  };
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

const TAMANHOS = ['P', 'M', 'G', 'GG', 'XGG', 'Infantil'];
const MAX_YEAR = new Date().getFullYear() + 1;

export default function VitrineFilters({ filters, onChange, onClear }: VitrineFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Filtros</h3>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <X className="w-3 h-3" />
          Limpar Filtros
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Marca</label>
        <input
          type="text"
          value={filters.marca || ''}
          onChange={(e) => onChange('marca', e.target.value)}
          placeholder="Ex: Nike, Adidas..."
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ano</label>
        <input
          type="number"
          value={filters.ano || ''}
          onChange={(e) => onChange('ano', e.target.value)}
          placeholder="Ex: 2023"
          min="1900"
          max={MAX_YEAR}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tamanho</label>
        <select
          value={filters.tamanho || ''}
          onChange={(e) => onChange('tamanho', e.target.value)}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          {TAMANHOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Preço Mínimo (R$)</label>
        <input
          type="number"
          value={filters.preco_min || ''}
          onChange={(e) => onChange('preco_min', e.target.value)}
          placeholder="0,00"
          min="0"
          step="0.01"
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Preço Máximo (R$)</label>
        <input
          type="number"
          value={filters.preco_max || ''}
          onChange={(e) => onChange('preco_max', e.target.value)}
          placeholder="0,00"
          min="0"
          step="0.01"
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
