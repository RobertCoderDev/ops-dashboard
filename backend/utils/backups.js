
const fs = require('fs');
const path = require('path');
const { DB_PATH } = require('../db');

const MAX_RESPALDOS = 5;

function crearRespaldo() {
  if (!fs.existsSync(DB_PATH)) return null;

  const dir = path.dirname(DB_PATH);
  const backupPath = path.join(dir, `db.backup-${Date.now()}.json`);
  fs.copyFileSync(DB_PATH, backupPath);

  const respaldos = fs.readdirSync(dir)
    .filter((f) => /^db\.backup-\d+\.json$/.test(f) || /^db\.backup-.*\.json$/.test(f))
    .map((f) => ({ f, ruta: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const { ruta } of respaldos.slice(MAX_RESPALDOS)) {
    try { fs.unlinkSync(ruta); } catch (_) { /* en uso por otro proceso */ }
  }
  return backupPath;
}

module.exports = { crearRespaldo, MAX_RESPALDOS };
