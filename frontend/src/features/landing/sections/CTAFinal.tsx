import React from 'react';
import { Link } from 'react-router-dom';

export default function CTAFinal() {
  return (
    <section className="py-16 px-4 bg-blue-700 text-white text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">Pronto para mostrar sua coleção?</h2>
        <p className="text-blue-100 mb-8 text-lg">
          Crie sua conta gratuita e comece a gerir e vender suas camisetas hoje mesmo.
        </p>
        <Link
          to="/cadastro"
          className="inline-block bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold py-4 px-10 rounded-xl text-lg transition-colors shadow-lg"
        >
          Criar Conta Grátis
        </Link>
      </div>
    </section>
  );
}
