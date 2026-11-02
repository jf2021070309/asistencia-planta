const db = require('../db');

function formatDDMMYYYY(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getCurrentDatePeru() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

exports.getKpis = async (req, res) => {
  try {
    const today = getCurrentDatePeru();
    const fechaHoyFormateada = formatDDMMYYYY(today);

    if (db.isLiveDB()) {
      const [personalCount] = await db.query('SELECT COUNT(*) as count FROM personal WHERE estado = "ACTIVO"');
      const [asistieronCount] = await db.query('SELECT COUNT(*) as count FROM asistencias WHERE fecha = ? AND asistio = "SI"', [today]);
      const [esquelasCount] = await db.query('SELECT COUNT(*) as count FROM esquelas WHERE fecha = ? AND estado != "ANULADO"', [today]);

      return res.json({
        success: true,
        data: {
          personal_registrado: personalCount ? personalCount.count : 0,
          asistieron_hoy: asistieronCount ? asistieronCount.count : 0,
          esquelas_hoy: esquelasCount ? esquelasCount.count : 0,
          fecha_hoy: fechaHoyFormateada,
          fecha_iso: today
        }
      });
    }

    const store = db.getMemoryStore();
    const personalRegistrado = store.personal.filter(p => p.estado === 'ACTIVO').length;
    const asistieronHoy = store.asistencias.filter(a => a.fecha === today && a.asistio === 'SI').length;
    const esquelasHoy = store.esquelas.filter(e => e.fecha === today && e.estado !== 'ANULADO').length;

    res.json({
      success: true,
      data: {
        personal_registrado: personalRegistrado,
        asistieron_hoy: asistieronHoy,
        esquelas_hoy: esquelasHoy,
        fecha_hoy: fechaHoyFormateada,
        fecha_iso: today
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
