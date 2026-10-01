const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { rateLimit } = require('../middleware/security');

const router = express.Router();

const limitarLogin = rateLimit({
  ventanaMs: 60_000,
  max: 10,
  mensaje: 'Demasiados intentos de inicio de sesión. Espera un minuto.',
  clave: (req) => `${req.ip}:${String(req.body?.nombre || req.body?.employeeId || '').toLowerCase()}`,
});

function normaliza(texto) {
  return String(texto ?? '').trim().toLowerCase();
}

function emitirToken(user) {
  const token = jwt.sign(
    { id: user.id, role: user.role, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: '8h' } 
  );
  return {
    token,
    user: { id: user.id, nombre: user.nombre, role: user.role, uen: user.uen, sitio: user.sitio },
  };
}

router.post('/login', limitarLogin, (req, res) => {
  const { employeeId, nombre, password } = req.body || {};
  const db = readDB();

  if (employeeId) {
    const user = db.users.find(
      (u) => u.role === 'usuario' && u.employeeId &&
        normaliza(u.employeeId) === normaliza(employeeId)
    );
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    return res.json(emitirToken(user));
  }

  if (nombre && password) {
    const candidatos = db.users.filter(
      (u) => u.role === 'capturista' && normaliza(u.nombre) === normaliza(nombre)
    );
    for (const u of candidatos) {
      if (u.password && bcrypt.compareSync(password, u.password)) {
        return res.json(emitirToken(u));
      }
    }
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  return res.status(400).json({
    error: 'Indica tu número de empleado, o tu nombre y contraseña si eres capturista.',
  });
});

module.exports = router;
