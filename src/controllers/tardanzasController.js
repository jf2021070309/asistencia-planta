const db = require('../db');

function formatDDMMYYYY(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getCurrentMonthPeru() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

exports.getResumen = async (req, res) => {
  try {
    const mesParam = req.query.mes || getCurrentMonthPeru(); // YYYY-MM
    let personalList = [];
    let tardanzas = [];

    if (db.isLiveDB()) {
      personalList = await db.query('SELECT * FROM personal WHERE estado = "ACTIVO" ORDER BY apellidos ASC');
      tardanzas = await db.query(`
        SELECT 
          a.id, a.personal_id, 
          DATE_FORMAT(a.fecha, "%Y-%m-%d") as fecha, 
          a.hora_entrada, a.hora_salida, a.minutos_tardanza
        FROM asistencias a
        WHERE a.estado = 'T' AND DATE_FORMAT(a.fecha, "%Y-%m") = ?
        ORDER BY a.fecha ASC
      `, [mesParam]);
    } else {
      const store = db.getMemoryStore();
      personalList = store.personal;
      tardanzas = store.asistencias.filter(a => a.estado === 'T' && a.fecha.startsWith(mesParam));
    }

    // Agrupar tardanzas por empleado
    const tardanzasPorEmpleado = {};
    tardanzas.forEach(t => {
      if (!tardanzasPorEmpleado[t.personal_id]) {
        tardanzasPorEmpleado[t.personal_id] = [];
      }
      tardanzasPorEmpleado[t.personal_id].push(t);
    });

    const resumen = [];
    personalList.forEach(p => {
      const lista = tardanzasPorEmpleado[p.id] || [];
      if (lista.length > 0) {
        const totalMinutos = lista.reduce((sum, item) => sum + (item.minutos_tardanza || 0), 0);
        const horas = Math.floor(totalMinutos / 60);
        const minRestantes = totalMinutos % 60;
        const equivalente = horas > 0 ? `${horas}h ${minRestantes}min` : `${minRestantes}min`;

        resumen.push({
          personal_id: p.id,
          avatar: p.apellidos.charAt(0).toUpperCase(),
          nombre_completo: p.nombre_completo,
          total_tardanzas: lista.length,
          total_minutos: totalMinutos,
          equivalente_horas: equivalente,
          detalle: lista.map(item => ({
            fecha: formatDDMMYYYY(item.fecha),
            fechaISO: item.fecha,
            hora_entrada: item.hora_entrada || '08:00:00',
            hora_salida: item.hora_salida || '16:30:00',
            minutos: item.minutos_tardanza || 0,
            tardanza_badge: `${item.minutos_tardanza || 0} min · ${item.minutos_tardanza || 0}min`
          }))
        });
      }
    });

    res.json({
      success: true,
      mes: mesParam,
      total_empleados_con_tardanza: resumen.length,
      resumen
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
