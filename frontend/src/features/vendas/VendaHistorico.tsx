import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Button from '../../shared/components/Button';

export default function VendaHistorico() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Vendas</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Histórico de vendas realizadas
          </p>
        </div>
        <Link to="/vendas/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
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
