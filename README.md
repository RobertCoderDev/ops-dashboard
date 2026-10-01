# Ozaru Ops Dashboard - Gestión de Capacitaciones

Herramienta interna para el equipo de Operaciones de Ozaru. Permite cargar reportes de capacitación en formato Excel, procesarlos y visualizar dashboards interactivos de avance por usuario y curso.

## Estructura del Proyecto

- **`frontend/`**: Aplicación SPA en React construida con Vite y Recharts para dashboards.
- **`backend/`**: API en Node.js + Express que procesa los archivos Excel y gestiona la base de datos.
- **Base de Datos**: Utiliza un archivo JSON (`db.json`) para persistencia ligera, optimizado para despliegues con volúmenes en Docker.

## Credenciales por Defecto (Capturista)

El sistema ahora lee las credenciales del primer usuario administrador desde las **Variables de Entorno** al generar la base de datos por primera vez. Esto evita contraseñas "quemadas" (hardcoded) en el código.

*(Los usuarios de consulta normal ingresan únicamente con su número de empleado, el cual se genera automáticamente al importar el Excel).*

## Despliegue en EasyPanel (VPS)

El proyecto está configurado para desplegarse mediante Docker, sirviendo tanto el Frontend como el Backend en un solo puerto (4000).

1. Crea una nueva App en EasyPanel conectada a este repositorio.
2. En la pestaña **Environment**, configura las variables:
   - `NODE_ENV=production`
   - `PORT=4000`
   - `JWT_SECRET=tu_secreto_aqui_generado_aleatoriamente`
   - `INITIAL_ADMIN_USER=Admin` *(Opcional: Nombre del usuario operador)*
   - `INITIAL_ADMIN_PASSWORD=OzaruOps2026!` *(Opcional: Contraseña inicial segura)*
3. En la pestaña **Volumes**, agrega un volumen persistente:
   - **Mount path (Ruta en contenedor):** `/app/data`
   *(Esto asegura que la base de datos sobreviva a los reinicios).*
4. Despliega (Deploy).

## Desarrollo Local

### Backend
```bash
cd backend
npm install
npm start
```
El backend correrá en `http://localhost:4000`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend correrá en `http://localhost:5173`.
