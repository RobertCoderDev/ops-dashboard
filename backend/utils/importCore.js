const XLSX = require('xlsx');
const { nextId } = require('../db');

function normaliza(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const ALIASES = {
  nombre: ['username', 'nombre', 'nombre completo', 'nombre del usuario', 'nombre y apellido'],
  employeeId: ['employee_number_id', 'id de empleado', 'no de empleado', 'numero de empleado', 'id_empleado', 'no. empleado'],
  whatsapp: ['whatsapp', 'telefono', 'celular'],
  uen: ['uen'],
  sitio: ['sitio', 'sede'],
  canal: ['canal de consumo', 'canal'],
};

const HOJAS_EXCLUIDAS = ['resultados cumplimiento', 'personas top', 'respuestas'];

const MAX_AVISOS = 100;

function detectarHoja(workbook, sheetForzada) {
  const candidatas = sheetForzada
    ? [sheetForzada]
    : workbook.SheetNames.filter((n) => !HOJAS_EXCLUIDAS.includes(normaliza(n)));

  for (const nombreHoja of candidatas) {
    const sheet = workbook.Sheets[nombreHoja];
    if (!sheet) continue;
    const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });

    for (let i = 0; i < Math.min(10, filas.length); i++) {
      const fila = filas[i];
      const tieneEvaluacion = fila.some((c) => /evaluaci[oó]n\s*\d+|eval\s*\d+|examen\s*#?\d+/i.test(normaliza(c)));
      const tieneUenYSitio = fila.some((c) => normaliza(c) === 'uen') &&
        fila.some((c) => normaliza(c) === 'sitio' || normaliza(c) === 'sede');
      if (tieneEvaluacion && tieneUenYSitio) {
        return { nombreHoja, filas, filaEncabezado: i };
      }
    }
  }
  return null;
}

function mapearColumnas(encabezado) {
  const norm = encabezado.map(normaliza);
  const cols = {};

  for (const [campo, aliases] of Object.entries(ALIASES)) {
    const idx = norm.findIndex((h) => aliases.includes(h));
    if (idx !== -1) cols[campo] = idx;
  }

  const examenes = [];
  norm.forEach((h, idx) => {
    const m = h.match(/(?:evaluaci[oó]n|eval|examen)\s*#?\s*(\d+)/i);
    if (m) examenes.push({ col: idx, numero: Number(m[1]) });
  });
  examenes.sort((a, b) => a.numero - b.numero);

  return { cols, examenes };
}

function parseCalificacion(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor >= 0 && valor <= 10 ? valor : { invalido: valor };
  }
  const limpio = String(valor).trim().replace(',', '.');
  if (/^n\/?a$/i.test(limpio)) return null;
  const num = Number(limpio);
  if (!Number.isFinite(num)) return { invalido: valor }; 
  if (num < 0 || num > 10) return { invalido: num };
  return num;
}

