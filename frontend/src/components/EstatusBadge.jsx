import React from 'react';

const CONFIG = {
  APROBADO: { clase: 'badge-aprobado', texto: 'APROBADO' },
  REPETIR: { clase: 'badge-repetir', texto: 'REPETIR' },
  PENDIENTE: { clase: 'badge-pendiente', texto: 'PENDIENTE' },
};

export default function EstatusBadge({ estatus }) {
  const cfg = CONFIG[estatus] || CONFIG.PENDIENTE;
  return <span className={`badge ${cfg.clase}`}>{cfg.texto}</span>;
}
