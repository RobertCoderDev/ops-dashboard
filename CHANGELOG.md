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
  - Pulido visual estricto de UI/CSS:
    - Distribución de columnas optimizada (`32% Nombre`, `14% Acceso`, `14% UEN`, `14% Sitio`, `10% Rol`, `16% Acciones`) con `align-middle` para evitar desalineaciones verticales ante nombres largos.
    - Botones de acción compactos (`d-inline-flex gap-1`) con jerarquía visual clara.
    - Botones del formulario ("Guardar cambios" y "Cancelar") alineados en flex horizontal sin saltos de línea antiestéticos.
    - Resaltado suave y profesional de la fila en edición (`#eef4ff`) con badge contextual en el encabezado del formulario.
