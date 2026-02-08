import React from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { APP_NAME, APP_SUBTITLE } from '../utils/constants';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'platform_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'tenant_admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'tenant_member':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'platform_admin':
        return 'Admin Plataforma';
      case 'tenant_admin':
        return 'Admin';
      case 'tenant_member':
        return 'Membro';
      case 'colecionador':
        return 'Colecionador';
      default:
        return tipo;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gremio-celeste rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-display font-bold text-gremio-celeste">
                {APP_NAME}
              </h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 hidden sm:block">
                {APP_SUBTITLE}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* User Info */}
          {user && (
            <div className="hidden md:flex items-center space-x-3 mr-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.nome}
                </p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getTipoBadgeColor(user.tipo)}`}>
                  {getTipoLabel(user.tipo)}
                </span>
              </div>
              <div className="w-8 h-8 bg-gremio-celeste rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          <ThemeToggle />
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
