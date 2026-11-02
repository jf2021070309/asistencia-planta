// ==============================================================================
// SURGAS - MÓDULO DE ESQUELAS DE DESPACHO
// ==============================================================================

function getSafeCurrentDate() {
  if (window.getCurrentDate) return window.getCurrentDate();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function initNuevaEsquelaForm() {
  const correlativoEl = document.getElementById('esquela-correlativo-text');
  const choferSelect = document.getElementById('esquela-chofer-select');
  const placaSelect = document.getElementById('esquela-placa-select');
  const fechaInput = document.getElementById('esquela-fecha-input');

  if (fechaInput && !fechaInput.value) {
    fechaInput.value = getSafeCurrentDate();
  }

  // 1. Obtener siguiente correlativo
  try {
    const resCorr = await fetch('/api/esquelas/siguiente-correlativo');
    const jsonCorr = await resCorr.json();
    if (jsonCorr.success && correlativoEl) {
      correlativoEl.innerText = `Correlativo: ${jsonCorr.correlativo}`;
    }
  } catch (err) {
    console.error('Error correlativo:', err);
  }

  // 2. Obtener choferes
  try {
    const resChof = await fetch('/api/personal/choferes');
    const jsonChof = await resChof.json();
    if (jsonChof.success && choferSelect) {
      let optHtml = `<option value="">-- Selecciona un chofer --</option>`;
      jsonChof.data.forEach(c => {
        optHtml += `<option value="${c.id}">${c.nombre_completo}</option>`;
      });
      choferSelect.innerHTML = optHtml;
    }
  } catch (err) {
    console.error('Error choferes:', err);
  }

  // 3. Obtener vehículos
  try {
    const resVeh = await fetch('/api/vehiculos');
    const jsonVeh = await resVeh.json();
    if (jsonVeh.success && placaSelect) {
      let optHtml = `<option value="">-- Selecciona una placa --</option>`;
      jsonVeh.data.forEach(v => {
        optHtml += `<option value="${v.id}">${v.placa} (${v.marca || ''} ${v.modelo || ''})</option>`;
      });
      placaSelect.innerHTML = optHtml;
    }
  } catch (err) {
    console.error('Error vehiculos:', err);
  }
}

async function guardarEsquela() {
  const fecha = document.getElementById('esquela-fecha-input').value;
  const chofer_id = document.getElementById('esquela-chofer-select').value;
  const vehiculo_id = document.getElementById('esquela-placa-select').value;
  const hora_salida = document.getElementById('esquela-hora-salida').value;
  const hora_llegada = document.getElementById('esquela-hora-llegada').value;
  const observaciones = document.getElementById('esquela-observaciones').value;

  // Balones Llenos
  const llenos_10kg = document.getElementById('esq-llenos-10').value || 0;
  const llenos_45kg = document.getElementById('esq-llenos-45').value || 0;
  const llenos_5kg = document.getElementById('esq-llenos-5').value || 0;

  // Dev. Cambios Salida
  const cambios_salida_5kg = document.getElementById('esq-csal-5').value || 0;
  const cambios_salida_10kg = document.getElementById('esq-csal-10').value || 0;
  const cambios_salida_45kg = document.getElementById('esq-csal-45').value || 0;

  // Balones Vacíos
  const vacios_10kg = document.getElementById('esq-vac-10').value || 0;
  const vacios_45kg = document.getElementById('esq-vac-45').value || 0;
  const vacios_5kg = document.getElementById('esq-vac-5').value || 0;

  // Dev. Cambios Ingreso
  const cambios_ingreso_5kg = document.getElementById('esq-cing-5').value || 0;
  const cambios_ingreso_10kg = document.getElementById('esq-cing-10').value || 0;
  const cambios_ingreso_45kg = document.getElementById('esq-cing-45').value || 0;

  const btnGuardar = document.getElementById('btn-guardar-esquela');
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.innerText = 'Guardando...';
  }

  try {
    const res = await fetch('/api/esquelas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha,
        chofer_id,
        vehiculo_id,
        hora_salida,
        hora_llegada,
        observaciones,
        llenos_10kg,
        llenos_45kg,
        llenos_5kg,
        cambios_salida_5kg,
        cambios_salida_10kg,
        cambios_salida_45kg,
        vacios_10kg,
        vacios_45kg,
        vacios_5kg,
        cambios_ingreso_5kg,
        cambios_ingreso_10kg,
        cambios_ingreso_45kg
      })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al guardar');

    window.showToast(`Esquela ${json.correlativo} registrada exitosamente`, 'success');

    // Limpiar formulario y recargar
    document.getElementById('form-nueva-esquela').reset();
    initNuevaEsquelaForm();

    if (window.loadDashboard) window.loadDashboard();
    // Redirigir a listado de esquelas
    setTimeout(() => {
      window.navigateTo('esquelas');
    }, 1000);
  } catch (err) {
    console.error('Error guardando esquela:', err);
    window.showToast('Error al guardar esquela: ' + err.message, 'error');
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.innerText = 'Guardar Esquela';
    }
  }
}

async function loadEsquelas() {
  const tbody = document.getElementById('esquelas-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #64748b;">Cargando esquelas...</td></tr>`;

  try {
    const res = await fetch('/api/esquelas');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    if (json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #64748b;">No hay esquelas registradas aún.</td></tr>`;
      return;
    }

    let trHtml = '';
    json.data.forEach(e => {
      const totalSalida = (e.llenos_10kg || 0) + (e.llenos_45kg || 0) + (e.llenos_5kg || 0);
      const totalRetorno = (e.vacios_10kg || 0) + (e.vacios_45kg || 0) + (e.vacios_5kg || 0);

      trHtml += `
        <tr>
          <td><span style="font-weight: 700; color: #1e293b;">${e.correlativo}</span></td>
          <td>${e.fechaFormateada}</td>
          <td>${e.chofer_nombre || 'N/A'}</td>
          <td><span style="font-weight: 600; color: #0284c7;">${e.vehiculo_placa || 'N/A'}</span></td>
          <td>${e.hora_salida ? e.hora_salida.slice(0, 5) : '--:--'}</td>
          <td>${e.hora_llegada ? e.hora_llegada.slice(0, 5) : '--:--'}</td>
          <td>
            <span style="background: #ecfdf5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-weight: 600;">
              ${totalSalida} balones
            </span>
          </td>
          <td>
            <span style="background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 4px; font-weight: 600;">
              ${totalRetorno} vacíos
            </span>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = trHtml;
  } catch (err) {
    console.error('Error cargando esquelas:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #ef4444;">Error: ${err.message}</td></tr>`;
  }
}

window.initNuevaEsquelaForm = initNuevaEsquelaForm;
window.guardarEsquela = guardarEsquela;
window.loadEsquelas = loadEsquelas;
