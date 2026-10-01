import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import EstatusBadge from '../components/EstatusBadge';

export default function UsuarioEstatus() {
  const { user } = useAuth();
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await api.get(`/grades/estatus/${user.id}`);
        setReporte(data);
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar tu estatus.');
      }
    }
    cargar();
  }, [user.id]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!reporte) return <p className="text-muted">Cargando...</p>;
  const filas = [];
  reporte.reporte.forEach((r) => {
    r.examenes.forEach((ex) => {
      filas.push(
        <tr key={`${r.cursoId}-${ex.examen}`}>
          <td>{r.curso}</td>
          <td>Examen {ex.examen}{r.examenes.length > 1 ? ` de ${r.examenes.length}` : ''}</td>
          <td>{ex.calificacion ?? 'N/A'}</td>
          <td><EstatusBadge estatus={ex.estatus} /></td>
        </tr>
      );
    });
    if (r.examenes.length > 1) {
      filas.push(
        <tr key={`resumen-${r.cursoId}`} className="table-light">
          <td><strong>{r.curso} - Resultado final (promedio)</strong></td>
          <td>{r.promedio ?? 'N/A'}</td>
          <td>{r.promedio != null ? '—' : 'Faltan exámenes'}</td>
          <td><EstatusBadge estatus={r.estatusCurso} /></td>
        </tr>
      );
    }
  });

  return (
    <div className="table-responsive-card">
      <h5 className="mb-3">Estatus de mis cursos y evaluaciones</h5>
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Curso</th>
              <th>Evaluación</th>
              <th>Nota</th>
              <th>Estatus</th>
            </tr>
          </thead>
          <tbody>{filas}</tbody>
        </table>
      </div>
      <p className="small text-muted mb-0 mt-2">
        APROBADO: calificación mayor o igual a la nota aprobatoria del curso · REPETIR: por debajo de la
        nota aprobatoria · PENDIENTE: calificación aún no capturada (N/A).
      </p>
    </div>
  );
}
