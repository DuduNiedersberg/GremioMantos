import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../../shared/components/Button';

export default function TrocaRegistro() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold mb-4">Registrar Nova Troca</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Funcionalidade em desenvolvimento...
        </p>
      </div>
    </div>
  );
}
