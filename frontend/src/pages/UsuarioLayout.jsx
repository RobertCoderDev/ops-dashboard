import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UsuarioLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <nav className="navbar navbar-dark bg-primary px-3 app-navbar">
        <span className="navbar-brand mb-0 h1">🎓 Mi avance de capacitación</span>
        <div className="d-flex align-items-center text-white flex-wrap gap-2">
          <span className="text-truncate usuario-nombre" style={{ maxWidth: 240 }}>{user?.nombre}</span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="content-area">
        <ul className="nav nav-tabs mt-3 mb-4 tabs-scroll">
          <li className="nav-item">
            <NavLink to="/mi-avance" end className="nav-link">
              📈 Reporte de avance
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/mi-avance/estatus" className="nav-link">
              ✅ Estatus de mis evaluaciones
            </NavLink>
          </li>
        </ul>

        <Outlet />
      </div>
    </div>
  );
}