function clonarDb(db) {
  return {
    users: db.users.map((u) => ({ ...u })),
    courses: db.courses.map((c) => ({ ...c })),
    grades: db.grades.map((g) => ({ ...g })),
  };
}
async function procesarWorkbook(workbook, db, { cursoNombre, nota, sheetForzada } = {}) {
  const cursoNombreLimpio = typeof cursoNombre === 'string' ? cursoNombre.trim() : '';
  if (!cursoNombreLimpio) {
    return { ok: false, error: 'Debes indicar a qué curso pertenece este archivo (campo "curso").', db };
  }

  const ignoradas = workbook.SheetNames.filter((n) => HOJAS_EXCLUIDAS.includes(normaliza(n)));
  const deteccion = detectarHoja(workbook, sheetForzada);

  if (!deteccion) {
    return {
      ok: false,
      error: 'No se encontró en el Excel una hoja con columnas "UEN", "Sitio" y "Evaluación N". ' +
        `Hojas disponibles: ${workbook.SheetNames.join(', ')}.`,
      db,
    };
  }

  const { nombreHoja, filas, filaEncabezado } = deteccion;
  const encabezado = filas[filaEncabezado];
  const { cols, examenes } = mapearColumnas(encabezado);

  if (cols.uen === undefined || cols.sitio === undefined || examenes.length === 0) {
    return { ok: false, error: 'La hoja detectada no tiene todas las columnas esperadas (UEN, Sitio, Evaluación N).', db };
  }
  if (cols.nombre === undefined) {
    return { ok: false, error: 'No se encontró una columna de nombre (username / nombre / nombre completo).', db };
  }

  const numeros = examenes.map((e) => e.numero);
  const maxExamenDetectado = Math.max(...numeros);
  const faltantes = [];
  for (let i = 1; i <= maxExamenDetectado; i++) if (!numeros.includes(i)) faltantes.push(i);
  if (faltantes.length) {
    return {
      ok: false,
      error: `El Excel trae los exámenes ${numeros.join(', ')} pero falta(n) el/los ${faltantes.join(', ')}. ` +
        'Revisa el archivo antes de importar.',
      db,
    };
  }

  const datos = filas.slice(filaEncabezado + 1).filter((f) => f && f.some((c) => c !== null && c !== ''));

  const trabajo = clonarDb(db);

  let curso = trabajo.courses.find((c) => normaliza(c.nombre) === normaliza(cursoNombreLimpio));
  let cursoCreado = false;
  let examenesAmpliados = false;

  let notaNueva = null;
  if (nota !== undefined && nota !== null && nota !== '') {
    notaNueva = Number(nota);
    if (!Number.isFinite(notaNueva) || notaNueva < 0 || notaNueva > 10) {
      return { ok: false, error: 'La nota aprobatoria debe ser un número entre 0 y 10.', db };
    }
  }

  if (!curso) {
    const esPrimerCurso = trabajo.courses.length === 0;
    curso = {
      id: nextId(trabajo.courses),
      nombre: cursoNombreLimpio,
      numExamenes: maxExamenDetectado,
      notaAprobatoria: notaNueva !== null ? notaNueva : (esPrimerCurso ? 7 : 8),
    };
    trabajo.courses.push(curso);
    cursoCreado = true;
  } else if (maxExamenDetectado > curso.numExamenes) {
    curso.numExamenes = maxExamenDetectado;
    examenesAmpliados = true;
  }

  let usuariosNuevos = 0;
  let usuariosActualizados = 0;
  let usuariosSinCambios = 0;
  const sinEmployeeId = new Map(); 
  let calificacionesNuevas = 0;
  let calificacionesActualizadas = 0;
  let calificacionesPendientes = 0;
  let calificacionesInvalidas = 0;
  const avisos = [];

  let siguienteUsuario = nextId(trabajo.users);
  let siguienteCalificacion = nextId(trabajo.grades);

  const avisar = (msg) => { if (avisos.length < MAX_AVISOS) avisos.push(msg); };

  let numFila = filaEncabezado + 1;
  for (const fila of datos) {
    numFila++;

    const nombre = fila[cols.nombre] ? String(fila[cols.nombre]).trim() : null;
    const employeeIdRaw = cols.employeeId !== undefined ? fila[cols.employeeId] : null;
    const employeeId = employeeIdRaw !== null && employeeIdRaw !== undefined && employeeIdRaw !== ''
      ? String(employeeIdRaw).trim()
      : null;
    const uen = cols.uen !== undefined && fila[cols.uen] ? String(fila[cols.uen]).trim() : '-';
    const sitio = cols.sitio !== undefined && fila[cols.sitio] ? String(fila[cols.sitio]).trim() : '-';
    const whatsapp = cols.whatsapp !== undefined && fila[cols.whatsapp] ? String(fila[cols.whatsapp]).trim() : null;
    const canal = cols.canal !== undefined && fila[cols.canal] ? String(fila[cols.canal]).trim() : null;

    if (!nombre) {
      avisar(`Fila ${numFila}: sin nombre, se omite.`);
      continue;
    }
    if (!employeeId) {
      avisar(`Fila ${numFila} ("${nombre}"): sin ID de empleado - se cruzó/creó por nombre exacto, pero NO podrá iniciar sesión hasta que se le asigne un ID.`);
    }

    let usuario = null;
    if (employeeId) {
      usuario = trabajo.users.find((u) => u.employeeId && normaliza(u.employeeId) === normaliza(employeeId));
    } else {
      usuario = trabajo.users.find((u) => !u.employeeId && normaliza(u.nombre) === normaliza(nombre));
      if (!usuario) {
        const conId = trabajo.users.find((u) => u.employeeId && normaliza(u.nombre) === normaliza(nombre));
        if (conId) {
          avisar(`Fila ${numFila} ("${nombre}"): ya existe una persona con ese nombre y número de empleado ${conId.employeeId}; se cruzó con ella. Si es otra persona, asígnale su ID de empleado en el Excel.`);
          usuario = conId;
        }
      }
    }

    if (usuario) {
      const antes = JSON.stringify([
        usuario.nombre, usuario.uen, usuario.sitio, usuario.employeeId,
        usuario.whatsapp, usuario.canal,
      ]);
      usuario.nombre = nombre;
      usuario.uen = uen;
      usuario.sitio = sitio;
      if (employeeId) usuario.employeeId = employeeId;
      if (whatsapp) usuario.whatsapp = whatsapp;
      if (canal) usuario.canal = canal;
      const despues = JSON.stringify([
        usuario.nombre, usuario.uen, usuario.sitio, usuario.employeeId,
        usuario.whatsapp, usuario.canal,
      ]);
      if (antes !== despues) usuariosActualizados++;
      else usuariosSinCambios++;
    } else {
      usuario = {
        id: siguienteUsuario++,
        nombre, uen, sitio,
        role: 'usuario',
        employeeId,
        whatsapp,
        canal,
      };
      trabajo.users.push(usuario);
      usuariosNuevos++;
    }

    if (!usuario.employeeId) {
      sinEmployeeId.set(usuario.id, { nombre: usuario.nombre });
    }

    for (const { col, numero } of examenes) {
      const crudo = parseCalificacion(fila[col]);
      let calificacion = null;
      if (crudo && typeof crudo === 'object') {
        calificacionesInvalidas++;
        avisar(`Fila ${numFila} ("${nombre}"), Evaluación ${numero}: valor "${crudo.invalido}" fuera de 0-10, se ignora (queda PENDIENTE).`);
      } else {
        calificacion = crudo;
      }
      if (calificacion === null) calificacionesPendientes++;

      let grade = trabajo.grades.find(
        (g) => g.userId === usuario.id && g.courseId === curso.id && g.examen === numero
      );
      if (grade) {
        if (grade.calificacion !== calificacion) {
          calificacionesActualizadas++;
          grade.calificacion = calificacion;
          grade.fecha = new Date().toISOString().slice(0, 10);
        }
      } else {
        trabajo.grades.push({
          id: siguienteCalificacion++,
          userId: usuario.id,
          courseId: curso.id,
          examen: numero,
          calificacion,
          fecha: new Date().toISOString().slice(0, 10),
        });
        calificacionesNuevas++;
      }
    }
  }

  if (avisos.length >= MAX_AVISOS) {
    avisos.push(`...y más avisos (se muestran los primeros ${MAX_AVISOS}).`);
  }

  return {
    ok: true,
    db: trabajo,
    hojaUsada: nombreHoja,
    hojasIgnoradas: ignoradas,
    filaEncabezado: filaEncabezado + 1,
    examenesDetectados: numeros,
    filasEncontradas: datos.length,
    curso: {
      id: curso.id, nombre: curso.nombre,
      notaAprobatoria: curso.notaAprobatoria, numExamenes: curso.numExamenes,
    },
    cursoCreado,
    examenesAmpliados,
    resumen: {
      usuariosNuevos,
      usuariosActualizados,
      usuariosSinCambios,
      usuariosSinEmployeeId: sinEmployeeId.size,
      calificacionesNuevas,
      calificacionesActualizadas,
      calificacionesPendientes,
      calificacionesInvalidas,
    },
    avisos,
  };
}

module.exports = {
  normaliza,
  HOJAS_EXCLUIDAS,
  detectarHoja,
  mapearColumnas,
  parseCalificacion,
  procesarWorkbook,
};
