import React, { useEffect, useState } from 'react';
import api from '../api';

export default function CapturistaCursos() {
  const [cursos, setCursos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [numExamenes, setNumExamenes] = useState(2);
  const [notaAprobatoria, setNotaAprobatoria] = useState(8);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get('/courses');
      setCursos(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los cursos.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleCrear(e) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api.post('/courses', {
        nombre: nombre.trim(),
        numExamenes: Number(numExamenes),
        notaAprobatoria: Number(notaAprobatoria),
      });
      setOk(`Curso "${nombre}" creado.`);
      setNombre('');
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el curso');
    }
  }

  async function actualizarCampo(curso, campo, valorBruto, min, max) {
    const esNumero = campo !== 'nombre';
    const valor = esNumero ? Number(valorBruto) : String(valorBruto).trim();

    if (esNumero && (valorBruto === '' || Number.isNaN(valor))) {
      setError(`El campo debe ser un número (entre ${min} y ${max}).`);
      cargar();
      return;
    }
    if (esNumero && (valor < min || valor > max)) {
      setError(`El valor debe estar entre ${min} y ${max}.`);
      cargar();
      return;
    }
    if (!esNumero && !valor) {
      setError('El nombre del curso no puede estar vacío.');
      cargar();
      return;
    }

    setError('');
    try {
      await api.put(`/courses/${curso.id}`, { [campo]: valor });
      cargar();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'Error al actualizar el curso';
      if (status === 409) {
        if (window.confirm(msg)) {
          try {
            await api.put(`/courses/${curso.id}?force=true`, { [campo]: valor });
            setOk('Curso actualizado y calificaciones de exámenes eliminadas.');
            cargar();
          } catch (err2) {
            setError(err2.response?.data?.error || 'Error al actualizar el curso');
          }
        } else {
          cargar();
        }
        return;
      }
      setError(msg);
      cargar();
    }
  }

  async function handleEliminar(curso) {
    if (!confirm(`¿Eliminar el curso "${curso.nombre}"? Se borrarán también sus calificaciones.`)) return;
    setError('');
    setOk('');
    try {
      await api.delete(`/courses/${curso.id}`);
      setOk(`Curso "${curso.nombre}" eliminado.`);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el curso');
    }
  }

  return (
    <div>
      <h3 className="mb-4">Gestión de cursos</h3>

      <div className="row">
        <div className="col-lg-4 mb-4">
          <div className="table-responsive-card">
            <h5 className="mb-3">Nuevo curso</h5>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            {ok && <div className="alert alert-success py-2">{ok}</div>}
            <form onSubmit={handleCrear}>
              <div className="mb-2">
                <label className="form-label small mb-1">Nombre del curso</label>
                <input className="form-control form-control-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="mb-2">
                <label className="form-label small mb-1">Número de exámenes</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="form-control form-control-sm"
                  value={numExamenes}
                  onChange={(e) => setNumExamenes(e.target.value)}
                />
                <div className="form-text">El curso 1 suele tener 1 examen; a partir del 2.º curso, 2 exámenes.</div>
              </div>
              <div className="mb-3">
                <label className="form-label small mb-1">Nota aprobatoria</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step="0.5"
                  className="form-control form-control-sm"
                  value={notaAprobatoria}
                  onChange={(e) => setNotaAprobatoria(e.target.value)}
                />
                <div className="form-text">Política vigente: cursos nuevos nacen con nota aprobatoria 8.</div>
              </div>
              <button className="btn btn-primary btn-sm w-100">Crear curso</button>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="table-responsive-card">
            <h5 className="mb-3">Cursos existentes</h5>
            {cargando ? (
              <p className="text-muted">Cargando...</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th style={{ width: 140 }}># Exámenes</th>
                      <th style={{ width: 160 }}>Nota aprobatoria</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            defaultValue={c.nombre}
                            onBlur={(e) => actualizarCampo(c, 'nombre', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            className="form-control form-control-sm"
                            defaultValue={c.numExamenes}
                            onBlur={(e) => actualizarCampo(c, 'numExamenes', e.target.value, 1, 5)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step="0.5"
                            className="form-control form-control-sm"
                            defaultValue={c.notaAprobatoria}
                            onBlur={(e) => actualizarCampo(c, 'notaAprobatoria', e.target.value, 0, 10)}
                          />
                        </td>
                        <td className="text-end">
                          <button className="btn btn-outline-danger btn-sm" onClick={() => handleEliminar(c)}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small text-muted mb-0">
              Tip: haz clic fuera del campo (blur) para guardar los cambios. Si redujo el número de
              exámenes con calificaciones capturadas, se te pedirá confirmación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
