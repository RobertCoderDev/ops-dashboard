const express = require('express');
const { readDB, withDb, nextId } = require('../db');
const { requireAuth, requireCapturista } = require('../middleware/auth');

const router = express.Router();

function validarCurso({ nombre, numExamenes, notaAprobatoria }) {
  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) {
      return 'El nombre del curso no puede estar vacío';
    }
  }
  if (numExamenes !== undefined) {
    const n = Number(numExamenes);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return 'numExamenes debe ser un entero entre 1 y 5';
    }
  }
  if (notaAprobatoria !== undefined) {
    const n = Number(notaAprobatoria);
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      return 'notaAprobatoria debe ser un número entre 0 y 10';
    }
  }
  return null;
}

router.get('/', requireAuth, (req, res, next) => {
  try {
    res.json(readDB().courses);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireCapturista, async (req, res, next) => {
  try {
    const body = req.body || {};
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    const numExamenes = body.numExamenes !== undefined ? Number(body.numExamenes) : undefined;
    const notaAprobatoria = body.notaAprobatoria !== undefined ? Number(body.notaAprobatoria) : undefined;

    if (!nombre) return res.status(400).json({ error: 'El nombre del curso es requerido' });
    const errorValidacion = validarCurso({ nombre, numExamenes, notaAprobatoria });
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const { curso } = await withDb((db) => {
      const esPrimerCurso = db.courses.length === 0;
      const nuevo = {
        id: nextId(db.courses),
        nombre,
        numExamenes: numExamenes ?? (esPrimerCurso ? 1 : 2),
        notaAprobatoria: notaAprobatoria ?? (esPrimerCurso ? 7 : 8),
      };
      db.courses.push(nuevo);
      return { curso: nuevo };
    });

    res.status(201).json(curso);
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, requireCapturista, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const body = req.body || {};
    const cambios = {};
    if (body.nombre !== undefined) cambios.nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (body.numExamenes !== undefined) cambios.numExamenes = Number(body.numExamenes);
    if (body.notaAprobatoria !== undefined) cambios.notaAprobatoria = Number(body.notaAprobatoria);

    const errorValidacion = validarCurso(cambios);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const fuerza = req.query.force === 'true';

    const r = await withDb((db) => {
      const curso = db.courses.find((c) => c.id === id);
      if (!curso) return { ok: false, status: 404, error: 'Curso no encontrado' };

      const reduceExamenes = cambios.numExamenes !== undefined &&
        cambios.numExamenes < curso.numExamenes;
      let huerfanas = 0;
      if (reduceExamenes) {
        huerfanas = db.grades.filter(
          (g) => g.courseId === id && g.examen > cambios.numExamenes
        ).length;
        if (huerfanas > 0 && !fuerza) {
          return {
            ok: false, status: 409,
            error: `El curso tiene ${huerfanas} calificación(es) del examen ${cambios.numExamenes + 1} en adelante. ` +
              'Repite la petición con ?force=true para eliminarlas junto con el cambio.',
            huerfanas,
          };
        }
      }

      Object.assign(curso, cambios);
      if (reduceExamenes && huerfanas > 0) {
        db.grades = db.grades.filter(
          (g) => !(g.courseId === id && g.examen > cambios.numExamenes)
        );
      }
      return { ok: true, curso, huerfanasBorradas: huerfanas };
    });

    if (!r.ok) return res.status(r.status).json({ error: r.error, ...(r.huerfanas ? { calificacionesHuerfanas: r.huerfanas } : {}) });
    res.json(r.curso);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireCapturista, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const r = await withDb((db) => {
      const existe = db.courses.some((c) => c.id === id);
      if (!existe) return { ok: false, status: 404, error: 'Curso no encontrado' };
      db.courses = db.courses.filter((c) => c.id !== id);
      db.grades = db.grades.filter((g) => g.courseId !== id);
      return { ok: true };
    });

    if (!r.ok) return res.status(r.status).json({ error: r.error });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
