const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const incluirTodos = req.query.todos === 'true';
    if (db.isLiveDB()) {
      const sql = incluirTodos
        ? 'SELECT * FROM personal ORDER BY id ASC'
        : 'SELECT * FROM personal WHERE estado = "ACTIVO" ORDER BY id ASC';
      const rows = await db.query(sql);
      return res.json({ success: true, data: rows });
    }
    const store = db.getMemoryStore();
    const rows = incluirTodos
      ? store.personal
      : store.personal.filter(p => p.estado === 'ACTIVO');
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (db.isLiveDB()) {
      const rows = await db.query('SELECT * FROM personal WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Colaborador no encontrado' });
      }
      return res.json({ success: true, data: rows[0] });
    }
    const store = db.getMemoryStore();
    const item = store.personal.find(p => p.id === id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Colaborador no encontrado' });
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getChoferes = async (req, res) => {
  try {
    if (db.isLiveDB()) {
      const rows = await db.query('SELECT id, codigo, nombre_completo, cargo FROM personal WHERE es_chofer = 1 AND estado = "ACTIVO" ORDER BY id ASC');
      return res.json({ success: true, data: rows });
    }
    const store = db.getMemoryStore();
    const choferes = store.personal.filter(p => p.es_chofer === 1 && p.estado === 'ACTIVO');
    return res.json({ success: true, data: choferes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      dni = '',
      cargo = 'Operario de Planta',
      hora_entrada_regular = '07:30:00',
      hora_salida_regular = '16:30:00',
      es_chofer = 0,
      estado = 'ACTIVO'
    } = req.body;

    if (!nombres || !apellidos) {
      return res.status(400).json({ success: false, message: 'Nombres y apellidos son obligatorios' });
    }

    const nombre_completo = `${apellidos.trim()}, ${nombres.trim()}`;
    const choferVal = (es_chofer === 1 || es_chofer === '1' || es_chofer === true) ? 1 : 0;
    const estadoVal = (estado || 'ACTIVO').toUpperCase();

    let codigo = req.body.codigo;
    if (!codigo) {
      // Auto-generar código PER-XXX
      if (db.isLiveDB()) {
        const rows = await db.query('SELECT MAX(id) as maxId FROM personal');
        const nextId = (rows[0]?.maxId || 0) + 1;
        codigo = `PER-${String(nextId).padStart(3, '0')}`;
      } else {
        const store = db.getMemoryStore();
        const nextId = store.personal.length + 1;
        codigo = `PER-${String(nextId).padStart(3, '0')}`;
      }
    }

    if (db.isLiveDB()) {
      const result = await db.query(
        `INSERT INTO personal 
         (codigo, nombres, apellidos, nombre_completo, dni, cargo, hora_entrada_regular, hora_salida_regular, es_chofer, estado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, nombres.trim(), apellidos.trim(), nombre_completo, dni.trim(), cargo.trim(), hora_entrada_regular, hora_salida_regular, choferVal, estadoVal]
      );
      return res.status(201).json({
        success: true,
        message: 'Colaborador creado exitosamente',
        id: result.insertId,
        codigo,
        nombre_completo
      });
    }

    const store = db.getMemoryStore();
    const newId = store.personal.length > 0 ? Math.max(...store.personal.map(p => p.id)) + 1 : 1;
    const newPersonal = {
      id: newId,
      codigo,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      nombre_completo,
      dni: dni.trim(),
      cargo: cargo.trim(),
      hora_entrada_regular,
      hora_salida_regular,
      minutos_tolerancia: 0,
      es_chofer: choferVal,
      estado: estadoVal
    };
    store.personal.push(newPersonal);

    return res.status(201).json({
      success: true,
      message: 'Colaborador creado exitosamente',
      id: newId,
      codigo,
      nombre_completo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      codigo,
      nombres,
      apellidos,
      dni,
      cargo,
      hora_entrada_regular,
      hora_salida_regular,
      es_chofer,
      estado
    } = req.body;

    if (!nombres || !apellidos) {
      return res.status(400).json({ success: false, message: 'Nombres y apellidos son obligatorios' });
    }

    const nombre_completo = `${apellidos.trim()}, ${nombres.trim()}`;
    const choferVal = (es_chofer === 1 || es_chofer === '1' || es_chofer === true) ? 1 : 0;
    const estadoVal = (estado || 'ACTIVO').toUpperCase();

    if (db.isLiveDB()) {
      await db.query(
        `UPDATE personal 
         SET codigo = COALESCE(?, codigo),
             nombres = ?,
             apellidos = ?,
             nombre_completo = ?,
             dni = ?,
             cargo = ?,
             hora_entrada_regular = ?,
             hora_salida_regular = ?,
             es_chofer = ?,
             estado = ?
         WHERE id = ?`,
        [codigo || null, nombres.trim(), apellidos.trim(), nombre_completo, dni || '', cargo || 'Operario de Planta', hora_entrada_regular || '07:30:00', hora_salida_regular || '16:30:00', choferVal, estadoVal, id]
      );
      return res.json({ success: true, message: 'Colaborador actualizado exitosamente' });
    }

    const store = db.getMemoryStore();
    const idx = store.personal.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Colaborador no encontrado' });
    }

    store.personal[idx] = {
      ...store.personal[idx],
      codigo: codigo || store.personal[idx].codigo,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      nombre_completo,
      dni: dni || '',
      cargo: cargo || 'Operario de Planta',
      hora_entrada_regular: hora_entrada_regular || '07:30:00',
      hora_salida_regular: hora_salida_regular || '16:30:00',
      es_chofer: choferVal,
      estado: estadoVal
    };

    return res.json({ success: true, message: 'Colaborador actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const permanente = req.query.permanente === 'true';

    if (db.isLiveDB()) {
      if (permanente) {
        try {
          await db.query('DELETE FROM personal WHERE id = ?', [id]);
          return res.json({ success: true, message: 'Colaborador eliminado definitivamente' });
        } catch (e) {
          // Si tiene referencias foráneas, cambiar a inactivo
          await db.query('UPDATE personal SET estado = "INACTIVO" WHERE id = ?', [id]);
          return res.json({ success: true, message: 'El colaborador tiene registros históricos y fue marcado como INACTIVO' });
        }
      } else {
        await db.query('UPDATE personal SET estado = "INACTIVO" WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Colaborador marcado como INACTIVO' });
      }
    }

    const store = db.getMemoryStore();
    const idx = store.personal.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Colaborador no encontrado' });
    }

    if (permanente) {
      store.personal.splice(idx, 1);
      return res.json({ success: true, message: 'Colaborador eliminado definitivamente' });
    } else {
      store.personal[idx].estado = 'INACTIVO';
      return res.json({ success: true, message: 'Colaborador marcado como INACTIVO' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
