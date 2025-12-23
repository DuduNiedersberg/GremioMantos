import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileMenu from './MobileMenu';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex pt-16">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-64 fixed left-0 top-16 bottom-0 overflow-y-auto bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700">
            <Sidebar />
          </div>
        )}
        
        {/* Mobile Menu */}
        {isMobile && (
          <MobileMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        
        {/* Main Content */}
        <main className={`flex-1 ${!isMobile ? 'ml-64' : ''} p-4 sm:p-6 lg:p-8`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
