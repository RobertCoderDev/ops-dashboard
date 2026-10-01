import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CapturistaLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <nav className="navbar navbar-dark bg-primary px-3 app-navbar">
        <span className="navbar-brand mb-0 h1">📋 Panel del Capturista</span>
        <div className="d-flex align-items-center text-white flex-wrap gap-2">
          <span className="text-truncate usuario-nombre" style={{ maxWidth: 240 }}>{user?.nombre}</span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="layout-grid">
        <div className="sidebar p-3">
          <ul className="nav">
            <li className="nav-item">
              <NavLink to="/capturista" end className="nav-link">
                📊 Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/capturista/usuarios" className="nav-link">
                👥 Usuarios
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/capturista/cursos" className="nav-link">
                📚 Cursos
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/capturista/calificaciones" className="nav-link">
                ✏️ Capturar calificaciones
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/capturista/importar" className="nav-link">
                📥 Importar Excel
              </NavLink>
            </li>
          </ul>
        </div>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
