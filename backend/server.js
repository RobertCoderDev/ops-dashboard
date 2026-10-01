require('./env').loadEnv(); 
const express = require('express');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const coursesRoutes = require('./routes/courses');
const gradesRoutes = require('./routes/grades');
const dashboardRoutes = require('./routes/dashboard');
const importRoutes = require('./routes/import');

const { securityHeaders, crearCors, rateLimit } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(securityHeaders);
app.use(crearCors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ ventanaMs: 60_000, max: 600 }));

const { DB_PATH } = require('./db');
const dbPath = DB_PATH;
if (!fs.existsSync(dbPath)) {
  console.log('No se encontró db.json, generando datos de ejemplo...');
  require('./utils/startDb');
}

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));


// --- PARCHE TARA: Servir Frontend React ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ------------------------------------------

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  const mensaje = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : (err.message || 'Error interno');
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: mensaje });
  }
});

app.listen(PORT, () => {
  console.log(`✔ Servidor backend corriendo en http://localhost:${PORT}`);
});
