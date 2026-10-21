import React, { useEffect, useState } from 'react';
import api from '../api';

const VACIO = { password: '', nombre: '', uen: '', sitio: '', role: 'usuario', employeeId: '' };

export default function CapturistaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get('/users');
      setUsuarios(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    const siguiente = { ...form, [name]: value };
    if (name === 'role' && value === 'usuario') siguiente.password = '';
    setForm(siguiente);
  }

  function handleEditar(u) {
    setError('');
    setOk('');
    setEditandoId(u.id);
    setForm({
      password: '',
      nombre: u.nombre || '',
      uen: u.uen === '-' ? '' : (u.uen || ''),
      sitio: u.sitio === '-' ? '' : (u.sitio || ''),
      role: u.role || 'usuario',
      employeeId: u.employeeId || '',
    });
  }

  function handleCancelar() {
    setEditandoId(null);
    setForm(VACIO);
    setError('');
    setOk('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      if (editandoId) {
        const { data } = await api.put(`/users/${editandoId}`, form);
        setOk(
          data.avisoNombreDuplicado
            ? `Usuario "${form.nombre}" actualizado. Aviso: ya había otra persona con ese nombre.`
            : `Usuario "${form.nombre}" actualizado correctamente.`
        );
        setEditandoId(null);
        setForm(VACIO);
      } else {
        const { data } = await api.post('/users', form);
        setOk(
          data.avisoNombreDuplicado
            ? `Usuario "${form.nombre}" creado. Aviso: ya había otra persona con ese nombre (no afecta el login).`
            : `Usuario "${form.nombre}" creado correctamente.`
        );
        setForm(VACIO);
      }
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || (editandoId ? 'Error al actualizar el usuario' : 'Error al crear el usuario'));
    }
  }

  async function handleEliminar(u) {
    if (!confirm(`¿Eliminar al usuario "${u.nombre}"? Esto también borrará sus calificaciones.`)) return;
    setError('');
    setOk('');
    try {
      await api.delete(`/users/${u.id}`);
      setOk(`Usuario "${u.nombre}" eliminado.`);
      if (editandoId === u.id) {
        setEditandoId(null);
        setForm(VACIO);
      }
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el usuario');
    }
  }

  const usuariosFiltrados = usuarios.filter((u) =>
    `${u.nombre} ${u.uen} ${u.sitio} ${u.employeeId ?? ''}`.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div>
      <h3 className="mb-4">Gestión de usuarios</h3>
      <p className="small text-muted">
        Los <strong>usuarios</strong> entran al sistema solo con su <strong>número de empleado</strong> (sin
        contraseña). Los <strong>capturistas</strong> entran con nombre + contraseña.
      </p>

      <div className="row">
        <div className="col-lg-4 mb-4">
          <div className="table-responsive-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{editandoId ? 'Editar usuario' : 'Agregar usuario'}</h5>
              {editandoId && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-0"
                  onClick={handleCancelar}
                >
                  ✕ Cancelar
                </button>
              )}
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}
            {ok && <div className="alert alert-success py-2">{ok}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label className="form-label small mb-1">Rol</label>
                <select className="form-select form-select-sm" name="role" value={form.role} onChange={handleChange}>
                  <option value="usuario">Usuario</option>
                  <option value="capturista">Capturista</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small mb-1">Nombre completo</label>
                <input className="form-control form-control-sm" name="nombre" value={form.nombre} onChange={handleChange} required />
              </div>

              {form.role === 'usuario' ? (
                <div className="mb-2">
                  <label className="form-label small mb-1">Número de empleado</label>
                  <input
                    className="form-control form-control-sm"
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleChange}
                    placeholder="ej. 10456"
                    required
                  />
                  <div className="form-text">Es lo único que esta persona necesita para iniciar sesión.</div>
                </div>
              ) : (
                <div className="mb-2">
                  <label className="form-label small mb-1">
                    {editandoId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-sm"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={editandoId ? 'Dejar en blanco para no cambiar' : ''}
                    required={!editandoId}
                  />
                  {editandoId && (
                    <div className="form-text">Dejar en blanco para mantener la contraseña actual.</div>
                  )}
                </div>
              )}

              <div className="mb-2">
                <label className="form-label small mb-1">UEN</label>
                <input className="form-control form-control-sm" name="uen" value={form.uen} onChange={handleChange} placeholder="ej. Comercial" />
              </div>
              <div className="mb-3">
                <label className="form-label small mb-1">Sitio</label>
                <input className="form-control form-control-sm" name="sitio" value={form.sitio} onChange={handleChange} placeholder="ej. CDMX" />
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-primary btn-sm flex-grow-1">
                  {editandoId ? 'Guardar cambios' : 'Agregar usuario'}
                </button>
                {editandoId && (
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCancelar}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="table-responsive-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Listado de usuarios ({usuariosFiltrados.length})</h5>
              <input
                className="form-control form-control-sm w-auto"
                placeholder="Buscar..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            {cargando ? (
              <p className="text-muted">Cargando...</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Acceso</th>
                      <th>UEN</th>
                      <th>Sitio</th>
                      <th>Rol</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u) => (
                      <tr key={u.id} className={editandoId === u.id ? 'table-primary' : ''}>
                        <td className="fw-medium">{u.nombre}</td>
                        <td>
                          {u.role === 'capturista'
                            ? <span className="text-muted small">nombre + contraseña</span>
                            : (u.employeeId || <span className="text-danger small">sin ID (no puede entrar)</span>)}
                        </td>
                        <td>{u.uen}</td>
                        <td>{u.sitio}</td>
                        <td>
                          <span className={`badge ${u.role === 'capturista' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={() => handleEditar(u)}
                            title="Editar usuario"
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleEliminar(u)}
                            title="Eliminar usuario"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
