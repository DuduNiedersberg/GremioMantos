import React from 'react';
import { Plus, Users } from 'lucide-react';
import Button from '../../shared/components/Button';

export default function ClientesList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Clientes</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Gerenciar clientes e compradores
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
          <p className="text-neutral-500">Funcionalidade em desenvolvimento...</p>
        </div>
      </div>
    </div>
  );
}
