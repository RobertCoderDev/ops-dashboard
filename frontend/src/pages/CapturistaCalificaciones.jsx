import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import EstatusBadge from '../components/EstatusBadge';

export default function CapturistaCalificaciones() {
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [valores, setValores] = useState({}); 
  const [guardando, setGuardando] = useState(null); 

  async function cargarBase() {
    try {
      const [{ data: us }, { data: cs }] = await Promise.all([api.get('/users'), api.get('/courses')]);
      setUsuarios(us.filter((u) => u.role === 'usuario'));
      setCursos(cs);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la lista de usuarios/cursos.');
    }
  }

  useEffect(() => {
    cargarBase();
  }, []);

  async function cargarReporte(id) {
    if (!id) {
      setReporte(null);
      return;
    }
    try {
      const { data } = await api.get(`/grades/estatus/${id}`);
      setReporte(data);
      const nuevosValores = {};
      data.reporte.forEach((r) => {
        r.examenes.forEach((ex) => {
          nuevosValores[`${r.cursoId}-${ex.examen}`] = ex.calificacion ?? '';
        });
      });
      setValores(nuevosValores);
    } catch (err) {
      setReporte(null);
      setError(err.response?.data?.error || 'No se pudo cargar el reporte del usuario.');
    }
  }

  function handleSeleccionUsuario(e) {
    const id = e.target.value;
    setUsuarioId(id);
    setError('');
    setOk('');
    cargarReporte(id);
  }

  function handleValorChange(cursoId, examen, valor) {
    setValores({ ...valores, [`${cursoId}-${examen}`]: valor });
  }

  async function handleGuardar(cursoId, examen) {
    const key = `${cursoId}-${examen}`;
    if (guardando) return; 
    const raw = valores[key];
    const calificacion = raw === '' || raw === null || raw === undefined ? null : Number(raw);

    if (calificacion !== null && (Number.isNaN(calificacion) || calificacion < 0 || calificacion > 10)) {
      setError('La calificación debe ser un número entre 0 y 10 (o vacío para PENDIENTE).');
      return;
    }

    setError('');
    setOk('');
    setGuardando(key);
    try {
      await api.post('/grades', { userId: Number(usuarioId), courseId: cursoId, examen, calificacion });
      setOk('Calificación guardada.');
      cargarReporte(usuarioId);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la calificación');
    } finally {
      setGuardando(null);
    }
  }

  const usuarioSeleccionado = useMemo(
    () => usuarios.find((u) => String(u.id) === String(usuarioId)),
    [usuarios, usuarioId]
  );

  return (
    <div>
      <h3 className="mb-4">Captura de calificaciones</h3>

      <div className="table-responsive-card mb-4">
        <label className="form-label">Selecciona un usuario</label>
        <select className="form-select" value={usuarioId} onChange={handleSeleccionUsuario}>
          <option value="">-- Selecciona --</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}{u.employeeId ? ` (${u.employeeId})` : ' (sin ID)'} - {u.uen} / {u.sitio}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {ok && <div className="alert alert-success py-2">{ok}</div>}

      {reporte && (
        <div className="table-responsive-card">
          <h5 className="mb-3">
            {usuarioSeleccionado?.nombre} - {usuarioSeleccionado?.uen} / {usuarioSeleccionado?.sitio}
          </h5>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Nota aprobatoria</th>
                  <th>Exámenes</th>
                  <th>Promedio</th>
                  <th>Estatus del curso</th>
                </tr>
              </thead>
              <tbody>
                {reporte.reporte.map((r) => (
                  <tr key={r.cursoId}>
                    <td>{r.curso}</td>
                    <td>{r.notaAprobatoria}</td>
                    <td>
                      <div className="d-flex flex-column gap-2">
                        {r.examenes.map((ex) => {
                          const key = `${r.cursoId}-${ex.examen}`;
                          return (
                            <div className="d-flex align-items-center gap-2 fila-captura" key={ex.examen}>
                              <span className="small text-muted" style={{ width: 70 }}>
                                Examen {ex.examen}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step="0.1"
                                className="form-control form-control-sm"
                                style={{ width: 90 }}
                                value={valores[key] ?? ''}
                                onChange={(e) => handleValorChange(r.cursoId, ex.examen, e.target.value)}
                              />
                              <button
                                className="btn btn-sm btn-outline-primary"
                                disabled={guardando === key}
                                onClick={() => handleGuardar(r.cursoId, ex.examen)}
                              >
                                {guardando === key ? 'Guardando…' : 'Guardar'}
                              </button>
                              <EstatusBadge estatus={ex.estatus} />
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td>{r.promedio ?? '-'}</td>
                    <td>
                      <EstatusBadge estatus={r.estatusCurso} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
