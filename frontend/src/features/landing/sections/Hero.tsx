import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-900 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          O bolicho que conecta apaixonados por futebol com praticidade e segurança
        </h1>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
          Gerencie, exiba e venda sua coleção de camisetas com facilidade
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/cadastro"
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold py-4 px-8 rounded-xl text-lg transition-colors shadow-lg"
          >
            Vem já briquear no nosso bolicho! 🏪
          </Link>
          <Link
            to="/vitrine"
            className="inline-block border-2 border-white text-white hover:bg-white/10 font-semibold py-4 px-8 rounded-xl text-lg transition-colors"
          >
            Explorar Camisetas →
          </Link>
        </div>
      </div>
    </section>
  );
}
