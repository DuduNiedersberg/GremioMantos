import React from 'react';
import { Store, MessageCircle, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Store,
    title: 'Vitrine Automática',
    description: 'Publique suas camisetas em uma vitrine pública compartilhável sem precisar criar um site.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Integrado',
    description: 'Compradores interessados clicam e já abrem uma conversa no WhatsApp com mensagem pré-formatada.',
  },
  {
    icon: BarChart3,
    title: 'Gestão Completa',
    description: 'Controle vendas, trocas, valores e histórico de preços da sua coleção em um só lugar.',
  },
];

export default function Features() {
  return (
    <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Por que usar o GremioMantos?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                  <Icon className="w-7 h-7 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
