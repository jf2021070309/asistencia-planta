// ==============================================================================
// SURGAS - MÓDULO MATRIZ DE ASISTENCIAS (CON CRUD Y EDICIÓN INTERACTIVA)
// ==============================================================================

let currentMatrixData = null;
let currentEditingPersonal = null;

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
    let thHtml = `<tr><th style="width: 100px;">Fecha</th>`;
    json.personal.forEach(p => {
      thHtml += `<th title="${p.nombreCompleto}">${p.nombreCorto}</th>`;
    });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;

    // Filas
    let trHtml = '';
    json.filas.forEach(f => {
      trHtml += `<tr>`;
      trHtml += `<td style="font-weight: 500; color: #1e293b;">${f.fecha}</td>`;

      json.personal.forEach(p => {
        const emp = f.empleados[p.id];
        const estado = emp ? emp.estado : '-';
        const minTardanza = emp ? emp.minutos_tardanza : 0;

        let badgeClass = 'dash';
        let titleTooltip = `${p.nombreCorto} - ${f.fecha}: `;
        if (estado === 'P') {
          badgeClass = 'p';
          titleTooltip += 'Presente (Clic para modificar)';
        } else if (estado === 'F') {
          badgeClass = 'f';
          titleTooltip += 'Falta (Clic para modificar)';
        } else if (estado === 'T') {
          badgeClass = 't';
          titleTooltip += `Tardanza (+${minTardanza} min) - Clic para modificar`;
        } else {
          titleTooltip += 'Descanso / Sin registrar (Clic para registrar)';
        }

        trHtml += `
          <td class="matrix-cell-interactive" 
              title="${titleTooltip}"
              onclick="openModalEditarAsistencia(${p.id}, '${f.fechaISO}', '${p.nombreCorto}')">
            <span class="badge-status ${badgeClass}">
              ${estado}
              ${estado === 'T' && minTardanza ? `<small style="font-size: 8px; margin-left: 2px;">+${minTardanza}m</small>` : ''}
            </span>
          </td>
        `;
      });
      trHtml += `</tr>`;
    });

    tbody.innerHTML = trHtml;
  } catch (err) {
    console.error('Error cargando matriz:', err);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: #ef4444;">Error al cargar la matriz: ${err.message}</td></tr>`;
  }
}

// ==============================================================================
// MODAL DE EDICIÓN DE ASISTENCIA INDIVIDUAL
// ==============================================================================

