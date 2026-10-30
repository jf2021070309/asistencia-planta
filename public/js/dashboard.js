// ==============================================================================
// SURGAS - MÓDULO DEL DASHBOARD
// ==============================================================================

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/kpis');
    const json = await res.json();
    if (json.success) {
      const data = json.data;
      document.getElementById('kpi-personal').innerText = data.personal_registrado;
      document.getElementById('kpi-asistieron').innerText = data.asistieron_hoy;
      document.getElementById('kpi-esquelas').innerText = data.esquelas_hoy;
      document.getElementById('kpi-fecha').innerText = data.fecha_hoy;
    }
  } catch (err) {
    console.error('Error cargando KPIs:', err);
  }
}

window.loadDashboard = loadDashboard;
