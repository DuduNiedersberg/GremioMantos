import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
  platformOnly?: boolean;
}

/**
 * AdminRoute component for role-based access control
 * - By default, allows both platform_admin and tenant_admin
 * - With platformOnly=true, only allows platform_admin
 */
export default function AdminRoute({ children, platformOnly = false }: AdminRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user is any kind of admin
  const isAdmin = user.tipo === 'platform_admin' || user.tipo === 'tenant_admin';
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If platformOnly is true, check specifically for platform_admin
  if (platformOnly && user.tipo !== 'platform_admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
