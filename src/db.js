const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let pool = null;
let isConnected = false;

// Datos de respaldo en memoria si MySQL aún no está iniciado
const memoryStore = {
  personal: [
    { id: 1, codigo: 'PER-001', nombres: 'Kevin Antony', apellidos: 'Aratea Mamani', nombre_completo: 'Aratea Mamani, Kevin Antony', dni: '72418901', cargo: 'Chofer Repartidor', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 1, estado: 'ACTIVO' },
    { id: 2, codigo: 'PER-002', nombres: 'Diana Estefany', apellidos: 'Condori Salas', nombre_completo: 'Condori Salas, Diana Estefany', dni: '73529012', cargo: 'Operario de Envasado', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 0, estado: 'ACTIVO' },
    { id: 3, codigo: 'PER-003', nombres: 'Angel', apellidos: 'Lopez Mansilla', nombre_completo: 'Lopez Mansilla, Angel', dni: '71239845', cargo: 'Operario de Plataforma', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 0, estado: 'ACTIVO' },
    { id: 4, codigo: 'PER-004', nombres: 'Jerry Jose', apellidos: 'Lopez Mansilla', nombre_completo: 'Lopez Mansilla, Jerry Jose', dni: '74829103', cargo: 'Operario de Envasado', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 0, estado: 'ACTIVO' },
    { id: 5, codigo: 'PER-005', nombres: 'Edwin', apellidos: 'Machaca Chuquimamani', nombre_completo: 'Machaca Chuquimamani, Edwin', dni: '70293814', cargo: 'Operario de Mantenimiento', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 0, estado: 'ACTIVO' },
    { id: 6, codigo: 'PER-006', nombres: 'Brayam', apellidos: 'Machaca Flores', nombre_completo: 'Machaca Flores, Brayam', dni: '75910283', cargo: 'Chofer Repartidor', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 1, estado: 'ACTIVO' },
    { id: 7, codigo: 'PER-007', nombres: 'Willy', apellidos: 'Rengifo Ticona', nombre_completo: 'Rengifo Ticona, Willy', dni: '76192834', cargo: 'Chofer Repartidor', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 1, estado: 'ACTIVO' },
    { id: 8, codigo: 'PER-008', nombres: 'Farley', apellidos: 'Viveros Blanco', nombre_completo: 'Viveros Blanco, Farley', dni: '71029384', cargo: 'Operario de Envasado', hora_entrada_regular: '07:30:00', hora_salida_regular: '16:30:00', es_chofer: 0, estado: 'ACTIVO' }
  ],
  vehiculos: [
    { id: 1, placa: 'V1X-890', marca: 'Hyundai', modelo: 'HD78', capacidad_balones: 120, estado: 'ACTIVO' },
    { id: 2, placa: 'B7A-721', marca: 'Mitsubishi', modelo: 'Canter', capacidad_balones: 140, estado: 'ACTIVO' },
    { id: 3, placa: 'Z3T-815', marca: 'Isuzu', modelo: 'Forward', capacidad_balones: 150, estado: 'ACTIVO' },
    { id: 4, placa: 'A4F-912', marca: 'Hino', modelo: 'Dutro', capacidad_balones: 110, estado: 'ACTIVO' }
  ],
  esquelas: [
    { id: 1, correlativo: 'ESQ-001', fecha: '2026-10-01', chofer_id: 1, vehiculo_id: 1, hora_salida: '08:30:00', hora_llegada: '14:20:00', llenos_10kg: 80, llenos_45kg: 10, llenos_5kg: 5, vacios_10kg: 78, vacios_45kg: 10, vacios_5kg: 5, cambios_salida_5kg: 0, cambios_salida_10kg: 0, cambios_salida_45kg: 0, cambios_ingreso_5kg: 0, cambios_ingreso_10kg: 0, cambios_ingreso_45kg: 0, observaciones: 'Ruta centro normal' },
    { id: 2, correlativo: 'ESQ-002', fecha: '2026-10-02', chofer_id: 6, vehiculo_id: 2, hora_salida: '08:45:00', hora_llegada: '15:10:00', llenos_10kg: 95, llenos_45kg: 12, llenos_5kg: 8, vacios_10kg: 95, vacios_45kg: 12, vacios_5kg: 8, cambios_salida_5kg: 0, cambios_salida_10kg: 0, cambios_salida_45kg: 0, cambios_ingreso_5kg: 0, cambios_ingreso_10kg: 0, cambios_ingreso_45kg: 0, observaciones: 'Distribución industrial' },
    { id: 3, correlativo: 'ESQ-012', fecha: '2026-10-29', chofer_id: 7, vehiculo_id: 3, hora_salida: '08:30:00', hora_llegada: '14:55:00', llenos_10kg: 110, llenos_45kg: 16, llenos_5kg: 10, vacios_10kg: 110, vacios_45kg: 16, vacios_5kg: 10, cambios_salida_5kg: 0, cambios_salida_10kg: 0, cambios_salida_45kg: 0, cambios_ingreso_5kg: 0, cambios_ingreso_10kg: 0, cambios_ingreso_45kg: 0, observaciones: 'Último despacho registrado' }
  ],
  adelantos: [
    { id: 1, personal_id: 5, nombre_completo: 'Machaca Chuquimamani, Edwin', monto: 500, fecha: '2026-09-15', fecha_fmt: '15 de septiembre' },
    { id: 2, personal_id: 4, nombre_completo: 'Lopez Mansilla, Jerry Jose', monto: 300, fecha: '2026-09-15', fecha_fmt: '15 de septiembre' },
    { id: 3, personal_id: 1, nombre_completo: 'Aratea Mamani, Kevin Antony', monto: 300, fecha: '2026-09-15', fecha_fmt: '15 de septiembre' },
    { id: 4, personal_id: 6, nombre_completo: 'Machaca Flores, Brayam', monto: 400, fecha: '2026-09-15', fecha_fmt: '15 de septiembre' }
  ],
  asistencias: []
};

