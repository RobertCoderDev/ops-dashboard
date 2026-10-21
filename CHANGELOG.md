# Changelog - Ops Dashboard

## [2026-10-20] - tara/feat/edit-users by Tara
- **Backend (`backend/routes/users.js`)**:
  - Implementado endpoint `PUT /:id` con protección de autenticación (`requireAuth`, `requireCapturista`).
  - Validación de campos: nombre obligatorio, rol (`usuario` o `capturista`), número de empleado único si es usuario, y longitud de contraseña mínima si se proporciona.
  - Soporte para actualización de contraseñas de capturista (opcional: si se deja en blanco se conserva la existente; obligatoria si se promueve un usuario a capturista).
  - Medida de seguridad: previene que un capturista degrade su propio usuario a rol `usuario` mientras tiene sesión activa.
  - Validación y detección de nombres duplicados para retorno de advertencia amistosa en payload.
- **Frontend (`frontend/src/pages/CapturistaUsuarios.jsx`)**:
  - Añadido botón "Editar" en la columna de acciones del listado de usuarios.
  - Formulario lateral reactivo: conmuta entre modo creación ("Agregar usuario") y modo edición ("Editar usuario"), pre-cargando los datos del usuario seleccionado.
  - Resaltado visual (`table-primary`) de la fila que está siendo editada en tiempo real.
  - Opción de cancelación rápida de edición para restaurar el formulario a su estado inicial.
  - Manejo adaptativo del campo de contraseña para capturistas en edición (opcional, con placeholder explicativo).
