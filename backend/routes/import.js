const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { DB_PATH, writeDB } = require('../db');
const { requireAuth, requireCapturista } = require('../middleware/auth');
const { procesarWorkbook } = require('../utils/importCore');
const { crearRespaldo } = require('../utils/backups');
const { rateLimit } = require('../middleware/security');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const nombreOk = /\.xlsx?$/i.test(file.originalname);
    const tipoOk = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      'application/zip',
    ].includes(file.mimetype);
    if (!nombreOk) return cb(new Error('El archivo debe ser un Excel (.xlsx o .xls)'));
    if (!tipoOk) return cb(new Error('El contenido del archivo no parece un Excel'));
    cb(null, true);
  },
});

const limitarImport = rateLimit({
  ventanaMs: 60_000,
  max: 10,
  mensaje: 'Demasiadas importaciones seguidas. Espera un minuto.',
});

router.post(
  '/excel',
  requireAuth,
  requireCapturista,
  limitarImport,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
      }

      let workbook;
      try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      } catch (e) {
        return res.status(400).json({ error: 'No se pudo leer el archivo. ¿Seguro que es un Excel válido?' });
      }

      const { readDB } = require('../db');
      const db = readDB();
      const dryRun = req.body.dryRun === 'true' || req.body.dryRun === true;

      let resultado;
      try {
        resultado = await procesarWorkbook(workbook, db, {
          cursoNombre: req.body.curso,
          nota: req.body.nota,
          sheetForzada: req.body.sheet,
        });
      } catch (e) {
        console.error('Error procesando el Excel:', e);
        return res.status(500).json({ error: 'Ocurrió un error inesperado al procesar el archivo.' });
      }

      if (!resultado.ok) {
        return res.status(400).json({ error: resultado.error });
      }

      if (dryRun) {
        const { db: _descartado, ...resto } = resultado;
        return res.json({ ...resto, dryRun: true, guardado: false });
      }

      const backup = crearRespaldo();

      writeDB(resultado.db);
      const { db: _publicado, ...resto } = resultado;

      res.json({
        ...resto,
        dryRun: false,
        guardado: true,
        backup: backup ? path.basename(backup) : null,
      });
    } catch (e) { next(e); }
  }
);

// Middleware de errores de multer (archivo muy grande, tipo inválido, etc.)
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Error al subir el archivo' });
  next(err);
});

module.exports = router;
