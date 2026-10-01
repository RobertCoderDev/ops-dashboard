import React, { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

function leerUsuario() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || typeof u !== 'object' || typeof u.id !== 'number' || typeof u.role !== 'string') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
    return u;
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(leerUsuario);

  async function login(payload) {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
