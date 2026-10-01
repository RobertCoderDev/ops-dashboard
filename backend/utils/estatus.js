function esNumeroValido(cal) {
  return typeof cal === 'number' && Number.isFinite(cal);
}

function estatusPorCalificacion(calificacion, notaAprobatoria) {
  if (!esNumeroValido(calificacion)) return 'PENDIENTE';
  if (!esNumeroValido(notaAprobatoria)) return 'PENDIENTE'; // misconfig del curso
  return calificacion >= notaAprobatoria ? 'APROBADO' : 'REPETIR';
}

function calcularEstatusCurso(curso, calificacionesPorExamen) {
  const examenes = calificacionesPorExamen.map((cal, idx) => ({
    examen: idx + 1,
    calificacion: esNumeroValido(cal) ? cal : null,
    estatus: estatusPorCalificacion(cal, curso.notaAprobatoria),
  }));

  const capturadas = calificacionesPorExamen.filter(esNumeroValido);
  const completo = capturadas.length === curso.numExamenes && curso.numExamenes > 0;

  let promedio = null;
  let estatusCurso = 'PENDIENTE';

  if (completo) {
    promedio = Number((capturadas.reduce((a, b) => a + b, 0) / capturadas.length).toFixed(2));
    estatusCurso = estatusPorCalificacion(promedio, curso.notaAprobatoria);
  }

  return { examenes, promedio, estatusCurso, notaAprobatoria: curso.notaAprobatoria };
}

module.exports = { estatusPorCalificacion, calcularEstatusCurso };
