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
      <div className="mb-3">
        <h3 className="mb-1">Gestión de usuarios</h3>
        <p className="small text-muted mb-0">
          Los <strong>usuarios</strong> acceden con su número de empleado. Los <strong>capturistas</strong> con usuario y contraseña.
        </p>
      </div>

      <div className="row g-3">
        {/* Formulario Lateral */}
        <div className="col-xxl-3 col-xl-4 col-lg-4">
          <div className="table-responsive-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0 fs-6 fw-bold">
                {editandoId ? 'Editar usuario' : 'Agregar usuario'}
              </h5>
              {editandoId && (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 small">
                  ID #{editandoId}
                </span>
              )}
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            {ok && <div className="alert alert-success py-2 small">{ok}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label className="form-label small mb-1 text-secondary fw-semibold">Rol</label>
                <select className="form-select form-select-sm" name="role" value={form.role} onChange={handleChange}>
                  <option value="usuario">Usuario</option>
                  <option value="capturista">Capturista</option>
                </select>
              </div>

              <div className="mb-2">
                <label className="form-label small mb-1 text-secondary fw-semibold">Nombre completo</label>
                <input
                  className="form-control form-control-sm"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Nombre y apellidos"
                  required
                />
              </div>

              {form.role === 'usuario' ? (
                <div className="mb-2">
                  <label className="form-label small mb-1 text-secondary fw-semibold">Número de empleado</label>
                  <input
                    className="form-control form-control-sm"
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleChange}
                    placeholder="ej. 10456"
                    required
                  />
                  <div className="form-text" style={{ fontSize: '0.72rem' }}>Identificador para iniciar sesión.</div>
                </div>
              ) : (
                <div className="mb-2">
                  <label className="form-label small mb-1 text-secondary fw-semibold">
                    {editandoId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-sm"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={editandoId ? 'En blanco = mantener actual' : 'Mínimo 6 caracteres'}
                    required={!editandoId}
                  />
                  {editandoId && (
                    <div className="form-text" style={{ fontSize: '0.72rem' }}>Deja en blanco para conservar la actual.</div>
                  )}
                </div>
              )}

              <div className="mb-2">
                <label className="form-label small mb-1 text-secondary fw-semibold">UEN</label>
                <input className="form-control form-control-sm" name="uen" value={form.uen} onChange={handleChange} placeholder="ej. Comercial" />
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1 text-secondary fw-semibold">Sitio</label>
                <input className="form-control form-control-sm" name="sitio" value={form.sitio} onChange={handleChange} placeholder="ej. CDMX" />
              </div>

              <div className="d-flex gap-2 pt-1">
                <button className="btn btn-primary btn-sm flex-grow-1">
                  {editandoId ? 'Guardar cambios' : 'Agregar usuario'}
                </button>
                {editandoId && (
                  <button type="button" className="btn btn-outline-secondary btn-sm px-3" onClick={handleCancelar}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="col-xxl-9 col-xl-8 col-lg-8">
          <div className="table-responsive-card">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 className="mb-0 fs-6 fw-bold">
                Usuarios <span className="badge bg-light text-dark border ms-1">{usuariosFiltrados.length}</span>
              </h5>
              <input
                className="form-control form-control-sm"
                style={{ width: '100%', maxWidth: '240px' }}
                placeholder="Buscar por nombre, ID..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            {cargando ? (
              <p className="text-muted py-3">Cargando...</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '32%' }}>Nombre</th>
                      <th style={{ width: '14%' }}>Acceso</th>
                      <th style={{ width: '14%' }}>UEN</th>
                      <th style={{ width: '14%' }}>Sitio</th>
                      <th style={{ width: '10%' }}>Rol</th>
                      <th className="text-end" style={{ width: '16%' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u) => {
                      const esSeleccionado = editandoId === u.id;
                      return (
                        <tr
                          key={u.id}
                          className={esSeleccionado ? 'table-active' : ''}
                          style={esSeleccionado ? { backgroundColor: '#eef4ff' } : {}}
                        >
                          <td className="fw-medium text-dark py-2 align-middle">
                            {u.nombre}
                          </td>
                          <td className="py-2 align-middle">
                            {u.role === 'capturista' ? (
                              <span className="badge bg-light text-secondary border">clave</span>
                            ) : (
                              u.employeeId ? (
                                <code className="text-primary fw-semibold">{u.employeeId}</code>
                              ) : (
                                <span className="text-danger small">sin ID</span>
                              )
                            )}
                          </td>
                          <td className="py-2 text-muted small align-middle">{u.uen}</td>
                          <td className="py-2 text-muted small align-middle">{u.sitio}</td>
                          <td className="py-2 align-middle">
                            <span className={`badge ${u.role === 'capturista' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="text-end text-nowrap py-2 align-middle">
                            <div className="d-inline-flex gap-1 justify-content-end">
                              <button
                                className={`btn btn-sm py-0 px-2 ${esSeleccionado ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleEditar(u)}
                                title="Editar usuario"
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm py-0 px-2"
                                onClick={() => handleEliminar(u)}
                                title="Eliminar usuario"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
