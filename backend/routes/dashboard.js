const express = require('express');
const { readDB } = require('../db');
const { requireAuth, requireCapturista } = require('../middleware/auth');
const { estatusPorCalificacion } = require('../utils/estatus');

const router = express.Router();

function construirMatrizEvaluaciones(db) {
  const usuarios = db.users.filter((u) => u.role === 'usuario');
  const filas = [];

  const indice = new Map();
  for (const g of db.grades) {
    indice.set(`${g.userId}:${g.courseId}:${g.examen}`, g.calificacion);
  }

  usuarios.forEach((u) => {
    db.courses.forEach((c) => {
      for (let examen = 1; examen <= c.numExamenes; examen++) {
        const key = `${u.id}:${c.id}:${examen}`;
        const calificacion = indice.has(key) ? indice.get(key) : null;
        filas.push({
          userId: u.id,
          nombre: u.nombre,
          uen: u.uen,
          sitio: u.sitio,
          courseId: c.id,
          curso: c.nombre,
          examen,
          calificacion,
          estatus: estatusPorCalificacion(calificacion, c.notaAprobatoria),
        });
      }
    });
  });

  return filas;
}

function resumenDe(filas) {
  const total = filas.length;
  const aprobadas = filas.filter((f) => f.estatus === 'APROBADO').length;
  const repetir = filas.filter((f) => f.estatus === 'REPETIR').length;
  const pendientes = filas.filter((f) => f.estatus === 'PENDIENTE').length;
  const presentadas = total - pendientes;

  const participacion = total ? Number(((presentadas / total) * 100).toFixed(1)) : 0;
  const aprobacion = total ? Number(((aprobadas / total) * 100).toFixed(1)) : 0;

  return {
    total,
    aprobadas,
    repetir,
    pendientes,
    presentadas,
    participacion,
    aprobacion,
    cumplimiento: aprobacion, 
  };
}

function agruparPor(filas, campo) {
  const grupos = {};
  filas.forEach((f) => {
    const key = f[campo];
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(f);
  });
  return Object.entries(grupos).map(([key, subFilas]) => ({
    [campo]: key,
    ...resumenDe(subFilas),
  }));
}

router.get('/summary', requireAuth, requireCapturista, (req, res, next) => {
  try {
    const db = readDB();
    const filas = construirMatrizEvaluaciones(db);

    const total = resumenDe(filas);
    const porCurso = db.courses.map((c) => {
      const subFilas = filas.filter((f) => f.courseId === c.id);
      return { cursoId: c.id, curso: c.nombre, notaAprobatoria: c.notaAprobatoria, ...resumenDe(subFilas) };
    });

    res.json({ total, porCurso });
  } catch (e) { next(e); }
});

router.get('/uen', requireAuth, requireCapturista, (req, res, next) => {
  try {
    res.json(agruparPor(construirMatrizEvaluaciones(readDB()), 'uen'));
  } catch (e) { next(e); }
});

router.get('/sitio', requireAuth, requireCapturista, (req, res, next) => {
  try {
    res.json(agruparPor(construirMatrizEvaluaciones(readDB()), 'sitio'));
  } catch (e) { next(e); }
});

function ordenarRanking(lista) {
  return [...lista].sort((a, b) => {
    if ((b.aprobacion ?? 0) !== (a.aprobacion ?? 0)) return (b.aprobacion ?? 0) - (a.aprobacion ?? 0);
    if ((b.promedio ?? -1) !== (a.promedio ?? -1)) return (b.promedio ?? -1) - (a.promedio ?? -1);
    return (b.participacion ?? 0) - (a.participacion ?? 0);
  });
}

