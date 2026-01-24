import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface Option {
  value: string | number;
  label: string;
  searchTerms?: string; // Termos adicionais para busca
}

interface SearchSelectProps {
  label?: string;
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  name?: string;
}

export default function SearchSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Digite para buscar...',
  error,
  helperText,
  disabled,
  name,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = options.filter(option => {
    const searchLower = search.toLowerCase();
    const labelMatch = option.label.toLowerCase().includes(searchLower);
    const termsMatch = option.searchTerms?.toLowerCase().includes(searchLower);
    return labelMatch || termsMatch;
  });

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resetar highlight quando filtro muda
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(i => Math.min(i + 1, filteredOptions.length - 1));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex(i => Math.max(i - 1, 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
          setSearch('');
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear with appropriate empty value for the type
    onChange(typeof value === 'number' ? 0 : '');
    setSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          className={clsx(
            'w-full px-3 py-2 rounded-lg border transition-all duration-200 cursor-pointer',
            'bg-white dark:bg-neutral-800',
            'text-neutral-900 dark:text-neutral-50',
            'flex items-center gap-2',
            error
              ? 'border-error focus-within:ring-error/20'
              : 'border-neutral-300 dark:border-neutral-600 focus-within:ring-2 focus-within:ring-gremio-celeste-500/20 focus-within:border-gremio-celeste-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && setIsOpen(true)}
        >
          <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none placeholder:text-neutral-400"
              autoFocus
              disabled={disabled}
            />
          ) : (
            <span className={clsx('flex-1 truncate', !selectedOption && 'text-neutral-400')}>
              {selectedOption?.label || placeholder}
            </span>
          )}

          {value && !isOpen ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          ) : (
            <ChevronDown className={clsx('w-4 h-4 text-neutral-400 transition-transform', isOpen && 'rotate-180')} />
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-500">
                Nenhum item encontrado
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={clsx(
                    'px-3 py-2 cursor-pointer text-sm',
                    index === highlightedIndex && 'bg-gremio-celeste-50 dark:bg-gremio-celeste-900/20',
                    option.value === value && 'font-medium text-gremio-celeste-600'
                  )}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Hidden input for form compatibility */}
      <input type="hidden" name={name} value={value} />

      {error && <p className="mt-1 text-sm text-error">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{helperText}</p>
      )}
    </div>
  );
}
