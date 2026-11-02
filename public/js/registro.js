// ==============================================================================
// SURGAS - MÓDULO REGISTRAR ASISTENCIA (PASAR LISTA)
// ==============================================================================

let currentRegistroDate = null;
let currentPersonalRegistros = [];

function getSafeCurrentDate() {
  if (window.getCurrentDate) return window.getCurrentDate();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadRegistroAsistencia(fecha) {
  const dateInput = document.getElementById('registro-fecha-input');
  const fallbackDate = getSafeCurrentDate();
  if (dateInput && !dateInput.value) {
    dateInput.value = fallbackDate;
  }
  const targetDate = fecha || (dateInput && dateInput.value ? dateInput.value : fallbackDate);
  currentRegistroDate = targetDate;
  if (dateInput) dateInput.value = targetDate;

  const tbody = document.getElementById('registro-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #64748b;">Cargando personal...</td></tr>`;

  try {
    const res = await fetch(`/api/asistencias/dia?fecha=${targetDate}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentPersonalRegistros = json.personal;

    let trHtml = '';
    json.personal.forEach((p, idx) => {
      const isSi = p.asistio === 'SI';
      trHtml += `
        <tr data-emp-id="${p.personal_id}">
          <td style="font-weight: 600; color: #64748b; width: 40px;">${p.numero}</td>
          <td>
            <div style="font-weight: 600; color: #1e293b;">${p.nombre_completo}</div>
          </td>
          <td style="width: 140px;">
            <div class="toggle-group">
              <button type="button" class="btn-toggle ${isSi ? 'active-si' : ''}" onclick="toggleAsistencia(${p.personal_id}, 'SI')">SI</button>
              <button type="button" class="btn-toggle ${!isSi ? 'active-no' : ''}" onclick="toggleAsistencia(${p.personal_id}, 'NO')">NO</button>
            </div>
          </td>
          <td style="width: 180px;">
            <input 
              type="time" 
              class="form-control input-hora-entrada" 
              value="${p.hora_entrada ? p.hora_entrada.slice(0, 5) : (isSi ? '07:30' : '')}"
              ${!isSi ? 'disabled style="background-color: #f8fafc; opacity: 0.6;"' : ''}
              onchange="handleHoraChange(${p.personal_id})"
            />
          </td>
          <td style="width: 180px;">
            <input 
              type="time" 
              class="form-control input-hora-salida" 
              value="${p.hora_salida ? p.hora_salida.slice(0, 5) : (isSi ? '16:30' : '')}"
              ${!isSi ? 'disabled style="background-color: #f8fafc; opacity: 0.6;"' : ''}
              onchange="handleHoraChange(${p.personal_id})"
            />
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = trHtml;
  } catch (err) {
    console.error('Error cargando registro de asistencia:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #ef4444;">Error: ${err.message}</td></tr>`;
  }
}

function toggleAsistencia(empId, estado) {
  const emp = currentPersonalRegistros.find(p => p.personal_id === empId);
  if (!emp) return;

  emp.asistio = estado;
  if (estado === 'SI') {
    if (!emp.hora_entrada) emp.hora_entrada = '07:30';
    if (!emp.hora_salida) emp.hora_salida = '16:30';
  }

  const row = document.querySelector(`tr[data-emp-id="${empId}"]`);
  if (!row) return;

  const btnSi = row.querySelector('.btn-toggle:first-child');
  const btnNo = row.querySelector('.btn-toggle:last-child');
  const inEntrada = row.querySelector('.input-hora-entrada');
  const inSalida = row.querySelector('.input-hora-salida');

  if (estado === 'SI') {
    btnSi.classList.add('active-si');
    btnNo.classList.remove('active-no');
    inEntrada.disabled = false;
    inSalida.disabled = false;
    inEntrada.style.backgroundColor = '#ffffff';
    inEntrada.style.opacity = '1';
    inSalida.style.backgroundColor = '#ffffff';
    inSalida.style.opacity = '1';
    if (!inEntrada.value) inEntrada.value = '07:30';
    if (!inSalida.value) inSalida.value = '16:30';
  } else {
    btnSi.classList.remove('active-si');
    btnNo.classList.add('active-no');
    inEntrada.disabled = true;
    inSalida.disabled = true;
    inEntrada.style.backgroundColor = '#f8fafc';
    inEntrada.style.opacity = '0.6';
    inSalida.style.backgroundColor = '#f8fafc';
    inSalida.style.opacity = '0.6';
  }
}

function handleHoraChange(empId) {
  const row = document.querySelector(`tr[data-emp-id="${empId}"]`);
  if (!row) return;

  const inEntrada = row.querySelector('.input-hora-entrada');
  const inSalida = row.querySelector('.input-hora-salida');
  const emp = currentPersonalRegistros.find(p => p.personal_id === empId);
  if (emp) {
    emp.hora_entrada = inEntrada.value;
    emp.hora_salida = inSalida.value;
  }
}

async function guardarAsistenciaDia() {
  const btnGuardar = document.getElementById('btn-guardar-asistencia');
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.innerText = 'Guardando...';
  }

  try {
    const registros = currentPersonalRegistros.map(emp => {
      const row = document.querySelector(`tr[data-emp-id="${emp.personal_id}"]`);
      const inEntrada = row ? row.querySelector('.input-hora-entrada') : null;
      const inSalida = row ? row.querySelector('.input-hora-salida') : null;

      const horaEntrada = inEntrada && inEntrada.value ? inEntrada.value + ':00' : null;
      const horaSalida = inSalida && inSalida.value ? inSalida.value + ':00' : null;

      return {
        personal_id: emp.personal_id,
        asistio: emp.asistio,
        hora_entrada: emp.asistio === 'SI' ? horaEntrada : null,
        hora_salida: emp.asistio === 'SI' ? horaSalida : null
      };
    });

    const res = await fetch('/api/asistencias/dia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: currentRegistroDate,
        registros
      })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Error guardando asistencia');

    window.showToast('Asistencia guardada correctamente', 'success');

    // Recargar datos en segundo plano
    if (window.loadDashboard) window.loadDashboard();
    if (window.loadAsistenciasMatrix) window.loadAsistenciasMatrix();
  } catch (err) {
    console.error('Error guardando asistencia:', err);
    window.showToast('Error al guardar asistencia: ' + err.message, 'error');
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.innerText = 'Guardar asistencia';
    }
  }
}

window.loadRegistroAsistencia = loadRegistroAsistencia;
window.toggleAsistencia = toggleAsistencia;
window.handleHoraChange = handleHoraChange;
window.guardarAsistenciaDia = guardarAsistenciaDia;
