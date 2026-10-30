const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    if (db.isLiveDB()) {
      const rows = await db.query('SELECT * FROM personal WHERE estado = "ACTIVO" ORDER BY id ASC');
      return res.json({ success: true, data: rows });
    }
    const store = db.getMemoryStore();
    return res.json({ success: true, data: store.personal });
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
    const choferes = store.personal.filter(p => p.es_chofer === 1);
    return res.json({ success: true, data: choferes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