async function openModalEditarAsistencia(personalId, fechaISO, nombreCorto = '') {
  try {
    const res = await fetch(`/api/asistencias/individual?personal_id=${personalId}&fecha=${fechaISO}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const data = json.data;
    const personal = json.personal || { nombre_completo: nombreCorto };
    currentEditingPersonal = personal;

    document.getElementById('edit-asistencia-personal-id').value = personalId;
    document.getElementById('edit-asistencia-fecha').value = fechaISO;

    const fechaParts = fechaISO.split('-');
    const fechaFmt = `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;
    document.getElementById('modal-asistencia-sub').textContent = `${personal.nombre_completo} • ${fechaFmt}`;

    // Seleccionar radio de estado
    const estado = data.estado || '-';
    const radio = document.querySelector(`input[name="edit-estado"][value="${estado}"]`);
    if (radio) radio.checked = true;

    // Horas
    const horaEntradaInput = document.getElementById('edit-hora-entrada');
    const horaSalidaInput = document.getElementById('edit-hora-salida');
    const obsInput = document.getElementById('edit-asistencia-obs');

    horaEntradaInput.value = data.hora_entrada ? data.hora_entrada.slice(0, 5) : (estado === 'P' ? '07:25' : (estado === 'T' ? '08:15' : ''));
    horaSalidaInput.value = data.hora_salida ? data.hora_salida.slice(0, 5) : '16:30';
    obsInput.value = data.observaciones || '';

    handleEstadoChange(estado);
    recalcularTardanzaEnModal();

    const modal = document.getElementById('modal-editar-asistencia');
    if (modal) modal.classList.add('active');
  } catch (err) {
    console.error('Error abriendo modal de asistencia:', err);
    if (window.showToast) window.showToast('Error: ' + err.message, 'error');
  }
}

function closeModalEditarAsistencia() {
  const modal = document.getElementById('modal-editar-asistencia');
  if (modal) modal.classList.remove('active');
}

function handleEstadoChange(estado) {
  const bloqueHorarios = document.getElementById('bloque-horarios');
  const horaEntrada = document.getElementById('edit-hora-entrada');
  const horaSalida = document.getElementById('edit-hora-salida');

  if (estado === 'F' || estado === '-') {
    bloqueHorarios.style.opacity = '0.5';
    horaEntrada.disabled = true;
    horaSalida.disabled = true;
    document.getElementById('indicador-tardanza').style.display = 'none';
  } else {
    bloqueHorarios.style.opacity = '1';
    horaEntrada.disabled = false;
    horaSalida.disabled = false;

    if (estado === 'P' && (!horaEntrada.value || horaEntrada.value > '07:30')) {
      horaEntrada.value = '07:25';
    } else if (estado === 'T' && (!horaEntrada.value || horaEntrada.value <= '07:30')) {
      horaEntrada.value = '08:15';
    }

    recalcularTardanzaEnModal();
  }
}

function recalcularTardanzaEnModal() {
  const estadoRadio = document.querySelector('input[name="edit-estado"]:checked');
  const estadoVal = estadoRadio ? estadoRadio.value : 'P';
  if (estadoVal === 'F' || estadoVal === '-') return;

  const horaEntrada = document.getElementById('edit-hora-entrada').value;
  const indicador = document.getElementById('indicador-tardanza');
  const textoMinutos = document.getElementById('texto-minutos-tardanza');

  if (!horaEntrada) {
    indicador.style.display = 'none';
    return;
  }

  const [h, m] = horaEntrada.split(':').map(Number);
  const entradaMin = (h || 0) * 60 + (m || 0);
  const regularMin = 7 * 60 + 30; // 07:30 = 450 min

  if (entradaMin > regularMin) {
    const diff = entradaMin - regularMin;
    indicador.style.display = 'flex';
    textoMinutos.textContent = `Tardanza detectada: +${diff} min (Entrada después de las 07:30)`;

    // Auto-marcar radio T si no estaba
    const radioT = document.querySelector('input[name="edit-estado"][value="T"]');
    if (radioT) radioT.checked = true;
  } else {
    indicador.style.display = 'none';
    const radioP = document.querySelector('input[name="edit-estado"][value="P"]');
    if (radioP && estadoVal === 'T') radioP.checked = true;
  }
}

async function guardarAsistenciaIndividual(event) {
  event.preventDefault();

  const personal_id = document.getElementById('edit-asistencia-personal-id').value;
  const fecha = document.getElementById('edit-asistencia-fecha').value;
  const estadoRadio = document.querySelector('input[name="edit-estado"]:checked');
  const estado = estadoRadio ? estadoRadio.value : 'P';
  const hora_entrada = document.getElementById('edit-hora-entrada').value;
  const hora_salida = document.getElementById('edit-hora-salida').value;
  const observaciones = document.getElementById('edit-asistencia-obs').value;

  try {
    const res = await fetch('/api/asistencias/individual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personal_id,
        fecha,
        estado,
        hora_entrada: hora_entrada ? `${hora_entrada}:00` : null,
        hora_salida: hora_salida ? `${hora_salida}:00` : null,
        observaciones
      })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    if (window.showToast) {
      window.showToast(json.message || 'Asistencia actualizada correctamente', 'success');
    }

    closeModalEditarAsistencia();
    await loadAsistenciasMatrix();
  } catch (err) {
    console.error('Error guardando asistencia individual:', err);
    if (window.showToast) {
      window.showToast('Error: ' + err.message, 'error');
    } else {
      alert('Error: ' + err.message);
    }
  }
}

async function eliminarAsistenciaIndividual() {
  const personal_id = document.getElementById('edit-asistencia-personal-id').value;
  const fecha = document.getElementById('edit-asistencia-fecha').value;

  if (!confirm('¿Deseas restablecer este registro a condición de Descanso (-)?')) {
    return;
  }

  try {
    const res = await fetch('/api/asistencias/individual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personal_id,
        fecha,
        estado: '-',
        hora_entrada: null,
        hora_salida: null,
        observaciones: ''
      })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    if (window.showToast) {
      window.showToast('Registro restablecido', 'info');
    }

    closeModalEditarAsistencia();
    await loadAsistenciasMatrix();
  } catch (err) {
    console.error('Error al restablecer:', err);
    if (window.showToast) window.showToast('Error: ' + err.message, 'error');
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
window.openModalEditarAsistencia = openModalEditarAsistencia;
window.closeModalEditarAsistencia = closeModalEditarAsistencia;
window.handleEstadoChange = handleEstadoChange;
window.recalcularTardanzaEnModal = recalcularTardanzaEnModal;
window.guardarAsistenciaIndividual = guardarAsistenciaIndividual;
window.eliminarAsistenciaIndividual = eliminarAsistenciaIndividual;
