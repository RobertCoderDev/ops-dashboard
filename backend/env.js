const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const contenido = fs.readFileSync(envPath, 'utf-8');
    for (const linea of contenido.split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const clave = m[1];
      let valor = m[2].trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      if (process.env[clave] === undefined) process.env[clave] = valor;
    }
  } catch (e) {
    console.warn('No se pudo leer .env:', e.message);
  }
}

module.exports = { loadEnv };
