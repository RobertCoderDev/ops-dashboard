import React, { useEffect, useState, useRef } from 'react';
import api from '../api';


function normaliza(t) {
  return String(t ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default function CapturistaImportar() {
  const [cursos, setCursos] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [curso, setCurso] = useState('');
  const [nota, setNota] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCursos(data))
      .catch(() => setError('No se pudieron cargar los cursos.'));
  }, []);

  const cursoExistente = cursos.find((c) => normaliza(c.nombre) === normaliza(curso));

  async function importar(dryRunElegido) {
    setError('');
    setResultado(null);

    if (!archivo) {
      setError('Selecciona un archivo Excel (.xlsx) primero.');
      return;
    }
    if (!curso.trim()) {
      setError('Indica a qué curso pertenece este archivo.');
      return;
    }
    if (archivo.size > 15 * 1024 * 1024) {
      setError('El archivo supera los 15 MB permitidos.');
      return;
    }

    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('curso', curso.trim());
    if (nota) formData.append('nota', nota);
    formData.append('dryRun', dryRunElegido ? 'true' : 'false');

    setCargando(true);
    try {
      const { data } = await api.post('/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(data);
      if (!dryRunElegido) {
        const { data: cs } = await api.get('/courses');
        setCursos(cs);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al importar el archivo.');
    } finally {
      setCargando(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    importar(dryRun);
  }

  function confirmarYGuardar() {
    setDryRun(false);
    if (!cargando) importar(false);
  }

  return (
    <div>
      <h3 className="mb-4">Importar Excel</h3>
      <p className="text-muted">
        Sube el reporte de Excel (con columnas UEN, Sitio, Evaluación 1, Evaluación 2, etc.) para crear o
        actualizar usuarios y calificaciones. Es seguro volver a subir una versión más reciente del mismo
        archivo cuantas veces sea necesario: no se duplican personas ni calificaciones.
      </p>

      <div className="row">
        <div className="col-lg-5 mb-4">
          <div className="table-responsive-card">
            <form ref={formRef} onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Archivo Excel (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="form-control"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Curso / módulo al que pertenece</label>
                <input
                  className="form-control"
                  list="lista-cursos"
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  placeholder='ej. "Módulo 1 - COSS360"'
                  required
                />
                <datalist id="lista-cursos">
                  {cursos.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
                {cursoExistente ? (
                  <div className="form-text">
                    Curso existente: nota aprobatoria {cursoExistente.notaAprobatoria}, {cursoExistente.numExamenes} examen(es).
                  </div>
                ) : curso.trim() ? (
                  <div className="form-text">
                    Es un curso nuevo, se creará automáticamente al importar.
                  </div>
                ) : null}
              </div>

              {!cursoExistente && (
                <div className="mb-3">
                  <label className="form-label small mb-1">Nota aprobatoria (solo si el curso es nuevo)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step="0.5"
                    className="form-control form-control-sm"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Por defecto: 7 si es el primer curso, 8 en los siguientes"
                  />
                </div>
              )}

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="dryRunCheck"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="dryRunCheck">
                  Solo simular (no guardar todavía)
                </label>
              </div>

              {error && <div className="alert alert-danger py-2">{error}</div>}

              <button className="btn btn-primary w-100" disabled={cargando}>
                {cargando ? 'Procesando...' : dryRun ? 'Simular importación' : 'Importar y guardar'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-7 mb-4">
          {!resultado && !error && (
            <div className="table-responsive-card text-muted">
              El resultado de la importación aparecerá aquí.
            </div>
          )}

          {resultado && (
            <div className="table-responsive-card">
              <div className={`alert ${resultado.dryRun ? 'alert-info' : 'alert-success'}`}>
                {resultado.dryRun
                  ? '🔎 Esto fue una simulación: nada se guardó todavía.'
                  : '✅ Los cambios se guardaron correctamente.'}
                {resultado.backup && (
                  <div className="small mt-1">Respaldo previo: {resultado.backup}</div>
                )}
              </div>

              <table className="table table-sm">
                <tbody>
                  <tr><th>Hoja usada</th><td>{resultado.hojaUsada}</td></tr>
                  <tr><th>Hojas ignoradas</th><td>{resultado.hojasIgnoradas?.join(', ') || '-'}</td></tr>
                  <tr><th>Exámenes detectados</th><td>{resultado.examenesDetectados?.join(', ')}</td></tr>
                  <tr><th>Filas encontradas</th><td>{resultado.filasEncontradas}</td></tr>
                  <tr>
                    <th>Curso</th>
                    <td>
                      {resultado.curso?.nombre}{' '}
                      {resultado.cursoCreado && <span className="badge bg-info text-dark">nuevo</span>}
                      {resultado.examenesAmpliados && <span className="badge bg-warning text-dark">exámenes ampliados</span>}
                      <div className="small text-muted">
                        Nota aprobatoria {resultado.curso?.notaAprobatoria}, {resultado.curso?.numExamenes} examen(es)
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="row text-center g-2 mb-3">
                <div className="col-4"><div className="border rounded p-2"><div className="fs-4 fw-bold text-success">{resultado.resumen.usuariosNuevos}</div><div className="small text-muted">Usuarios nuevos</div></div></div>
                <div className="col-4"><div className="border rounded p-2"><div className="fs-4 fw-bold text-primary">{resultado.resumen.usuariosActualizados}</div><div className="small text-muted">Actualizados</div></div></div>
                <div className="col-4"><div className="border rounded p-2"><div className="fs-4 fw-bold text-muted">{resultado.resumen.usuariosSinCambios}</div><div className="small text-muted">Sin cambios</div></div></div>
                <div className="col-4"><div className="border rounded p-2"><div className="fs-4 fw-bold text-success">{resultado.resumen.calificacionesNuevas}</div><div className="small text-muted">Calif. nuevas</div></div></div>
                <div className="col-4"><div className="border rounded p-2"><div className="fs-4 fw-bold text-primary">{resultado.resumen.calificacionesActualizadas}</div><div className="small text-muted">Calif. actualizadas</div></div></div>
                <div className="col-4"><div className="border rounded p-2"><div className="fs-4 fw-bold text-secondary">{resultado.resumen.calificacionesPendientes}</div><div className="small text-muted">Pendientes (N/A)</div></div></div>
              </div>

              {resultado.resumen.calificacionesInvalidas > 0 && (
                <div className="alert alert-warning py-2">
                  ⚠️ {resultado.resumen.calificacionesInvalidas} calificación(es) fuera de 0-10 fueron
                  ignoradas (quedan PENDIENTE). Revisa el Excel.
                </div>
              )}

              {resultado.resumen.usuariosSinEmployeeId > 0 && (
                <div className="alert alert-danger py-2">
                  ⚠️ {resultado.resumen.usuariosSinEmployeeId} persona(s) sin ID de empleado: no podrán iniciar
                  sesión hasta que se les asigne uno (ver avisos abajo).
                </div>
              )}

              {resultado.avisos?.length > 0 && (
                <div className="alert alert-warning py-2 mb-0">
                  <strong>Avisos ({resultado.avisos.length}):</strong>
                  <ul className="mb-0 small">
                    {resultado.avisos.slice(0, 15).map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                  {resultado.avisos.length > 15 && <div className="small">...y {resultado.avisos.length - 15} más.</div>}
                </div>
              )}

              {resultado.dryRun && (
                <button
                  className="btn btn-success w-100 mt-3"
                  disabled={cargando}
                  onClick={confirmarYGuardar}
                >
                  {cargando ? 'Guardando...' : 'Se ve bien, guardar cambios ahora'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
