import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import EstatusBadge from '../components/EstatusBadge';

export default function UsuarioReporte() {
  const { user } = useAuth();
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await api.get(`/grades/estatus/${user.id}`);
        setReporte(data);
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar tu reporte.');
      }
    }
    cargar();
  }, [user.id]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!reporte) return <p className="text-muted">Cargando tu avance...</p>;

  const totalCursos = reporte.reporte.length;
  const presentados = reporte.reporte.filter((r) => r.estatusCurso !== 'PENDIENTE').length;
  const participacion = totalCursos ? Number(((presentados / totalCursos) * 100).toFixed(1)) : 0;
  const aprobados = reporte.reporte.filter((r) => r.estatusCurso === 'APROBADO').length;

  const dataGrafico = reporte.reporte.map((r) => ({
    curso: r.curso,
    promedio: r.promedio,
    notaAprobatoria: r.notaAprobatoria,
  }));

  return (
    <div>
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card card-kpi h-100">
            <div className="card-body">
              <p className="text-muted mb-1 small">Mi participación</p>
              <p className="kpi-value mb-0 text-primary">{participacion}%</p>
              <p className="small text-muted mb-0">{presentados} de {totalCursos} cursos completos</p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card card-kpi h-100">
            <div className="card-body">
              <p className="text-muted mb-1 small">UEN / Sitio</p>
              <p className="fs-5 fw-semibold mb-0">{reporte.usuario.uen}</p>
              <p className="small text-muted mb-0">{reporte.usuario.sitio}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card card-kpi h-100">
            <div className="card-body">
              <p className="text-muted mb-1 small">Cursos aprobados</p>
              <p className="kpi-value mb-0 text-success">{aprobados}<span className="fs-6 text-muted"> / {totalCursos}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive-card mb-4">
        <h5 className="mb-3">Promedio por curso vs. nota aprobatoria</h5>
        <p className="small text-muted mb-2">
          Los cursos sin promedio aún (faltan exámenes) no se grafican; aparecen como PENDIENTE en la tabla.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="curso" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={80} />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Bar dataKey="promedio" name="Mi promedio" fill="#0d6efd" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="table-responsive-card">
        <h5 className="mb-3">Detalle de calificaciones</h5>
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Nota aprobatoria</th>
                <th>Calificaciones por examen</th>
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
                    <div className="d-flex flex-column gap-1">
                      {r.examenes.map((ex) => (
                        <div key={ex.examen} className="d-flex align-items-center gap-2 fila-captura">
                          <span className="small text-muted">Examen {ex.examen}:</span>
                          <strong>{ex.calificacion ?? 'N/A'}</strong>
                          <EstatusBadge estatus={ex.estatus} />
                        </div>
                      ))}
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
    </div>
  );
}
