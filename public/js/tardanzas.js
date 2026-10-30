// ==============================================================================
// SURGAS - MÓDULO DE TARDANZAS
// ==============================================================================

async function loadTardanzas(mes) {
  const mesInput = document.getElementById('tardanza-mes-picker');
  const targetMes = mes || (mesInput ? mesInput.value : '2026-10');

  const container = document.getElementById('tardanzas-container');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding: 2rem; color: #64748b;">Cargando resumen de tardanzas...</div>`;

  try {
    const res = await fetch(`/api/tardanzas/resumen?mes=${targetMes}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    if (json.resumen.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 2.5rem; text-align: center; color: #64748b;">
          <svg style="width: 48px; height: 48px; margin-bottom: 0.75rem; color: #10b981;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">Sin tardanzas registradas</h3>
          <p>No se encontraron registros de tardanza para el mes seleccionado (${targetMes}).</p>
        </div>
      `;
      return;
    }

    let cardsHtml = '';
    json.resumen.forEach(emp => {
      let rowsHtml = '';
      emp.detalle.forEach(d => {
        rowsHtml += `
          <tr>
            <td>${d.fecha}</td>
            <td>${d.hora_entrada}</td>
            <td>${d.hora_salida}</td>
            <td>
              <span class="badge-clock-tardanza">
                <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${d.tardanza_badge}
              </span>
            </td>
          </tr>
        `;
      });

      cardsHtml += `
        <div class="tardanza-card">
          <div class="tardanza-header">
            <div class="tardanza-user-info">
              <div class="avatar-circle">${emp.avatar}</div>
              <div class="tardanza-user-meta">
                <h3>${emp.nombre_completo}</h3>
                <p>${emp.total_tardanzas} tardanzas registradas este mes</p>
              </div>
            </div>
            <div class="tardanza-stats">
              <div class="tardanza-stat-item">
                <div class="stat-label">Total Minutos</div>
                <div class="stat-val">${emp.total_minutos} min</div>
              </div>
              <div class="tardanza-stat-item">
                <div class="stat-label">Equivalente</div>
                <div class="stat-val">${emp.equivalente_horas}</div>
              </div>
            </div>
          </div>
          <table class="tardanza-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora entrada</th>
                <th>Hora salida</th>
                <th>Tardanza</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="tardanza-table-footer">
            <span>Total del mes</span>
            <span class="badge-total-pill">${emp.total_minutos} min · ${emp.equivalente_horas}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = cardsHtml;
  } catch (err) {
    console.error('Error al cargar tardanzas:', err);
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: #ef4444;">Error: ${err.message}</div>`;
  }
}

window.loadTardanzas = loadTardanzas;
