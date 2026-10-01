import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function tokenExpirado() {
  const token = localStorage.getItem('token');
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) return true;
    return false;
  } catch {
    return true; 
  }
}

export default function RutaProtegida({ rolRequerido, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (tokenExpirado()) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
  if (rolRequerido && user.role !== rolRequerido) {
    return <Navigate to={user.role === 'capturista' ? '/capturista' : '/mi-avance'} replace />;
  }
  return children;
}
