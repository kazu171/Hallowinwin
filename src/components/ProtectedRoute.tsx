import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminAuthed } from '@/lib/adminAuth';

interface Props { children: React.ReactNode }

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  if (!isAdminAuthed()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;

