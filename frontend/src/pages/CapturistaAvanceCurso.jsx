import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

export default function CapturistaAvanceCurso() {
  const [porCurso, setPorCurso] = useState([]); 
  const [detalle, setDetalle] = useState(null); 
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [cursoId, setCursoId] = useState(null);
  const [examenSel, setExamenSel] = useState(1);
  const [uenExpandida, setUenExpandida] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(({ data }) => { setPorCurso(data.porCurso); })
      .catch(() => setError('No se pudo cargar el avance por curso.'))
      .finally(() => setCargando(false));
  }, []);

  async function cargarDetalle(id) {
    setError('');
    try {
      const { data } = await api.get(`/dashboard/curso/${id}`);
      setDetalle(data);
    } catch (err) {
      setDetalle(null);
      setError(err.response?.data?.error || 'No se pudo cargar el detalle del curso.');
    }
  }

  function seleccionarCurso(id) {
    if (cursoId === id) {
      setCursoId(null);  
      setDetalle(null);
      setUenExpandida(null);
      return;
    }
    setCursoId(id);
    setExamenSel(1);
    setUenExpandida(null);
    cargarDetalle(id);
  }

  if (cargando) return <p className="text-muted">Cargando avance por curso...</p>;

  const cursoActivo = detalle?.curso?.id === cursoId ? detalle : null;
  const examenActivo = cursoActivo?.examenes.find((e) => e.examen === examenSel)
    || cursoActivo?.examenes[0];

  return (
    <div className="table-responsive-card mb-4">
      <h5 className="mb-1">Avance por curso</h5>
      <p className="small text-muted">
        Haz clic en un curso para ver el detalle por evaluación: participación por UEN, por sitio dentro de
        cada UEN, y el Top 5 mejores/menores de cada UEN.
      </p>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-2 mb-2">
        {porCurso.map((c) => (
          <div className="col-sm-6 col-lg-3" key={c.cursoId}>
            <button
              type="button"
              onClick={() => seleccionarCurso(c.cursoId)}
              className={`btn w-100 h-100 text-start p-3 ${cursoId === c.cursoId ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              <div className="fw-semibold text-truncate">{c.curso}</div>
              <div className="fs-4 fw-bold">{c.participacion}%</div>
              <div className={`small ${cursoId === c.cursoId ? 'text-white-50' : 'text-muted'}`}>
                {c.presentadas} de {c.total} evaluaciones
              </div>
            </button>
          </div>
        ))}
      </div>

      {cursoActivo && (
        <div className="border rounded p-3 mt-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h6 className="mb-0">{cursoActivo.curso.nombre}</h6>
            {cursoActivo.examenes.length > 1 && (
              <div className="btn-group btn-group-sm" role="group">
                {cursoActivo.examenes.map((e) => (
                  <button
                    key={e.examen}
                    type="button"
                    className={`btn ${examenSel === e.examen ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => { setExamenSel(e.examen); setUenExpandida(null); }}
                  >
                    Evaluación {e.examen}
                  </button>
                ))}
              </div>
            )}
          </div>

          {examenActivo && (
            <>
              <div className="mb-3">
                <div className="d-flex justify-content-between small text-muted mb-1 flex-wrap gap-1">
                  <span>1. Participación por UEN</span>
                  <span>{examenActivo.presentadas} de {examenActivo.total} en total ({examenActivo.participacion}%)</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={examenActivo.porUen}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="uen" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar
                      dataKey="participacion"
                      name="% Participación"
                      radius={[4, 4, 0, 0]}
                      fill="#6f42c1"
                      onClick={(d) => setUenExpandida(uenExpandida === d.uen ? null : d.uen)}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="small text-muted mb-2">
                2. Detalle por UEN - clic en una UEN para ver sus sitios y el Top 5
              </div>
              <div className="d-flex flex-column gap-2">
                {examenActivo.porUen.map((u) => (
                  <div key={u.uen} className="border rounded">
                    <button
                      type="button"
                      className="btn btn-light w-100 text-start d-flex justify-content-between align-items-center flex-wrap gap-2 p-2"
                      onClick={() => setUenExpandida(uenExpandida === u.uen ? null : u.uen)}
                    >
                      <span className="fw-semibold">{u.uen}</span>
                      <span className="small text-muted">
                        {u.presentadas} de {u.total} ({u.participacion}%) {uenExpandida === u.uen ? '▾' : '▸'}
                      </span>
                    </button>

                    {uenExpandida === u.uen && (
                      <div className="p-3 border-top">
                        <div className="row">
                          <div className="col-lg-6 mb-3 mb-lg-0">
                            <div className="small fw-semibold mb-2">Sitios de {u.uen}</div>
                            {u.porSitio.length === 0 ? (
                              <p className="small text-muted">Sin sitios registrados.</p>
                            ) : (
                              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                <ResponsiveContainer width="100%" height={Math.max(180, u.porSitio.length * 32)}>
                                  <BarChart data={u.porSitio} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" unit="%" domain={[0, 100]} />
                                    <YAxis type="category" dataKey="sitio" tick={{ fontSize: 10 }} width={140} />
                                    <Tooltip formatter={(v) => `${v}%`} />
                                    <Bar dataKey="participacion" name="% Participación" fill="#fd7e14" radius={[0, 4, 4, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>

                          <div className="col-lg-6">
                            <div className="small fw-semibold mb-2">3. Top 5 en {u.uen}</div>
                            <div className="mb-3">
                              <div className="small text-success fw-semibold">🏆 Mejores</div>
                              {u.top5.mejores.length === 0 ? (
                                <p className="small text-muted mb-0">Sin calificaciones capturadas.</p>
                              ) : (
                                <table className="table table-sm mb-0">
                                  <thead>
                                    <tr><th>Persona</th><th className="text-end">Nota</th><th className="text-end">% Apr.</th></tr>
                                  </thead>
                                  <tbody>
                                    {u.top5.mejores.map((f) => (
                                      <tr key={f.userId}>
                                        <td>{f.nombre}</td>
                                        <td className="text-end">{f.calificacion ?? '-'}</td>
                                        <td className="text-end">{f.aprobacion}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                            <div>
                              <div className="small text-danger fw-semibold">📉 Menores</div>
                              {u.top5.peores.length === 0 ? (
                                <p className="small text-muted mb-0">Sin calificaciones capturadas.</p>
                              ) : (
                                <table className="table table-sm mb-0">
                                  <thead>
                                    <tr><th>Persona</th><th className="text-end">Nota</th><th className="text-end">% Apr.</th></tr>
                                  </thead>
                                  <tbody>
                                    {u.top5.peores.map((f) => (
                                      <tr key={f.userId}>
                                        <td>{f.nombre}</td>
                                        <td className="text-end">{f.calificacion ?? '-'}</td>
                                        <td className="text-end">{f.aprobacion}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
