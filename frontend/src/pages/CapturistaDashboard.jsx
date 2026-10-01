import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../api';
import CapturistaAvanceCurso from './CapturistaAvanceCurso';

function TarjetaKPI({ titulo, valor, subtitulo, color }) {
  return (
    <div className="col-md-4 mb-3">
      <div className="card card-kpi h-100">
        <div className="card-body">
          <p className="text-muted mb-1 small">{titulo}</p>
          <p className="kpi-value mb-0" style={{ color }}>{valor}</p>
          {subtitulo && <p className="small text-muted mb-0">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );
}

export default function CapturistaDashboard() {
  const [summary, setSummary] = useState(null);
  const [porUen, setPorUen] = useState([]);
  const [porSitio, setPorSitio] = useState([]);
  const [top5, setTop5] = useState({ mejores: [], peores: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const [{ data: s }, { data: uen }, { data: sitio }, { data: t5 }] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/uen'),
          api.get('/dashboard/sitio'),
          api.get('/dashboard/top5'),
        ]);
        setSummary(s);
        setPorUen(uen);
        setPorSitio(sitio);
        setTop5(t5);
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar el dashboard. Reintenta.');
      }
    }
    cargar();
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!summary) return <p className="text-muted">Cargando dashboard...</p>;

  return (
    <div>
      <h3 className="mb-4">Dashboard general</h3>

      <div className="row">
        <TarjetaKPI
          titulo="% Participación total"
          valor={`${summary.total.participacion}%`}
          subtitulo={`${summary.total.presentadas} de ${summary.total.total} evaluaciones presentadas`}
          color="#6f42c1"
        />
        <TarjetaKPI
          titulo="% Aprobación total"
          valor={`${summary.total.aprobacion}%`}
          subtitulo={`${summary.total.aprobadas} evaluaciones aprobadas`}
          color="#198754"
        />
        <TarjetaKPI titulo="A repetir" valor={summary.total.repetir} color="#dc3545" />
        <TarjetaKPI titulo="Pendientes" valor={summary.total.pendientes} color="#6c757d" />
      </div>
      <p className="small text-muted mb-4">
        <strong>% Participación</strong>: evaluaciones que ya se presentaron (tienen calificación
        capturada, sin importar el resultado) ÷ evaluaciones totales esperadas.
        &nbsp;·&nbsp;
        <strong>% Aprobación</strong>: evaluaciones aprobadas ÷ total esperado.
      </p>

      <CapturistaAvanceCurso />

      <div className="row mt-2">
        <div className="col-lg-6 mb-4">
          <div className="table-responsive-card">
            <h5 className="mb-3">Participación por UEN (global, todos los cursos)</h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porUen}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="uen" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Bar dataKey="participacion" name="% Participación" fill="#20c997" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="table-responsive-card">
            <h5 className="mb-3">Participación por sitio (global, todos los cursos)</h5>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <ResponsiveContainer width="100%" height={Math.max(280, porSitio.length * 32)}>
                <BarChart data={porSitio} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="sitio" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="participacion" name="% Participación" fill="#fd7e14" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="table-responsive-card">
            <h5 className="mb-3">🏆 Top 5 mejores usuarios (global)</h5>
            <table className="table table-sm mb-0">
              <thead>
                <tr><th>Usuario</th><th>UEN</th><th>% Aprob.</th><th>% Part.</th><th>Promedio</th></tr>
              </thead>
              <tbody>
                {top5.mejores.map((u) => (
                  <tr key={u.userId}>
                    <td>{u.nombre}</td>
                    <td>{u.uen}</td>
                    <td>{u.aprobacion}%</td>
                    <td>{u.participacion}%</td>
                    <td>{u.promedio ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-lg-6 mb-4">
          <div className="table-responsive-card">
            <h5 className="mb-3">📉 Top 5 usuarios con menor avance (global)</h5>
            <table className="table table-sm mb-0">
              <thead>
                <tr><th>Usuario</th><th>UEN</th><th>% Aprob.</th><th>% Part.</th><th>Promedio</th></tr>
              </thead>
              <tbody>
                {top5.peores.map((u) => (
                  <tr key={u.userId}>
                    <td>{u.nombre}</td>
                    <td>{u.uen}</td>
                    <td>{u.aprobacion}%</td>
                    <td>{u.participacion}%</td>
                    <td>{u.promedio ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
