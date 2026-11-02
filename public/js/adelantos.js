// ==============================================================================
// SURGAS - MÓDULO DE ADELANTOS DE DINERO (CRUD COMPLETO)
// ==============================================================================

let adelantosCache = [];
let personalListCache = [];

async function fetchPersonalParaAdelantos(force = false) {
  if (!force && personalListCache.length > 0) return personalListCache;
  try {
    const res = await fetch('/api/personal');
    const json = await res.json();
    if (json.success) {
      personalListCache = json.data;
    }
  } catch (err) {
    console.error('Error cargando personal para adelantos:', err);
  }
  return personalListCache;
}

function getSafeCurrentMonth() {
  if (window.getCurrentMonth) return window.getCurrentMonth();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function loadAdelantos(mes) {
  const mesInput = document.getElementById('adelanto-mes-picker');
  const fallbackMes = getSafeCurrentMonth();
  if (mes === undefined && mesInput && !mesInput.value) {
    mesInput.value = fallbackMes;
  }
  let targetMes = mes !== undefined ? mes : (mesInput && mesInput.value ? mesInput.value : fallbackMes);
  if (mesInput && mes !== undefined) {
    mesInput.value = mes;
  }

  const tbody = document.getElementById('adelantos-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">Cargando adelantos de dinero...</td></tr>`;

  try {
    const url = targetMes ? `/api/adelantos?mes=${targetMes}` : '/api/adelantos';
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    adelantosCache = json.data || [];

    // Actualizar KPIs
    const kpiTotal = document.getElementById('adelantos-kpi-total');
    const kpiCant = document.getElementById('adelantos-kpi-cantidad');
    const kpiProm = document.getElementById('adelantos-kpi-promedio');

    const totalNum = json.total_monto || 0;
    const cantNum = json.total_items || 0;
    const promNum = cantNum > 0 ? totalNum / cantNum : 0;

    if (kpiTotal) kpiTotal.textContent = json.total_monto_texto || 'S/ 0.00';
    if (kpiCant) kpiCant.textContent = cantNum;
    if (kpiProm) kpiProm.textContent = `S/ ${promNum.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (adelantosCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: #64748b;">
            <svg style="width: 42px; height: 42px; margin-bottom: 0.5rem; color: #cbd5e1;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div style="font-weight: 600; color: #1e293b;">No hay adelantos registrados</div>
            <div style="font-size: 0.85rem;">Para el período seleccionado no se encontraron registros de adelantos.</div>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    adelantosCache.forEach(ad => {
      rowsHtml += `
        <tr>
          <td style="text-align: center; font-weight: 600; color: #64748b;">${ad.num}</td>
          <td style="font-weight: 600; color: #0f172a; padding-left: 1rem;">${ad.colaborador}</td>
          <td style="text-align: center; font-weight: 700; color: #006837;">${ad.monto_texto}</td>
          <td style="text-align: center; font-weight: 500;">${ad.fecha_texto || ad.fecha_formateada}</td>
          <td style="color: #64748b; font-size: 0.85rem;">${ad.observaciones || '-'}</td>
          <td style="text-align: center;">
            <button type="button" class="btn-icon" title="Editar adelanto" onclick="openModalEditarAdelanto(${ad.id})">
              <svg style="width: 15px; height: 15px; color: #2563eb;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-icon-danger" title="Eliminar adelanto" onclick="eliminarAdelanto(${ad.id})">
              <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    });

    // Fila totalizadora al pie
    rowsHtml += `
      <tr class="adelantos-total-row">
        <td colspan="2" style="text-align: right; font-weight: 800; font-size: 0.92rem; color: #0f172a;">Total de adelantos</td>
        <td style="text-align: center; font-weight: 800; font-size: 0.95rem; color: #006837;">${json.total_monto_texto}</td>
        <td colspan="3"></td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error('Error cargando adelantos:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #ef4444;">Error al cargar adelantos: ${err.message}</td></tr>`;
  }
}