router.get('/top5', requireAuth, requireCapturista, (req, res, next) => {
  try {
    const db = readDB();
    const filas = construirMatrizEvaluaciones(db);

    const porUsuario = {};
    filas.forEach((f) => {
      if (!porUsuario[f.userId]) {
        porUsuario[f.userId] = { userId: f.userId, nombre: f.nombre, uen: f.uen, sitio: f.sitio, filas: [] };
      }
      porUsuario[f.userId].filas.push(f);
    });

    const ranking = Object.values(porUsuario).map((u) => {
      const resumen = resumenDe(u.filas);
      const capturadas = u.filas.filter((f) => typeof f.calificacion === 'number');
      const promedio = capturadas.length
        ? Number((capturadas.reduce((a, b) => a + b.calificacion, 0) / capturadas.length).toFixed(2))
        : null;
      return {
        userId: u.userId,
        nombre: u.nombre,
        uen: u.uen,
        sitio: u.sitio,
        aprobacion: resumen.aprobacion,
        participacion: resumen.participacion,
        cumplimiento: resumen.aprobacion,
        promedio,
      };
    });

    const ordenado = ordenarRanking(ranking);
    const mejores = ordenado.slice(0, 5);
    const peores = [...ordenado]
      .sort((a, b) => {
        if (a.promedio === null && b.promedio === null) return b.aprobacion - a.aprobacion;
        if (a.promedio === null) return 1;
        if (b.promedio === null) return -1;
        return a.aprobacion - b.aprobacion || (a.promedio ?? 0) - (b.promedio ?? 0);
      })
      .slice(0, 5);

    res.json({ mejores, peores });
  } catch (e) { next(e); }
});

router.get('/curso/:id', requireAuth, requireCapturista, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id de curso inválido' });

    const db = readDB();
    const curso = db.courses.find((c) => c.id === id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const usuarios = db.users.filter((u) => u.role === 'usuario');
    const califPorClave = new Map();
    for (const g of db.grades) {
      if (g.courseId === id) califPorClave.set(`${g.userId}:${g.examen}`, g.calificacion);
    }

    const examenes = [];
    for (let examen = 1; examen <= curso.numExamenes; examen++) {
      const filas = usuarios.map((u) => {
        const key = `${u.id}:${examen}`;
        return {
          userId: u.id,
          nombre: u.nombre,
          uen: u.uen,
          sitio: u.sitio,
          calificacion: califPorClave.has(key) ? califPorClave.get(key) : null,
        };
      });

      const uensUnicas = [...new Set(usuarios.map((u) => u.uen))].sort();

      const porUen = uensUnicas.map((uen) => {
        const filasUen = filas.filter((f) => f.uen === uen);
        const sitiosMap = new Map();
        for (const f of filasUen) {
          if (!sitiosMap.has(f.sitio)) sitiosMap.set(f.sitio, []);
          sitiosMap.get(f.sitio).push(f);
        }
        const porSitio = [...sitiosMap.entries()]
          .map(([sitio, sub]) => ({ sitio, ...resumenParticipacion(sub) }))
          .sort((a, b) => a.sitio.localeCompare(b.sitio));

        const resumen = resumenParticipacion(filasUen);
        const top5 = top5De(filasUen, curso.notaAprobatoria);
        return { uen, ...resumen, porSitio, top5 };
      });

      examenes.push({ examen, ...resumenParticipacion(filas), porUen });
    }

    res.json({ curso, examenes });
  } catch (e) { next(e); }
});

function resumenParticipacion(filas) {
  const total = filas.length;
  const presentadas = filas.filter((f) => typeof f.calificacion === 'number').length;
  return {
    total,
    presentadas,
    participacion: total ? Number(((presentadas / total) * 100).toFixed(1)) : 0,
  };
}

function top5De(filas, notaAprobatoria) {
  const agrupado = new Map();
  for (const f of filas) {
    if (!agrupado.has(f.userId)) agrupado.set(f.userId, []);
    agrupado.get(f.userId).push(f.calificacion);
  }

  const ranking = [...agrupado.entries()].map(([userId, cals]) => {
    const filasU = filas.filter((f) => f.userId === userId);
    const capturadas = cals.filter((c) => typeof c === 'number');
    const aprobadas = capturadas.filter((c) => c >= notaAprobatoria).length;
    const esperadas = cals.length;
    return {
      userId,
      nombre: filasU[0]?.nombre,
      calificacion: capturadas.length ? capturadas[capturadas.length - 1] : null,
      aprobacion: esperadas ? Number(((aprobadas / esperadas) * 100).toFixed(1)) : 0,
      participacion: esperadas ? Number(((capturadas.length / esperadas) * 100).toFixed(1)) : 0,
      promedio: capturadas.length
        ? Number((capturadas.reduce((a, b) => a + b, 0) / capturadas.length).toFixed(2))
        : null,
    };
  });

  const ordenado = ordenarRanking(ranking);
  return {
    mejores: ordenado.slice(0, 5),
    peores: [...ordenado].reverse().filter((r) => r.promedio !== null).slice(0, 5),
  };
}

module.exports = router;
