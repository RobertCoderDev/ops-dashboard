const express = require('express');
const bcrypt = require('bcryptjs');
const { readDB, withDb, nextId } = require('../db');
const { requireAuth, requireCapturista } = require('../middleware/auth');

const router = express.Router();

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

router.get('/', requireAuth, requireCapturista, (req, res, next) => {
  try {
    const db = readDB();
    const users = db.users.map(({ password, ...rest }) => rest);
    res.json(users);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireCapturista, async (req, res, next) => {
  try {
    const body = req.body || {};
    const password = typeof body.password === 'string' ? body.password : '';
    const nombre = texto(body.nombre);
    const uen = texto(body.uen);
    const sitio = texto(body.sitio);
    const role = texto(body.role);
    const employeeId = texto(body.employeeId);
    const whatsapp = texto(body.whatsapp);
    const canal = texto(body.canal);

    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!['usuario', 'capturista'].includes(role)) {
      return res.status(400).json({ error: 'role debe ser "usuario" o "capturista"' });
    }
    if (role === 'usuario' && !employeeId) {
      return res.status(400).json({
        error: 'El número de empleado es requerido: es lo único que usan los usuarios para entrar',
      });
    }
    if (role === 'capturista') {
      if (!password) {
        return res.status(400).json({ error: 'La contraseña es requerida para el rol capturista' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }
    }

    const { ok, error, status, usuario } = await withDb((db) => {
      const yaExisteNombre = db.users.some(
        (u) => typeof u.nombre === 'string' &&
          u.nombre.trim().toLowerCase() === nombre.toLowerCase()
      );

      if (role === 'usuario') {
        const empDuplicado = db.users.some(
          (u) => u.employeeId &&
            String(u.employeeId).trim().toLowerCase() === employeeId.toLowerCase()
        );
        if (empDuplicado) {
          return { ok: false, status: 409, error: 'Ya existe un usuario con ese número de empleado' };
        }
      }

      const nuevo = {
        id: nextId(db.users),
        nombre,
        uen: uen || '-',
        sitio: sitio || '-',
        role,
        employeeId: role === 'usuario' ? employeeId : null,
        whatsapp: whatsapp || null,
        canal: canal || null,
      };
      if (role === 'capturista') {
        nuevo.password = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      }

      db.users.push(nuevo);
      const { password: _pw, ...sinPassword } = nuevo;
      return { ok: true, usuario: { ...sinPassword, avisoNombreDuplicado: yaExisteNombre } };
    });

    if (!ok) return res.status(status || 400).json({ error });
    res.status(201).json(usuario);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireCapturista, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const r = await withDb((db) => {
      const existe = db.users.some((u) => u.id === id);
      if (!existe) return { ok: false, status: 404, error: 'Usuario no encontrado' };
      if (id === req.user.id) {
        return { ok: false, status: 400, error: 'No puedes eliminar tu propio usuario mientras tienes sesión activa' };
      }
      db.users = db.users.filter((u) => u.id !== id);
      db.grades = db.grades.filter((g) => g.userId !== id);
      return { ok: true };
    });

    if (!r.ok) return res.status(r.status).json({ error: r.error });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
