import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShirtIcon, 
  ShoppingCart, 
  RefreshCcw, 
  Package, 
  Heart, 
  Users 
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/itens', icon: ShirtIcon, label: 'Camisetas' },
  { to: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { to: '/trocas', icon: RefreshCcw, label: 'Trocas' },
  { to: '/lotes', icon: Package, label: 'Lotes' },
  { to: '/wishlist', icon: Heart, label: 'Wishlist' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
];

export default function Sidebar() {
  return (
    <nav className="p-4 space-y-2">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
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
    </nav>
  );
}
