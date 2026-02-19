import React from 'react';
import { Link } from 'react-router-dom';
import { Shirt } from 'lucide-react';

export default function VitrinePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-8 text-center">
      <Shirt className="w-16 h-16 text-blue-600 mb-4" />
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Vitrine</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Em breve — explore as camisetas disponíveis.</p>
      <Link to="/" className="text-blue-600 hover:underline font-semibold">
        ← Voltar à página inicial
      </Link>
    </div>
  );
}
