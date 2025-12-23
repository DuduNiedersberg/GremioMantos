import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout';
import Dashboard from './features/dashboard/Dashboard';
import ItemList from './features/itens/ItemList';
import ItemDetails from './features/itens/ItemDetails';
import VendaRegistro from './features/vendas/VendaRegistro';
import VendaHistorico from './features/vendas/VendaHistorico';
import TrocaRegistro from './features/trocas/TrocaRegistro';
import TrocaHistorico from './features/trocas/TrocaHistorico';
import LotesList from './features/lotes/LotesList';
import Wishlist from './features/wishlist/Wishlist';
import ClientesList from './features/clientes/ClientesList';

function App() {
  return (
    <BrowserRouter basename="/GremioMantos">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          
          {/* Items */}
          <Route path="itens" element={<ItemList />} />
          <Route path="itens/:id" element={<ItemDetails />} />
          
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
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
