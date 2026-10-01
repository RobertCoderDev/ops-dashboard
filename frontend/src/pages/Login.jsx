import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [modo, setModo] = useState('usuario'); 
  const [employeeId, setEmployeeId] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = modo === 'usuario' ? { employeeId } : { nombre, password };
      const user = await login(payload);
      navigate(user.role === 'capturista' ? '/capturista' : '/mi-avance');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function cambiarModo(nuevo) {
    setModo(nuevo);
    setError('');
  }

  return (
    <div className="login-wrapper">
      <div className="card login-card">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <h3 className="fw-bold">Seguimiento de Capacitaciones</h3>
            <p className="text-muted mb-0">Inicia sesión para continuar</p>
          </div>

          <div className="btn-group w-100 mb-4" role="group">
            <button
              type="button"
              className={`btn btn-sm ${modo === 'usuario' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => cambiarModo('usuario')}
            >
              Soy usuario
            </button>
            <button
              type="button"
              className={`btn btn-sm ${modo === 'capturista' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => cambiarModo('capturista')}
            >
              Soy capturista
            </button>
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <form onSubmit={handleSubmit}>
            {modo === 'usuario' ? (
              <div className="mb-4">
                <label className="form-label">Número de empleado</label>
                <input
                  className="form-control"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="ej. 1001"
                  autoFocus
                  required
                />
                <div className="form-text">No necesitas contraseña, solo tu número de empleado.</div>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="form-label">Nombre completo</label>
                  <input
                    className="form-control"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="ej. Admin"
                    autoFocus
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">Contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            )}

            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <hr className="my-4" />
          {/* Credenciales de prueba: solo visibles en desarrollo (Vite las
              elimina del bundle de producción con import.meta.env.DEV). */}
          {import.meta.env.DEV && (
            <>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
