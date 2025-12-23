import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Button from '../../shared/components/Button';

export default function TrocaHistorico() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Trocas</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Histórico de trocas realizadas
          </p>
        </div>
        <Link to="/trocas/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Troca
          </Button>
        </Link>
      </div>

      <div className="card">
        <p className="text-neutral-600 dark:text-neutral-400">
          Funcionalidade em desenvolvimento...
        </p>
      </div>
    </div>
  );
}
