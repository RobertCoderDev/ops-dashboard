const jwt = require('jsonwebtoken');

function obtenerSecreto() {
  const secreto = process.env.JWT_SECRET;
  const esProd = process.env.NODE_ENV === 'production';
  if (secreto && secreto.length >= 16) return secreto;
  if (esProd) {
    console.error(
      '\nFATAL: JWT_SECRET no está definido (o es muy corto, <16 chars) y NODE_ENV=production.\n' +
      'Define una clave fuerte, por ejemplo:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
      'y expórtala como JWT_SECRET antes de arrancar.\n'
    );
    process.exit(1);
  }
  if (secreto) return secreto; 
  console.warn(
    '[seguridad] Usando JWT_SECRET de desarrollo. NO usar en producción ' +
    '(configura JWT_SECRET, ver backend/.env.example).'
  );
  return 'clave-secreta-desarrollo-cambiar-en-produccion';
}

const JWT_SECRET = obtenerSecreto();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado'});
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado'});
  }
}

function requireCapturista(req, res, next) {
  if (req.user?.role !== 'capturista') {
    return res.status(403).json({ error: 'Acceso restringido al capturista'});
  }
  next();
}

module.exports = { requireAuth, requireCapturista, JWT_SECRET };