// Generar matriz de Setiembre y Octubre 2026 para el store en memoria
function initMemoryAttendances() {
  const septMatrix = {
    1: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    2: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    3: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    4: { 1: 'F', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    5: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    6: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    7: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    8: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    9: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    10: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    11: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    12: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    13: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    14: { 1: 'F', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    15: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    16: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    17: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    18: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    19: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    20: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    21: { 1: 'T', 2: 'P', 3: 'P', 4: 'F', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    22: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    23: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    24: { 1: 'T', 2: 'P', 3: 'P', 4: 'T', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    25: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    26: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    27: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    28: { 1: 'P', 2: 'P', 3: 'P', 4: 'F', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    29: { 1: 'P', 2: 'P', 3: 'P', 4: 'T', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    30: { 1: 'P', 2: 'P', 3: 'P', 4: 'T', 5: 'P', 6: 'P', 7: 'P', 8: 'P' }
  };

  const octMatrix = {
    1: { 1: 'F', 2: 'P', 3: 'F', 4: 'F', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    2: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    3: { 1: 'F', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P' },
    4: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    5: { 1: 'F', 2: 'P', 3: 'P', 4: 'F', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    6: { 1: 'F', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    7: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    8: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    9: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    10: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    11: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    12: { 1: 'F', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    13: { 1: 'T', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    14: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    15: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    16: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    17: { 1: 'P', 2: 'F', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    18: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    19: { 1: 'F', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    20: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    21: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    22: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    23: { 1: 'P', 2: 'P', 3: 'P', 4: 'F', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    24: { 1: 'P', 2: 'F', 3: 'P', 4: 'T', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    25: { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-' },
    26: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    27: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    28: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    29: { 1: 'P', 2: 'P', 3: 'P', 4: 'T', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    30: { 1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'F' },
    31: { 1: 'F', 2: 'F', 3: 'P', 4: 'F', 5: 'P', 6: 'P', 7: 'P', 8: 'F' }
  };

  const tardanzaTimes = {
    '2026-09-08_1': { hora: '08:15:00', min: 45 },
    '2026-09-11_1': { hora: '08:10:00', min: 40 },
    '2026-09-17_1': { hora: '08:20:00', min: 50 },
    '2026-09-18_1': { hora: '08:15:00', min: 45 },
    '2026-09-19_1': { hora: '08:25:00', min: 55 },
    '2026-09-21_1': { hora: '08:10:00', min: 40 },
    '2026-09-23_1': { hora: '08:15:00', min: 45 },
    '2026-09-24_1': { hora: '08:20:00', min: 50 },
    '2026-09-25_1': { hora: '08:05:00', min: 35 },
    '2026-09-24_4': { hora: '08:10:00', min: 40 },
    '2026-09-29_4': { hora: '08:15:00', min: 45 },
    '2026-09-30_4': { hora: '08:20:00', min: 50 },
    '2026-10-02_1': { hora: '08:20:00', min: 50 },
    '2026-10-07_1': { hora: '08:10:00', min: 40 },
    '2026-10-13_1': { hora: '08:10:00', min: 40 },
    '2026-10-24_4': { hora: '08:15:00', min: 45 },
    '2026-10-29_4': { hora: '08:20:00', min: 50 }
  };

  let idCounter = 1;
  const populateMonth = (matrix, prefix) => {
    const days = Object.keys(matrix).map(Number).sort((a,b) => a-b);
    for (const d of days) {
      const dayStr = String(d).padStart(2, '0');
      const fecha = `${prefix}-${dayStr}`;
      const dayData = matrix[d];

      for (let empId = 1; empId <= 8; empId++) {
        const estado = dayData[empId] || '-';
        let horaEntrada = null;
        let horaSalida = null;
        let minutosTardanza = 0;
        let asistio = 'NO';

        if (estado === 'P') {
          asistio = 'SI';
          horaEntrada = '07:25:00';
          horaSalida = '16:30:00';
        } else if (estado === 'T') {
          asistio = 'SI';
          horaSalida = '16:30:00';
          const tInfo = tardanzaTimes[`${fecha}_${empId}`] || { hora: '08:10:00', min: 40 };
          horaEntrada = tInfo.hora;
          minutosTardanza = tInfo.min;
        }

        memoryStore.asistencias.push({
          id: idCounter++,
          personal_id: empId,
          fecha,
          asistio,
          estado,
          hora_entrada: horaEntrada,
          hora_salida: horaSalida,
          minutos_tardanza: minutosTardanza,
          observaciones: ''
        });
      }
    }
  };

  populateMonth(septMatrix, '2026-09');
  populateMonth(octMatrix, '2026-10');
}

initMemoryAttendances();

async function initDB() {
  try {
    let host = process.env.DB_HOST || '127.0.0.1';
    if (host === 'localhost') host = '127.0.0.1';

    pool = mysql.createPool({
      host: host,
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'asistencia_planta',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    pool.on('error', (err) => {
      console.error('[DB Pool Error]', err.message);
    });

    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isConnected = true;
    console.log(`[DB] Conectado exitosamente a MySQL en ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  } catch (err) {
    isConnected = false;
    console.warn(`[DB] MySQL no disponible actualmente (${err.message}). Utilizando almacén en memoria reactivo con datos completos de SURGAS.`);
  }
}

async function query(sql, params = []) {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (e) {
      console.error(`[DB Query Error]`, e.message);
      throw e;
    }
  }
  return null;
}

module.exports = {
  initDB,
  query,
  isLiveDB: () => isConnected,
  getMemoryStore: () => memoryStore
};
