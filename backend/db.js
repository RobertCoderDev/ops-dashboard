const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.env.DB_DIR || __dirname, 'db.json');
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const err = new Error('db.json no existe');
    err.code = 'DB_MISSING';
    throw err;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    const backup = `${DB_PATH}.corrupt-${Date.now()}`;
    try {
      fs.copyFileSync(DB_PATH, backup);
    } catch (_) { /* si no se puede copiar, seguimos y lanzamos el error real */ }
    const err = new Error(
      `db.json corrupto (se intentó copiar a ${path.basename(backup)}): ${e.message}`
    );
    err.code = 'DB_CORRUPT';
    throw err;
  }

  if (!data || typeof data !== 'object' || !Array.isArray(data.users) ||
      !Array.isArray(data.courses) || !Array.isArray(data.grades)) {
    const err = new Error('db.json con estructura inválida (faltan users/courses/grades)');
    err.code = 'DB_CORRUPT';
    throw err;
  }
  return data;
}
function writeDB(data) {
  const tmp = `${DB_PATH}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  try {
    fs.renameSync(tmp, DB_PATH);
  } catch (e) {
    try {
      fs.copyFileSync(tmp, DB_PATH);
    } finally {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
    if (e.code !== 'EEXIST' && e.code !== 'EPERM') throw e;
  }
}

function nextId(arr) {
  let max = 0;
  for (const x of arr) {
    const n = Number(x && x.id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
let cola = Promise.resolve();

function withDb(fn) {
  const ejecucion = cola.then(async () => {
    const db = readDB();
    const resultado = await fn(db); 
    const omiteEscritura = resultado && resultado.write === false;
    if (!omiteEscritura) {
      const aEscribir = resultado && resultado.db ? resultado.db : db;
      writeDB(aEscribir);
    }
    return resultado;
  });
  cola = ejecucion.catch(() => {});
  return ejecucion;
}

module.exports = { readDB, writeDB, nextId, withDb, DB_PATH };
