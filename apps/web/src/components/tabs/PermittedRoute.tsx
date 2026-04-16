import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PermittedRouteProps {
  path: string;
  children: React.ReactElement;
}

export const PermittedRoute: React.FC<PermittedRouteProps> = ({ path, children }) => {
  const { user } = useAuth();
  if (user?.role === 'SUPERUSER' || user?.role === 'ADMIN') return children;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (user?.permissions?.[normalizedPath]?.read) return children;
  return <Navigate to="/" replace />;
};
