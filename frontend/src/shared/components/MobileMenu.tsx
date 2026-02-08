import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X, LayoutDashboard, ShirtIcon, ShoppingCart, RefreshCcw, Package, Heart, Users, UserCog, Building2, CreditCard } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/itens', icon: ShirtIcon, label: 'Camisetas' },
  { to: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { to: '/trocas', icon: RefreshCcw, label: 'Trocas' },
  { to: '/lotes', icon: Package, label: 'Lotes' },
  { to: '/wishlist', icon: Heart, label: 'Wishlist' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
];

const adminNavItems = [
  { to: '/admin/usuarios', icon: UserCog, label: 'Usuários' },
  { to: '/admin/tenants', icon: Building2, label: 'Tenants' },
  { to: '/admin/planos', icon: CreditCard, label: 'Planos' },
];

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { user } = useAuth();
  const isAdmin = user?.tipo === 'platform_admin';

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-neutral-800 z-50 shadow-xl animate-slide-in">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold text-gremio-celeste">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-gremio-celeste text-white shadow-gremio'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-5 h-5', isActive && 'drop-shadow-md')} />
                  <span className="font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          
          {isAdmin && (
            <>
              <div className="my-4 border-t border-neutral-200 dark:border-neutral-700"></div>
              <div className="px-4 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                Administração
              </div>
              {adminNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-gremio-celeste text-white shadow-gremio'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={clsx('w-5 h-5', isActive && 'drop-shadow-md')} />
                      <span className="font-medium">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </div>
    </>
  );
}
