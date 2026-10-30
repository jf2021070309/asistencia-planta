const db = require('../db');

function formatDDMMYYYY(dateStr) {
  // dateStr: YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

exports.getMatrix = async (req, res) => {
  try {
    const mesParam = req.query.mes || '2026-10'; // Formato YYYY-MM
    const [yearStr, monthStr] = mesParam.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    let personalList = [];
    let asistencias = [];

    if (db.isLiveDB()) {
      personalList = await db.query('SELECT id, nombres, apellidos, nombre_completo FROM personal WHERE estado = "ACTIVO" ORDER BY id ASC');
      asistencias = await db.query(
        'SELECT personal_id, DATE_FORMAT(fecha, "%Y-%m-%d") as fecha, asistio, estado, hora_entrada, hora_salida, minutos_tardanza FROM asistencias WHERE DATE_FORMAT(fecha, "%Y-%m") = ?',
        [mesParam]
      );
    } else {
      const store = db.getMemoryStore();
      personalList = store.personal;
      asistencias = store.asistencias.filter(a => a.fecha.startsWith(mesParam));
    }

    // Indexar asistencias por fecha y personal_id
    const asisArrayMap = {};
    asistencias.forEach(a => {
      const key = `${a.fecha}_${a.personal_id}`;
      asisArrayMap[key] = a;
    });

    const rows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayPad = String(d).padStart(2, '0');
      const fechaISO = `${mesParam}-${dayPad}`;
      const fechaFormat = `${dayPad}/${monthStr}/${yearStr}`;

      const row = {
        fecha: fechaFormat,
        fechaISO: fechaISO,
        empleados: {}
      };

      personalList.forEach(p => {
        const key = `${fechaISO}_${p.id}`;
        const record = asisArrayMap[key];
        row.empleados[p.id] = record ? {
          estado: record.estado || '-',
          asistio: record.asistio || 'NO',
          hora_entrada: record.hora_entrada,
          hora_salida: record.hora_salida,
          minutos_tardanza: record.minutos_tardanza || 0
        } : {
          estado: '-',
          asistio: 'NO',
          hora_entrada: null,
          hora_salida: null,
          minutos_tardanza: 0
        };
      });

      rows.push(row);
    }

    res.json({
      success: true,
      mes: mesParam,
      personal: personalList.map(p => ({
        id: p.id,
        nombreCorto: p.nombres, // Ej: "Kevin Antony"
        nombreCompleto: p.nombre_completo
      })),
      filas: rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getByDate = async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    let personalList = [];
    let asistencias = [];

    if (db.isLiveDB()) {
      personalList = await db.query('SELECT * FROM personal WHERE estado = "ACTIVO" ORDER BY id ASC');
      asistencias = await db.query(
        'SELECT * FROM asistencias WHERE fecha = ?',
        [fecha]
      );
    } else {
      const store = db.getMemoryStore();
      personalList = store.personal;
      asistencias = store.asistencias.filter(a => a.fecha === fecha);
    }

    const asisMap = {};
    asistencias.forEach(a => {
      asisMap[a.personal_id] = a;
    });

    const resultado = personalList.map((p, index) => {
      const reg = asisMap[p.id];
      return {
        numero: index + 1,
        personal_id: p.id,
        nombre_completo: p.nombre_completo,
        asistio: reg ? reg.asistio : 'NO',
        estado: reg ? reg.estado : 'F',
        hora_entrada: reg ? (reg.hora_entrada || '') : '',
        hora_salida: reg ? (reg.hora_salida || '') : '',
        minutos_tardanza: reg ? (reg.minutos_tardanza || 0) : 0
      };
    });

    res.json({
      success: true,
      fecha,
      fechaFormateada: formatDDMMYYYY(fecha),
      personal: resultado
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.saveDia = async (req, res) => {
  try {
    const { fecha, registros } = req.body;
    if (!fecha || !Array.isArray(registros)) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    if (db.isLiveDB()) {
      for (const r of registros) {
        // Calcular si es tardanza automáticamente si asistio='SI' y hora_entrada > hora_regular
        let estado = r.asistio === 'SI' ? 'P' : 'F';
        let tardanzaMin = 0;

        if (r.asistio === 'SI' && r.hora_entrada) {
          const [h, m] = r.hora_entrada.split(':').map(Number);
          const minutosEntrada = h * 60 + m;
          const minutosRegular = 7 * 60 + 30; // 07:30:00
          if (minutosEntrada > minutosRegular) {
            estado = 'T';
            tardanzaMin = minutosEntrada - minutosRegular;
          }
        }

        await db.query(`
          INSERT INTO asistencias (personal_id, fecha, asistio, estado, hora_entrada, hora_salida, minutos_tardanza)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            asistio = VALUES(asistio),
            estado = VALUES(estado),
            hora_entrada = VALUES(hora_entrada),
            hora_salida = VALUES(hora_salida),
            minutos_tardanza = VALUES(minutos_tardanza)
        `, [
          r.personal_id,
          fecha,
          r.asistio,
          r.estado || estado,
          r.hora_entrada || null,
          r.hora_salida || null,
          r.minutos_tardanza !== undefined ? r.minutos_tardanza : tardanzaMin
        ]);
      }
    } else {
      const store = db.getMemoryStore();
      for (const r of registros) {
        let estado = r.asistio === 'SI' ? 'P' : 'F';
        let tardanzaMin = 0;

        if (r.asistio === 'SI' && r.hora_entrada) {
          const [h, m] = r.hora_entrada.split(':').map(Number);
          const minutosEntrada = h * 60 + m;
          const minutosRegular = 7 * 60 + 30;
          if (minutosEntrada > minutosRegular) {
            estado = 'T';
            tardanzaMin = minutosEntrada - minutosRegular;
          }
        }

        const idx = store.asistencias.findIndex(a => a.personal_id === r.personal_id && a.fecha === fecha);
        const dataToSave = {
          id: idx >= 0 ? store.asistencias[idx].id : store.asistencias.length + 1,
          personal_id: r.personal_id,
          fecha,
          asistio: r.asistio,
          estado: r.estado || estado,
          hora_entrada: r.hora_entrada || null,
          hora_salida: r.hora_salida || null,
          minutos_tardanza: r.minutos_tardanza !== undefined ? r.minutos_tardanza : tardanzaMin,
          observaciones: ''
        };

        if (idx >= 0) {
          store.asistencias[idx] = dataToSave;
        } else {
          store.asistencias.push(dataToSave);
        }
      }
    }

    res.json({ success: true, message: 'Asistencia registrada correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getIndividual = async (req, res) => {
  try {
    const { personal_id, fecha } = req.query;
    if (!personal_id || !fecha) {
      return res.status(400).json({ success: false, error: 'personal_id y fecha requeridos.' });
    }

    let record = null;
    let personal = null;

    if (db.isLiveDB()) {
      const [p] = await db.query('SELECT * FROM personal WHERE id = ?', [personal_id]);
      personal = p;
      const [a] = await db.query(
        'SELECT id, personal_id, DATE_FORMAT(fecha, "%Y-%m-%d") as fecha, asistio, estado, hora_entrada, hora_salida, minutos_tardanza, observaciones FROM asistencias WHERE personal_id = ? AND fecha = ?',
        [personal_id, fecha]
      );
      record = a;
    } else {
      const store = db.getMemoryStore();
      personal = store.personal.find(p => p.id === parseInt(personal_id, 10));
      record = store.asistencias.find(a => a.personal_id === parseInt(personal_id, 10) && a.fecha === fecha);
    }

    res.json({
      success: true,
      personal,
      data: record || {
        personal_id: parseInt(personal_id, 10),
        fecha,
        asistio: 'NO',
        estado: '-',
        hora_entrada: null,
        hora_salida: null,
        minutos_tardanza: 0,
        observaciones: ''
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.saveIndividual = async (req, res) => {
  try {
    const { personal_id, fecha, estado, hora_entrada, hora_salida, observaciones } = req.body;

    if (!personal_id || !fecha) {
      return res.status(400).json({ success: false, error: 'personal_id y fecha son obligatorios.' });
    }

    let finalEstado = estado || 'P';
    let asistio = (finalEstado === 'P' || finalEstado === 'T') ? 'SI' : 'NO';
    let minutosTardanza = 0;
    let finalHoraEntrada = hora_entrada || null;
    let finalHoraSalida = hora_salida || null;

    if (finalEstado === 'F' || finalEstado === '-') {
      asistio = 'NO';
      finalHoraEntrada = null;
      finalHoraSalida = null;
      minutosTardanza = 0;
    } else {
      // Si asiste o llega tarde
      if (finalHoraEntrada) {
        const [h, m] = finalHoraEntrada.split(':').map(Number);
        const minutosEntrada = (h || 0) * 60 + (m || 0);
        const minutosRegular = 7 * 60 + 30; // 07:30 regular
        if (minutosEntrada > minutosRegular) {
          finalEstado = 'T';
          minutosTardanza = minutosEntrada - minutosRegular;
        } else {
          finalEstado = 'P';
          minutosTardanza = 0;
        }
      } else if (finalEstado === 'T') {
        finalHoraEntrada = '08:15:00';
        minutosTardanza = 45;
      } else if (finalEstado === 'P') {
        finalHoraEntrada = '07:25:00';
        minutosTardanza = 0;
      }

      if (!finalHoraSalida) {
        finalHoraSalida = '16:30:00';
      }
    }

    if (db.isLiveDB()) {
      await db.query(`
        INSERT INTO asistencias (personal_id, fecha, asistio, estado, hora_entrada, hora_salida, minutos_tardanza, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          asistio = VALUES(asistio),
          estado = VALUES(estado),
          hora_entrada = VALUES(hora_entrada),
          hora_salida = VALUES(hora_salida),
          minutos_tardanza = VALUES(minutos_tardanza),
          observaciones = VALUES(observaciones)
      `, [personal_id, fecha, asistio, finalEstado, finalHoraEntrada, finalHoraSalida, minutosTardanza, observaciones || '']);
    } else {
      const store = db.getMemoryStore();
      const pId = parseInt(personal_id, 10);
      const idx = store.asistencias.findIndex(a => a.personal_id === pId && a.fecha === fecha);
      const item = {
        id: idx >= 0 ? store.asistencias[idx].id : store.asistencias.length + 1,
        personal_id: pId,
        fecha,
        asistio,
        estado: finalEstado,
        hora_entrada: finalHoraEntrada,
        hora_salida: finalHoraSalida,
        minutos_tardanza: minutosTardanza,
        observaciones: observaciones || ''
      };

      if (idx >= 0) {
        store.asistencias[idx] = item;
      } else {
        store.asistencias.push(item);
      }
    }

    res.json({
      success: true,
      message: 'Registro de asistencia actualizado correctamente.',
      data: {
        personal_id,
        fecha,
        estado: finalEstado,
        minutos_tardanza: minutosTardanza,
        hora_entrada: finalHoraEntrada,
        hora_salida: finalHoraSalida
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteIndividual = async (req, res) => {
  try {
    const { personal_id, fecha } = req.body;
    if (!personal_id || !fecha) {
      return res.status(400).json({ success: false, error: 'personal_id y fecha requeridos.' });
    }

    if (db.isLiveDB()) {
      await db.query('DELETE FROM asistencias WHERE personal_id = ? AND fecha = ?', [personal_id, fecha]);
    } else {
      const store = db.getMemoryStore();
      const pId = parseInt(personal_id, 10);
      store.asistencias = store.asistencias.filter(a => !(a.personal_id === pId && a.fecha === fecha));
    }

    res.json({ success: true, message: 'Registro de asistencia eliminado.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getReporteData = async (req, res) => {
  try {
    const mesParam = req.query.mes || '2026-10'; // YYYY-MM
    const [yearStr, monthStr] = mesParam.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const mesesNombres = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const periodoNombre = `${mesesNombres[month - 1]} ${year}`;

    let personalList = [];
    let asistencias = [];
    let adelantos = [];

    if (db.isLiveDB()) {
      personalList = await db.query('SELECT * FROM personal WHERE estado = "ACTIVO" ORDER BY id ASC');
      asistencias = await db.query(
        'SELECT personal_id, DATE_FORMAT(fecha, "%Y-%m-%d") as fecha, asistio, estado, hora_entrada, hora_salida, minutos_tardanza FROM asistencias WHERE DATE_FORMAT(fecha, "%Y-%m") = ? ORDER BY fecha ASC',
        [mesParam]
      );
      try {
        adelantos = await db.query(
          `SELECT a.id, a.personal_id, p.nombre_completo, a.monto, DATE_FORMAT(a.fecha, "%d/%m/%Y") as fecha_fmt, a.fecha 
           FROM adelantos a 
           JOIN personal p ON p.id = a.personal_id 
           WHERE DATE_FORMAT(a.fecha, "%Y-%m") = ?
           ORDER BY a.id ASC`,
          [mesParam]
        );
        if (!adelantos || adelantos.length === 0) {
          adelantos = await db.query(
            `SELECT a.id, a.personal_id, p.nombre_completo, a.monto, DATE_FORMAT(a.fecha, "%d/%m/%Y") as fecha_fmt, a.fecha 
             FROM adelantos a 
             JOIN personal p ON p.id = a.personal_id 
             ORDER BY a.id ASC`
          );
        }
      } catch (e) {
        adelantos = [];
      }
    } else {
      const store = db.getMemoryStore();
      personalList = store.personal;
      asistencias = store.asistencias.filter(a => a.fecha.startsWith(mesParam));
      adelantos = [
        { id: 1, personal_id: 5, nombre_completo: 'Edwin Lorenzo Machaca Chuquimamani', monto: 500, fecha_fmt: '15 de septiembre' },
        { id: 2, personal_id: 4, nombre_completo: 'Jerry Jose Lopez Mansilla', monto: 300, fecha_fmt: '15 de septiembre' },
        { id: 3, personal_id: 1, nombre_completo: 'Kevin Antony Aratea Mamani', monto: 300, fecha_fmt: '15 de septiembre' },
        { id: 4, personal_id: 6, nombre_completo: 'Brayam Luther Machaca Flores', monto: 400, fecha_fmt: '15 de septiembre' }
      ];
    }

    if (!adelantos || adelantos.length === 0) {
      adelantos = [
        { id: 1, personal_id: 5, nombre_completo: 'Edwin Lorenzo Machaca Chuquimamani', monto: 500, fecha_fmt: '15 de septiembre' },
        { id: 2, personal_id: 4, nombre_completo: 'Jerry Jose Lopez Mansilla', monto: 300, fecha_fmt: '15 de septiembre' },
        { id: 3, personal_id: 1, nombre_completo: 'Kevin Antony Aratea Mamani', monto: 300, fecha_fmt: '15 de septiembre' },
        { id: 4, personal_id: 6, nombre_completo: 'Brayam Luther Machaca Flores', monto: 400, fecha_fmt: '15 de septiembre' }
      ];
    }

    // Indexar asistencias
    const asisArrayMap = {};
    const tardanzasMap = {};
    const faltasMap = {};

    personalList.forEach(p => {
      tardanzasMap[p.id] = [];
      faltasMap[p.id] = [];
    });

    asistencias.forEach(a => {
      const key = `${a.fecha}_${a.personal_id}`;
      asisArrayMap[key] = a;

      if (a.estado === 'T') {
        if (!tardanzasMap[a.personal_id]) tardanzasMap[a.personal_id] = [];
        tardanzasMap[a.personal_id].push(a);
      } else if (a.estado === 'F') {
        if (!faltasMap[a.personal_id]) faltasMap[a.personal_id] = [];
        faltasMap[a.personal_id].push(a);
      }
    });

    const rows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayPad = String(d).padStart(2, '0');
      const fechaISO = `${mesParam}-${dayPad}`;
      const fechaFormat = `${dayPad}/${monthStr}/${yearStr}`;
      const dayOfWeek = diasSemana[new Date(year, month - 1, d).getDay()];

      const row = {
        numero: d,
        fecha: fechaFormat,
        fechaISO: fechaISO,
        dia: dayOfWeek,
        esDomingo: dayOfWeek === 'DOM',
        empleados: {}
      };

      personalList.forEach(p => {
        const key = `${fechaISO}_${p.id}`;
        const record = asisArrayMap[key];
        row.empleados[p.id] = record ? {
          estado: record.estado || '-',
          minutos_tardanza: record.minutos_tardanza || 0
        } : {
          estado: '-',
          minutos_tardanza: 0
        };
      });

      rows.push(row);
    }

    // Resumen de Tardanzas
    const resumenTardanzas = [];
    personalList.forEach((p, idx) => {
      const lista = tardanzasMap[p.id] || [];
      if (lista.length > 0) {
        const totalMin = lista.reduce((acc, cur) => acc + (cur.minutos_tardanza || 0), 0);
        const totalHoras = (totalMin / 60).toFixed(2);
        resumenTardanzas.push({
          num: resumenTardanzas.length + 1,
          personal_id: p.id,
          colaborador: p.nombre_completo,
          cantidad: lista.length,
          total_minutos: `${totalMin} min`,
          total_horas: `${totalHoras} h`
        });
      }
    });

    // Resumen de Faltas
    const resumenFaltas = [];
    personalList.forEach((p, idx) => {
      const lista = faltasMap[p.id] || [];
      if (lista.length > 0) {
        const diasList = lista.map(item => formatDDMMYYYY(item.fecha));
        resumenFaltas.push({
          num: resumenFaltas.length + 1,
          personal_id: p.id,
          colaborador: p.nombre_completo,
          total_faltas: lista.length,
          dias_texto: diasList.join(', ')
        });
      }
    });

    // Adelantos
    let totalMontoAdelantos = 0;
    const adelantosList = adelantos.map((ad, idx) => {
      const montoNum = parseFloat(ad.monto) || 0;
      totalMontoAdelantos += montoNum;
      return {
        num: idx + 1,
        colaborador: ad.nombre_completo,
        monto_texto: `S/ ${montoNum.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        fecha_texto: ad.fecha_fmt || '15 de septiembre'
      };
    });

    const now = new Date();
    const fechaEmision = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    res.json({
      success: true,
      metadatos: {
        periodo: periodoNombre,
        rangoFechas: `01/${monthStr}/${yearStr} al ${String(daysInMonth).padStart(2, '0')}/${monthStr}/${yearStr}`,
        horarioOficial: '07:30 Entrada · 16:30 Salida',
        totalColaboradores: `${personalList.length} Registrados`,
        fechaEmision
      },
      personal: personalList.map(p => ({
        id: p.id,
        nombreCorto: p.nombres,
        nombreCompleto: p.nombre_completo.toUpperCase()
      })),
      filas: rows,
      resumenTardanzas,
      resumenFaltas,
      adelantos: {
        items: adelantosList,
        total_texto: `S/ ${totalMontoAdelantos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
