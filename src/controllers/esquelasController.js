const db = require('../db');

function formatDDMMYYYY(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

exports.getVehiculos = async (req, res) => {
  try {
    if (db.isLiveDB()) {
      const rows = await db.query('SELECT * FROM vehiculos WHERE estado = "ACTIVO" ORDER BY placa ASC');
      return res.json({ success: true, data: rows });
    }
    const store = db.getMemoryStore();
    return res.json({ success: true, data: store.vehiculos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSiguienteCorrelativo = async (req, res) => {
  try {
    let nextNum = 1;
    if (db.isLiveDB()) {
      const rows = await db.query('SELECT correlativo FROM esquelas ORDER BY id DESC LIMIT 1');
      if (rows.length > 0 && rows[0].correlativo) {
        const match = rows[0].correlativo.match(/\d+/);
        if (match) {
          nextNum = parseInt(match[0], 10) + 1;
        }
      }
    } else {
      const store = db.getMemoryStore();
      if (store.esquelas.length > 0) {
        const last = store.esquelas[store.esquelas.length - 1];
        const match = last.correlativo.match(/\d+/);
        if (match) {
          nextNum = parseInt(match[0], 10) + 1;
        }
      }
    }

    const correlativo = `ESQ-${String(nextNum).padStart(3, '0')}`;
    res.json({ success: true, correlativo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    if (db.isLiveDB()) {
      const rows = await db.query(`
        SELECT 
          e.*, 
          DATE_FORMAT(e.fecha, "%Y-%m-%d") as fecha_iso,
          p.nombre_completo as chofer_nombre,
          v.placa as vehiculo_placa
        FROM esquelas e
        LEFT JOIN personal p ON e.chofer_id = p.id
        LEFT JOIN vehiculos v ON e.vehiculo_id = v.id
        ORDER BY e.id DESC
      `);
      return res.json({
        success: true,
        data: rows.map(r => ({
          ...r,
          fechaFormateada: formatDDMMYYYY(r.fecha_iso || r.fecha)
        }))
      });
    }

    const store = db.getMemoryStore();
    const rows = store.esquelas.slice().reverse().map(e => {
      const chofer = store.personal.find(p => p.id === Number(e.chofer_id));
      const vehiculo = store.vehiculos.find(v => v.id === Number(e.vehiculo_id));
      return {
        ...e,
        chofer_nombre: chofer ? chofer.nombre_completo : 'Sin chofer',
        vehiculo_placa: vehiculo ? vehiculo.placa : 'Sin placa',
        fechaFormateada: formatDDMMYYYY(e.fecha)
      };
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      fecha,
      chofer_id,
      vehiculo_id,
      hora_salida,
      hora_llegada,
      observaciones,
      llenos_10kg,
      llenos_45kg,
      llenos_5kg,
      cambios_salida_5kg,
      cambios_salida_10kg,
      cambios_salida_45kg,
      vacios_10kg,
      vacios_45kg,
      vacios_5kg,
      cambios_ingreso_5kg,
      cambios_ingreso_10kg,
      cambios_ingreso_45kg
    } = req.body;

    // Obtener siguiente correlativo
    let nextNum = 1;
    if (db.isLiveDB()) {
      const rows = await db.query('SELECT correlativo FROM esquelas ORDER BY id DESC LIMIT 1');
      if (rows.length > 0 && rows[0].correlativo) {
        const match = rows[0].correlativo.match(/\d+/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }
      const correlativo = `ESQ-${String(nextNum).padStart(3, '0')}`;

      const result = await db.query(`
        INSERT INTO esquelas (
          correlativo, fecha, chofer_id, vehiculo_id, hora_salida, hora_llegada, observaciones,
          llenos_10kg, llenos_45kg, llenos_5kg,
          cambios_salida_5kg, cambios_salida_10kg, cambios_salida_45kg,
          vacios_10kg, vacios_45kg, vacios_5kg,
          cambios_ingreso_5kg, cambios_ingreso_10kg, cambios_ingreso_45kg
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        correlativo,
        fecha || new Date().toISOString().slice(0, 10),
        chofer_id || null,
        vehiculo_id || null,
        hora_salida || null,
        hora_llegada || null,
        observaciones || '',
        llenos_10kg || 0,
        llenos_45kg || 0,
        llenos_5kg || 0,
        cambios_salida_5kg || 0,
        cambios_salida_10kg || 0,
        cambios_salida_45kg || 0,
        vacios_10kg || 0,
        vacios_45kg || 0,
        vacios_5kg || 0,
        cambios_ingreso_5kg || 0,
        cambios_ingreso_10kg || 0,
        cambios_ingreso_45kg || 0
      ]);

      return res.json({ success: true, correlativo, id: result.insertId, message: 'Esquela registrada con éxito.' });
    }

    const store = db.getMemoryStore();
    if (store.esquelas.length > 0) {
      const last = store.esquelas[store.esquelas.length - 1];
      const match = last.correlativo.match(/\d+/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const correlativo = `ESQ-${String(nextNum).padStart(3, '0')}`;

    const nuevaEsquela = {
      id: store.esquelas.length + 1,
      correlativo,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      chofer_id: chofer_id ? Number(chofer_id) : null,
      vehiculo_id: vehiculo_id ? Number(vehiculo_id) : null,
      hora_salida: hora_salida || null,
      hora_llegada: hora_llegada || null,
      observaciones: observaciones || '',
      llenos_10kg: Number(llenos_10kg) || 0,
      llenos_45kg: Number(llenos_45kg) || 0,
      llenos_5kg: Number(llenos_5kg) || 0,
      cambios_salida_5kg: Number(cambios_salida_5kg) || 0,
      cambios_salida_10kg: Number(cambios_salida_10kg) || 0,
      cambios_salida_45kg: Number(cambios_salida_45kg) || 0,
      vacios_10kg: Number(vacios_10kg) || 0,
      vacios_45kg: Number(vacios_45kg) || 0,
      vacios_5kg: Number(vacios_5kg) || 0,
      cambios_ingreso_5kg: Number(cambios_ingreso_5kg) || 0,
      cambios_ingreso_10kg: Number(cambios_ingreso_10kg) || 0,
      cambios_ingreso_45kg: Number(cambios_ingreso_45kg) || 0,
      estado: 'COMPLETADO',
      created_at: new Date()
    };

    store.esquelas.push(nuevaEsquela);
    res.json({ success: true, correlativo, id: nuevaEsquela.id, message: 'Esquela registrada con éxito.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
