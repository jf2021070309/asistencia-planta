// ==============================================================================
// SURGAS - MÓDULO MATRIZ DE ASISTENCIAS
// ==============================================================================

let currentMatrixData = null;

async function loadAsistenciasMatrix(mes) {
  const mesInput = document.getElementById('asistencia-mes-picker');
  const targetMes = mes || (mesInput ? mesInput.value : '2026-10');

  const thead = document.getElementById('matrix-thead');
  const tbody = document.getElementById('matrix-tbody');
  if (!tbody || !thead) return;

  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: #64748b;">Cargando matriz de asistencias...</td></tr>`;

  try {
    const res = await fetch(`/api/asistencias/matriz?mes=${targetMes}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentMatrixData = json;

    // Encabezados
    let thHtml = `<tr><th>Fecha</th>`;
    json.personal.forEach(p => {
      thHtml += `<th>${p.nombreCorto}</th>`;
    });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;

    // Filas
    let trHtml = '';
    json.filas.forEach(f => {
      trHtml += `<tr>`;
      trHtml += `<td>${f.fecha}</td>`;
      json.personal.forEach(p => {
        const emp = f.empleados[p.id];
        const estado = emp ? emp.estado : '-';
        let badgeClass = 'dash';
        if (estado === 'P') badgeClass = 'p';
        else if (estado === 'F') badgeClass = 'f';
        else if (estado === 'T') badgeClass = 't';

        trHtml += `<td><span class="badge-status ${badgeClass}">${estado}</span></td>`;
      });
      trHtml += `</tr>`;
    });

    tbody.innerHTML = trHtml;
  } catch (err) {
    console.error('Error cargando matriz:', err);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: #ef4444;">Error al cargar la matriz: ${err.message}</td></tr>`;
  }
}

function handleExportExcel() {
  const mesInput = document.getElementById('asistencia-mes-picker');
  const targetMes = mesInput ? mesInput.value : (currentMatrixData ? currentMatrixData.mes : '2026-10');
  window.SURGAS_EXPORT.exportarMatrizExcel(targetMes);
}

function handleExportPDF() {
  const mesInput = document.getElementById('asistencia-mes-picker');
  const targetMes = mesInput ? mesInput.value : (currentMatrixData ? currentMatrixData.mes : '2026-10');
  window.SURGAS_EXPORT.exportarReportePDF(targetMes);
}

window.loadAsistenciasMatrix = loadAsistenciasMatrix;
window.handleExportExcel = handleExportExcel;
window.handleExportPDF = handleExportPDF;
