const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { DB_PATH } = require('../db');
const dbPath = DB_PATH;

if (fs.existsSync(dbPath)) {
  const { crearRespaldo } = require('./backups');
  const backupPath = crearRespaldo();
  if (backupPath) console.log(`Se hizo un respaldo del db.json anterior en: ${backupPath}`);
}

const salt = bcrypt.genSaltSync(10);
const db = {
  users: [
    {
      id: 1,
      password: bcrypt.hashSync(process.env.INITIAL_ADMIN_PASSWORD || 'OzaruOps2026!', salt),
      nombre: process.env.INITIAL_ADMIN_USER || 'Admin',
      uen: '-',
      sitio: '-',
      role: 'capturista',
      employeeId: null,
      whatsapp: null,
      canal: null,
    },
  ],
  courses: [],
  grades: [],
};

require('../db').writeDB(db); 
console.log(' db iniciado. Inicia sesión con tus credenciales configuradas.');
