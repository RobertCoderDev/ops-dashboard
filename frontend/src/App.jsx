import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';

import Login from './pages/Login';
import CapturistaLayout from './pages/CapturistaLayout';
import CapturistaDashboard from './pages/CapturistaDashboard';
import CapturistaUsuarios from './pages/CapturistaUsuarios';
import CapturistaCursos from './pages/CapturistaCursos';
import CapturistaCalificaciones from './pages/CapturistaCalificaciones';
import CapturistaImportar from './pages/CapturistaImportar';
import UsuarioLayout from './pages/UsuarioLayout';
import UsuarioReporte from './pages/UsuarioReporte';
import UsuarioEstatus from './pages/UsuarioEstatus';

function InicioRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'capturista' ? '/capturista' : '/mi-avance'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<InicioRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/capturista"
            element={
              <RutaProtegida rolRequerido="capturista">
                <CapturistaLayout />
              </RutaProtegida>
            }
          >
            <Route index element={<CapturistaDashboard />} />
            <Route path="usuarios" element={<CapturistaUsuarios />} />
            <Route path="cursos" element={<CapturistaCursos />} />
            <Route path="calificaciones" element={<CapturistaCalificaciones />} />
            <Route path="importar" element={<CapturistaImportar />} />
          </Route>

          <Route
            path="/mi-avance"
            element={
              <RutaProtegida rolRequerido="usuario">
                <UsuarioLayout />
              </RutaProtegida>
            }
          >
            <Route index element={<UsuarioReporte />} />
            <Route path="estatus" element={<UsuarioEstatus />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
