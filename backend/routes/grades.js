const express = require('express');
const { readDB, withDb, nextId } = require('../db');
const { requireAuth, requireCapturista } = require('../middleware/auth');
const { calcularEstatusCurso } = require('../utils/estatus');

const router = express.Router();

router.get('/', requireAuth, (req, res, next) => {
  try {
    const db = readDB();
    let userId = req.query.userId ? Number(req.query.userId) : null;
    if (!Number.isFinite(userId)) userId = null;

    if (req.user.role !== 'capturista') {
      userId = req.user.id;
    }

    const grades = userId ? db.grades.filter((g) => g.userId === userId) : db.grades;
    res.json(grades);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireCapturista, async (req, res, next) => {
  try {
    const body = req.body || {};
    const userId = Number(body.userId);
    const courseId = Number(body.courseId);
    const examen = Number(body.examen);

    if (body.userId === undefined || body.courseId === undefined || body.examen === undefined) {
      return res.status(400).json({ error: 'userId, courseId y examen son requeridos' });
    }
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'userId debe ser un número entero' });
    }
    if (!Number.isInteger(courseId) || courseId < 1) {
      return res.status(400).json({ error: 'courseId debe ser un número entero' });
    }
    if (!Number.isInteger(examen) || examen < 1) {
      return res.status(400).json({ error: 'examen debe ser un número entero (>= 1)' });
    }

    let calificacion = body.calificacion;
    if (calificacion === undefined) calificacion = null;
    if (calificacion !== null) {
      calificacion = Number(calificacion);
      if (!Number.isFinite(calificacion) || calificacion < 0 || calificacion > 10) {
        return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 10 (o null)' });
      }
    }

    const r = await withDb((db) => {
      const usuarioExiste = db.users.some((u) => u.id === userId);
      const curso = db.courses.find((c) => c.id === courseId);
      if (!usuarioExiste) return { ok: false, status: 404, error: 'Usuario no encontrado' };
      if (!curso) return { ok: false, status: 404, error: 'Curso no encontrado' };
      if (examen > curso.numExamenes) {
        return { ok: false, status: 400, error: `Este curso solo tiene ${curso.numExamenes} examen(es)` };
      }

      const hoy = new Date().toISOString().slice(0, 10);
      let registro = db.grades.find(
        (g) => g.userId === userId && g.courseId === courseId && g.examen === examen
      );

      if (registro) {
        const cambio = registro.calificacion !== calificacion;
        registro.calificacion = calificacion;
        if (cambio) registro.fecha = hoy;
      } else {
        registro = { id: nextId(db.grades), userId, courseId, examen, calificacion, fecha: hoy };
        db.grades.push(registro);
      }
      return { ok: true, registro };
    });

    if (!r.ok) return res.status(r.status).json({ error: r.error });
    res.json(r.registro);
  } catch (e) { next(e); }
});

router.get('/estatus/:userId', requireAuth, (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) return res.status(400).json({ error: 'userId inválido' });
    if (req.user.role !== 'capturista' && req.user.id !== userId) {
      return res.status(403).json({ error: 'No puedes ver las calificaciones de otro usuario' });
    }

    const db = readDB();
    const usuario = db.users.find((u) => u.id === userId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const indice = new Map();
    for (const g of db.grades) {
      indice.set(`${g.userId}:${g.courseId}:${g.examen}`, g.calificacion);
    }

    const reporte = db.courses.map((curso) => {
      const calsPorExamen = [];
      for (let e = 1; e <= curso.numExamenes; e++) {
        const key = `${userId}:${curso.id}:${e}`;
        calsPorExamen.push(indice.has(key) ? indice.get(key) : null);
      }
      const resultado = calcularEstatusCurso(curso, calsPorExamen);
      return {
        cursoId: curso.id,
        curso: curso.nombre,
        notaAprobatoria: curso.notaAprobatoria,
        numExamenes: curso.numExamenes,
        ...resultado,
      };
    });

    res.json({
      usuario: { id: usuario.id, nombre: usuario.nombre, uen: usuario.uen, sitio: usuario.sitio },
      reporte,
    });
  } catch (e) { next(e); }
});

module.exports = router;