async function poblarSelectColaboradores(selectedId = null) {
  const select = document.getElementById('adelanto-personal-select');
  if (!select) return;

  const personal = await fetchPersonalParaAdelantos(true);
  let options = '<option value="">-- Seleccionar Colaborador --</option>';
  personal.forEach(p => {
    const isSel = selectedId && parseInt(selectedId, 10) === p.id ? 'selected' : '';
    options += `<option value="${p.id}" ${isSel}>${p.nombre_completo} (${p.cargo})</option>`;
  });
  select.innerHTML = options;
}

async function openModalCrearAdelanto() {
  document.getElementById('modal-adelanto-title').textContent = 'Registrar Adelanto de Dinero';
  document.getElementById('adelanto-id').value = '';
  document.getElementById('adelanto-monto-input').value = '';
  document.getElementById('adelanto-obs-input').value = '';

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  document.getElementById('adelanto-fecha-input').value = `${yyyy}-${mm}-${dd}`;

  await poblarSelectColaboradores();

  const modal = document.getElementById('modal-adelanto');
  if (modal) modal.classList.add('active');
}

async function openModalEditarAdelanto(id) {
  const item = adelantosCache.find(a => a.id === id);
  if (!item) return;

  document.getElementById('modal-adelanto-title').textContent = 'Editar Adelanto de Dinero';
  document.getElementById('adelanto-id').value = item.id;
  document.getElementById('adelanto-monto-input').value = item.monto;
  document.getElementById('adelanto-fecha-input').value = item.fecha ? item.fecha.slice(0, 10) : '';
  document.getElementById('adelanto-obs-input').value = item.observaciones || '';

  await poblarSelectColaboradores(item.personal_id);

  const modal = document.getElementById('modal-adelanto');
  if (modal) modal.classList.add('active');
}

function closeModalAdelanto() {
  const modal = document.getElementById('modal-adelanto');
  if (modal) modal.classList.remove('active');
}

async function guardarAdelanto(event) {
  event.preventDefault();

  const id = document.getElementById('adelanto-id').value;
  const personal_id = document.getElementById('adelanto-personal-select').value;
  const monto = document.getElementById('adelanto-monto-input').value;
  const fecha = document.getElementById('adelanto-fecha-input').value;
  const observaciones = document.getElementById('adelanto-obs-input').value;

  if (!personal_id || !monto || !fecha) {
    if (window.showToast) window.showToast('Por favor completa los campos obligatorios', 'error');
    return;
  }

  try {
    const isEdit = !!id;
    const url = isEdit ? `/api/adelantos/${id}` : '/api/adelantos';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personal_id, monto, fecha, observaciones })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    if (window.showToast) {
      window.showToast(json.message || 'Adelanto guardado exitosamente', 'success');
    }

    closeModalAdelanto();
    await loadAdelantos();
  } catch (err) {
    console.error('Error guardando adelanto:', err);
    if (window.showToast) {
      window.showToast('Error: ' + err.message, 'error');
    } else {
      alert('Error al guardar adelanto: ' + err.message);
    }
  }
}

async function eliminarAdelanto(id) {
  if (typeof Swal !== 'undefined') {
    const res = await Swal.fire({
      title: '¿Eliminar adelanto?',
      text: '¿Estás seguro de que deseas eliminar este adelanto de dinero?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    });
    if (!res.isConfirmed) return;
  } else if (!confirm('¿Estás seguro de que deseas eliminar este adelanto de dinero?')) {
    return;
  }

  try {
    const res = await fetch(`/api/adelantos/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    if (window.showToast) {
      window.showToast('Adelanto eliminado correctamente', 'success');
    }

    await loadAdelantos();
  } catch (err) {
    console.error('Error eliminando adelanto:', err);
    if (window.showToast) {
      window.showToast('Error al eliminar: ' + err.message, 'error');
    }
  }
}

// Exportar funciones globales
window.loadAdelantos = loadAdelantos;
window.openModalCrearAdelanto = openModalCrearAdelanto;
window.openModalEditarAdelanto = openModalEditarAdelanto;
window.closeModalAdelanto = closeModalAdelanto;
window.guardarAdelanto = guardarAdelanto;
window.eliminarAdelanto = eliminarAdelanto;

