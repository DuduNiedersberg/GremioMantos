import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './shared/components/Layout';
import AdminRoute from './shared/components/AdminRoute';
import LoginPage from './features/auth/LoginPage';
import Dashboard from './features/dashboard/Dashboard';
import ItemList from './features/itens/ItemList';
import ItemDetails from './features/itens/ItemDetails';
import ItemForm from './features/itens/ItemForm';
import VendaRegistro from './features/vendas/VendaRegistro';
import VendaHistorico from './features/vendas/VendaHistorico';
import TrocaRegistro from './features/trocas/TrocaRegistro';
import TrocaHistorico from './features/trocas/TrocaHistorico';
import LotesList from './features/lotes/LotesList';
import Wishlist from './features/wishlist/Wishlist';
import ClientesList from './features/clientes/ClientesList';
import UsuariosList from './features/admin/UsuariosList';
import TenantsList from './features/admin/TenantsList';
import PlanosList from './features/admin/PlanosList';
import AdminDashboard from './features/admin/AdminDashboard';

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-celeste-600 text-white text-3xl font-bold mb-4 animate-pulse">
        G
      </div>
      <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter basename="/GremioMantos">
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            
            {/* Items */}
            <Route path="itens" element={<ItemList />} />
            <Route path="itens/novo" element={<ItemForm />} />
            <Route path="itens/:id" element={<ItemDetails />} />
            <Route path="itens/:id/editar" element={<ItemForm />} />
            
            {/* Sales */}
            <Route path="vendas" element={<VendaHistorico />} />
            <Route path="vendas/novo" element={<VendaRegistro />} />
            
            {/* Trades */}
            <Route path="trocas" element={<TrocaHistorico />} />
            <Route path="trocas/novo" element={<TrocaRegistro />} />
            
            {/* Batches */}
            <Route path="lotes" element={<LotesList />} />
            
            {/* Wishlist */}
            <Route path="wishlist" element={<Wishlist />} />
            
            {/* Customers */}
            <Route path="clientes" element={<ClientesList />} />
            
            {/* Platform - any admin (platform_admin or tenant_admin) */}
            <Route path="platform/usuarios" element={<AdminRoute><UsuariosList /></AdminRoute>} />
            
            {/* Platform - platform_admin only */}
            <Route path="platform/metricas" element={<AdminRoute platformOnly><AdminDashboard /></AdminRoute>} />
            <Route path="platform/tenants" element={<AdminRoute platformOnly><TenantsList /></AdminRoute>} />
            <Route path="platform/planos" element={<AdminRoute platformOnly><PlanosList /></AdminRoute>} />
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
