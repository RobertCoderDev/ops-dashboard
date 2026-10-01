
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
}

function crearCors() {
  const permitidos = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL ||
    'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return function cors(req, res, next) {
    const origen = req.headers.origin;
    if (origen && permitidos.includes(origen)) {
      res.setHeader('Access-Control-Allow-Origin', origen);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  };
}


function rateLimit({ ventanaMs = 60_000, max = 100, mensaje, clave } = {}) {
  const hits = new Map(); 
  const timer = setInterval(() => {
    const ahora = Date.now();
    for (const [k, v] of hits) if (ahora - v.inicio > ventanaMs) hits.delete(k);
  }, ventanaMs);
  if (timer.unref) timer.unref();

  return function limitador(req, res, next) {
    const key = clave ? clave(req) : req.ip;
    const ahora = Date.now();
    let registro = hits.get(key);
    if (!registro || ahora - registro.inicio > ventanaMs) {
      registro = { count: 0, inicio: ahora };
      hits.set(key, registro);
    }
    registro.count += 1;
    if (registro.count > max) {
      const reintentar = Math.ceil((registro.inicio + ventanaMs - ahora) / 1000);
      res.setHeader('Retry-After', String(reintentar));
      return res.status(429).json({
        error: mensaje || `Demasiadas peticiones. Intenta de nuevo en ${reintentar}s.`,
      });
    }
    next();
  };
}

module.exports = { securityHeaders, crearCors, rateLimit };
