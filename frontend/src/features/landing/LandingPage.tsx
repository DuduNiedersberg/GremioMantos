import React from 'react';
import { Link } from 'react-router-dom';
import Hero from './sections/Hero';
import VitrinePreview from './sections/VitrinePreview';
import Features from './sections/Features';
import CTAFinal from './sections/CTAFinal';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">GremioMantos</span>
          <div className="flex items-center gap-3">
            <Link to="/vitrine" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
              Vitrine
            </Link>
            <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>

      <Hero />
      <VitrinePreview />
      <Features />
      <CTAFinal />

      <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        © 2024 GremioMantos · Todos os direitos reservados
      </footer>
    </div>
  );
}
