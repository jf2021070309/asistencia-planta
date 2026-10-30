const db = require('../db');

function formatDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const mesesNombres = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function formatFechaEspanol(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const dia = parseInt(parts[2], 10);
    const mesIdx = parseInt(parts[1], 10) - 1;
    return `${dia} de ${mesesNombres[mesIdx] || ''}`;
  }
  return dateStr;
}

exports.getAll = async (req, res) => {
  try {
    const mesParam = req.query.mes; // Opcional: YYYY-MM
    let adelantos = [];

    if (db.isLiveDB()) {
      let sql = `
        SELECT a.id, a.personal_id, p.nombre_completo, p.nombres, p.apellidos,
               DATE_FORMAT(a.fecha, "%Y-%m-%d") as fecha, 
               a.monto, a.observaciones, a.created_at
        FROM adelantos a
        JOIN personal p ON p.id = a.personal_id
      `;
      const params = [];

      if (mesParam) {
        sql += ` WHERE DATE_FORMAT(a.fecha, "%Y-%m") = ?`;
        params.push(mesParam);
      }
      sql += ` ORDER BY a.fecha DESC, a.id DESC`;

      adelantos = await db.query(sql, params);
    } else {
      const store = db.getMemoryStore();
      const memAdelantos = store.adelantos || [];
      adelantos = memAdelantos.map(ad => {
        const p = store.personal.find(item => item.id === ad.personal_id) || {};
        return {
          id: ad.id,
          personal_id: ad.personal_id,
          nombre_completo: p.nombre_completo || ad.nombre_completo || 'Colaborador',
          nombres: p.nombres || '',
          apellidos: p.apellidos || '',
          fecha: ad.fecha,
          monto: ad.monto,
          observaciones: ad.observaciones || ''
        };
      });

      if (mesParam) {
        adelantos = adelantos.filter(ad => ad.fecha && ad.fecha.startsWith(mesParam));
      }
    }

    let totalMonto = 0;
    const listaFormateada = adelantos.map((ad, idx) => {
      const montoNum = parseFloat(ad.monto) || 0;
      totalMonto += montoNum;
      return {
        id: ad.id,
        num: idx + 1,
        personal_id: ad.personal_id,
        colaborador: ad.nombre_completo,
        fecha: ad.fecha,
        fecha_formateada: formatDDMMYYYY(ad.fecha),
        fecha_texto: formatFechaEspanol(ad.fecha),
        monto: montoNum,
        monto_texto: `S/ ${montoNum.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        observaciones: ad.observaciones || ''
      };
    });

    res.json({
      success: true,
      mes: mesParam || 'todos',
      total_items: listaFormateada.length,
      total_monto: totalMonto,
      total_monto_texto: `S/ ${totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      data: listaFormateada
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { personal_id, fecha, monto, observaciones } = req.body;

    if (!personal_id || !fecha || !monto) {
      return res.status(400).json({ success: false, error: 'personal_id, fecha y monto son obligatorios.' });
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ success: false, error: 'El monto debe ser un número positivo.' });
    }

    if (db.isLiveDB()) {
      const result = await db.query(
        'INSERT INTO adelantos (personal_id, fecha, monto, observaciones) VALUES (?, ?, ?, ?)',
        [personal_id, fecha, montoNum, observaciones || '']
      );
      res.json({ success: true, message: 'Adelanto registrado exitosamente.', id: result.insertId });
    } else {
      const store = db.getMemoryStore();
      if (!store.adelantos) store.adelantos = [];
      const newId = store.adelantos.length > 0 ? Math.max(...store.adelantos.map(a => a.id)) + 1 : 1;
      const nuevo = {
        id: newId,
        personal_id: parseInt(personal_id, 10),
        fecha,
        monto: montoNum,
        observaciones: observaciones || ''
      };
      store.adelantos.push(nuevo);
      res.json({ success: true, message: 'Adelanto registrado exitosamente.', id: newId });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { personal_id, fecha, monto, observaciones } = req.body;

    if (!personal_id || !fecha || !monto) {
      return res.status(400).json({ success: false, error: 'personal_id, fecha y monto son obligatorios.' });
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ success: false, error: 'El monto debe ser un número positivo.' });
    }

    if (db.isLiveDB()) {
      await db.query(
        'UPDATE adelantos SET personal_id = ?, fecha = ?, monto = ?, observaciones = ? WHERE id = ?',
        [personal_id, fecha, montoNum, observaciones || '', id]
      );
      res.json({ success: true, message: 'Adelanto actualizado exitosamente.' });
    } else {
      const store = db.getMemoryStore();
      const idx = (store.adelantos || []).findIndex(a => a.id === parseInt(id, 10));
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Adelanto no encontrado.' });
      }
      store.adelantos[idx] = {
        ...store.adelantos[idx],
        personal_id: parseInt(personal_id, 10),
        fecha,
        monto: montoNum,
        observaciones: observaciones || ''
      };
      res.json({ success: true, message: 'Adelanto actualizado exitosamente.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (db.isLiveDB()) {
      await db.query('DELETE FROM adelantos WHERE id = ?', [id]);
      res.json({ success: true, message: 'Adelanto eliminado correctamente.' });
    } else {
      const store = db.getMemoryStore();
      store.adelantos = (store.adelantos || []).filter(a => a.id !== parseInt(id, 10));
      res.json({ success: true, message: 'Adelanto eliminado correctamente.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
