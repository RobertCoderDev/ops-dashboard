const fs = require('fs');
const XLSX = require('xlsx');
const { readDB, writeDB } = require('../db');
const { procesarWorkbook } = require('./importCore');
const { crearRespaldo } = require('./backups');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a.startsWith('--')) {
      args[a.slice(2)] = argv[i + 1];
      i++;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const archivo = args._[0];

  if (!archivo) {
    console.error('❌ Debes indicar la ruta del archivo Excel.');
    console.error('   Ejemplo: npm run import -- "/ruta/al/Reporte.xlsx" --curso "Módulo 1"');
    process.exit(1);
  }
  if (!fs.existsSync(archivo)) {
    console.error(`❌ No se encontró el archivo: ${archivo}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(archivo);
  const db = readDB();

  const r = await procesarWorkbook(workbook, db, { cursoNombre: args.curso, nota: args.nota, sheetForzada: args.sheet });

  if (!r.ok) {
    console.error(`❌ ${r.error}`);
    process.exit(1);
  }
  const dbNueva = r.db; 

  if (r.hojasIgnoradas.length) {
    console.log(`⏭️  Hojas ignoradas a propósito (reportes derivados, no datos base): ${r.hojasIgnoradas.join(', ')}`);
  }
  console.log(`📄 Hoja usada: "${r.hojaUsada}" (encabezado en fila ${r.filaEncabezado})`);
  console.log(`🧾 Exámenes detectados en el archivo: ${r.examenesDetectados.join(', ')}`);
  console.log(`👥 Filas de personas encontradas: ${r.filasEncontradas}`);
  if (r.cursoCreado) {
    console.log(`✨ Curso nuevo creado: "${r.curso.nombre}" (nota aprobatoria ${r.curso.notaAprobatoria}, ${r.curso.numExamenes} examen(es))`);
  } else {
    if (r.examenesAmpliados) {
      console.log(`ℹ️  El curso "${r.curso.nombre}" se amplió a ${r.curso.numExamenes} examen(es).`);
    }
    console.log(`📚 Usando curso existente: "${r.curso.nombre}" (nota aprobatoria ${r.curso.notaAprobatoria})`);
  }

  const { usuariosNuevos, usuariosActualizados, usuariosSinCambios, usuariosSinEmployeeId, calificacionesNuevas, calificacionesActualizadas, calificacionesPendientes, calificacionesInvalidas } = r.resumen;

  console.log('\n===== RESUMEN =====');
  console.log(`Usuarios nuevos:            ${usuariosNuevos}`);
  console.log(`Usuarios actualizados:      ${usuariosActualizados}`);
  console.log(`Usuarios sin cambios:       ${usuariosSinCambios}`);
  console.log(`Calificaciones nuevas:      ${calificacionesNuevas}`);
  console.log(`Calificaciones actualizadas:${calificacionesActualizadas}`);
  console.log(`Calificaciones pendientes:  ${calificacionesPendientes} (N/A o vacías -> quedan como PENDIENTE)`);
  if (calificacionesInvalidas > 0) {
    console.log(`⚠️  Calificaciones fuera de 0-10 ignoradas: ${calificacionesInvalidas} (quedan PENDIENTE)`);
  }
  if (usuariosSinEmployeeId > 0) {
    console.log(`⚠️  Personas sin ID de empleado: ${usuariosSinEmployeeId} (no podrán iniciar sesión hasta tener uno)`);
  }
  if (r.avisos.length) {
    console.log(`\nAvisos (${r.avisos.length}):`);
    r.avisos.slice(0, 20).forEach((a) => console.log(' - ' + a));
    if (r.avisos.length > 20) console.log(`   ...y ${r.avisos.length - 20} más.`);
  }

  if (args.dryRun) {
    console.log('\n --dry-run: no se escribió nada en db.json.');
    return;
  }

  const backupPath = crearRespaldo();
  if (backupPath) {
    console.log(`\nRespaldo del db.json anterior: ${backupPath}`);
  }

  writeDB(dbNueva);
  console.log('db actualizado correctamente.');
}

main().catch((e) => {
  console.error(' Error:', e);
  process.exit(1);
});
