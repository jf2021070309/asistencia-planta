// ==============================================================================
// SURGAS - MÓDULO DE GESTIÓN DE PERSONAL (CRUD COMPLETO)
// ==============================================================================

let personalCache = [];

async function loadPersonal() {
  const tbody = document.getElementById('personal-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: #64748b;">Cargando colaboradores...</td></tr>`;

  try {
    const res = await fetch('/api/personal?todos=true');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    personalCache = json.data || [];
    renderPersonalTable(personalCache);
    updatePersonalKPIs(personalCache);
  } catch (err) {
    console.error('Error cargando personal:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #ef4444;">Error al cargar personal: ${err.message}</td></tr>`;
  }
}

function updatePersonalKPIs(list) {
  const kpiTotal = document.getElementById('kpi-personal-total');
  const kpiActivos = document.getElementById('kpi-personal-activos');
  const kpiChoferes = document.getElementById('kpi-personal-choferes');

  const total = list.length;
  const activos = list.filter(p => p.estado === 'ACTIVO').length;
  const choferes = list.filter(p => (p.es_chofer === 1 || p.es_chofer === '1') && p.estado === 'ACTIVO').length;

  if (kpiTotal) kpiTotal.textContent = total;
  if (kpiActivos) kpiActivos.textContent = activos;
  if (kpiChoferes) kpiChoferes.textContent = choferes;
}

function renderPersonalTable(list) {
  const tbody = document.getElementById('personal-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: #64748b;">
          No se encontraron colaboradores registrados.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  list.forEach((p, idx) => {
    const esActivo = p.estado === 'ACTIVO';
    const estadoBadge = esActivo
      ? `<span class="badge" style="background-color: #dcfce7; color: #15803d; font-weight: 600; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">ACTIVO</span>`
      : `<span class="badge" style="background-color: #fee2e2; color: #b91c1c; font-weight: 600; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">INACTIVO</span>`;

    const choferBadge = (p.es_chofer === 1 || p.es_chofer === '1')
      ? `<span style="display: inline-flex; align-items: center; gap: 4px; color: #0284c7; font-weight: 600; font-size: 0.8rem;">🚛 Chofer</span>`
      : `<span style="color: #64748b; font-size: 0.8rem;">🏭 Planta</span>`;

    const horaEntrada = p.hora_entrada_regular ? p.hora_entrada_regular.slice(0, 5) : '07:30';
    const horaSalida = p.hora_salida_regular ? p.hora_salida_regular.slice(0, 5) : '16:30';

    html += `
      <tr style="${!esActivo ? 'opacity: 0.6; background-color: #f8fafc;' : ''}">
        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
        <td>
          <span style="font-family: monospace; font-weight: 700; color: #0f172a; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
            ${p.codigo || 'PER-000'}
          </span>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">${p.nombre_completo || (p.apellidos + ', ' + p.nombres)}</div>
          <div style="font-size: 0.8rem; color: #64748b;">
            ${p.cargo || 'Operario'} · DNI: <b>${p.dni || 'No registrado'}</b>
          </div>
        </td>
        <td>${choferBadge}</td>
        <td style="font-size: 0.85rem; color: #334155;">
          ${horaEntrada} - ${horaSalida}
        </td>
        <td>${estadoBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; margin-right: 4px;" onclick="openModalEditarPersonal(${p.id})" title="Editar datos">
            ✏️ Editar
          </button>
          ${esActivo ? `
            <button type="button" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #e11d48; border-color: #fecdd3;" onclick="toggleEstadoPersonal(${p.id}, 'INACTIVO')" title="Inactivar colaborador">
              Inactivar
            </button>
          ` : `
            <button type="button" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #16a34a; border-color: #bbf7d0;" onclick="toggleEstadoPersonal(${p.id}, 'ACTIVO')" title="Reactivar colaborador">
              Reactivar
            </button>
          `}
          <button type="button" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #94a3b8; border-color: #e2e8f0;" onclick="eliminarPersonalPermanente(${p.id})" title="Eliminar definitivamente">
            🗑️
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function filtrarPersonal(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderPersonalTable(personalCache);
    return;
  }
  const filtrados = personalCache.filter(p => {
    const nombre = (p.nombre_completo || '').toLowerCase();
    const dni = (p.dni || '').toLowerCase();
    const cargo = (p.cargo || '').toLowerCase();
    const codigo = (p.codigo || '').toLowerCase();
    return nombre.includes(q) || dni.includes(q) || cargo.includes(q) || codigo.includes(q);
  });
  renderPersonalTable(filtrados);
}

function openModalCrearPersonal() {
  document.getElementById('modal-personal-title').textContent = 'Registrar Nuevo Colaborador';
  document.getElementById('personal-id').value = '';
  document.getElementById('personal-codigo-input').value = '';
  document.getElementById('personal-nombres-input').value = '';
  document.getElementById('personal-apellidos-input').value = '';
  document.getElementById('personal-dni-input').value = '';
  document.getElementById('personal-cargo-input').value = 'Operario de Envasado';
  document.getElementById('personal-hora-entrada-input').value = '07:30';
  document.getElementById('personal-hora-salida-input').value = '16:30';
  document.getElementById('personal-es-chofer-check').checked = false;
  document.getElementById('personal-estado-select').value = 'ACTIVO';

  const modal = document.getElementById('modal-personal');
  if (modal) modal.classList.add('active');
}

function openModalEditarPersonal(id) {
  const item = personalCache.find(p => p.id === id);
  if (!item) return;

  document.getElementById('modal-personal-title').textContent = 'Editar Colaborador';
  document.getElementById('personal-id').value = item.id;
  document.getElementById('personal-codigo-input').value = item.codigo || '';
  document.getElementById('personal-nombres-input').value = item.nombres || '';
  document.getElementById('personal-apellidos-input').value = item.apellidos || '';
  document.getElementById('personal-dni-input').value = item.dni || '';
  document.getElementById('personal-cargo-input').value = item.cargo || 'Operario de Planta';
  document.getElementById('personal-hora-entrada-input').value = item.hora_entrada_regular ? item.hora_entrada_regular.slice(0, 5) : '07:30';
  document.getElementById('personal-hora-salida-input').value = item.hora_salida_regular ? item.hora_salida_regular.slice(0, 5) : '16:30';
  document.getElementById('personal-es-chofer-check').checked = (item.es_chofer === 1 || item.es_chofer === '1');
  document.getElementById('personal-estado-select').value = item.estado || 'ACTIVO';

  const modal = document.getElementById('modal-personal');
  if (modal) modal.classList.add('active');
}

function closeModalPersonal() {
  const modal = document.getElementById('modal-personal');
  if (modal) modal.classList.remove('active');
}

async function guardarPersonal(event) {
  event.preventDefault();

  const id = document.getElementById('personal-id').value;
  const codigo = document.getElementById('personal-codigo-input').value.trim();
  const nombres = document.getElementById('personal-nombres-input').value.trim();
  const apellidos = document.getElementById('personal-apellidos-input').value.trim();
  const dni = document.getElementById('personal-dni-input').value.trim();
  const cargo = document.getElementById('personal-cargo-input').value.trim();
  const hora_entrada = document.getElementById('personal-hora-entrada-input').value || '07:30';
  const hora_salida = document.getElementById('personal-hora-salida-input').value || '16:30';
  const es_chofer = document.getElementById('personal-es-chofer-check').checked ? 1 : 0;
  const estado = document.getElementById('personal-estado-select').value;

  if (!nombres || !apellidos) {
    if (window.showToast) window.showToast('Nombres y apellidos son obligatorios', 'error');
    return;
  }

  const payload = {
    codigo,
    nombres,
    apellidos,
    dni,
    cargo,
    hora_entrada_regular: `${hora_entrada}:00`,
    hora_salida_regular: `${hora_salida}:00`,
    es_chofer,
    estado
  };

  try {
    const isEdit = !!id;
    const url = isEdit ? `/api/personal/${id}` : '/api/personal';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || json.message);

    if (window.showToast) {
      window.showToast(isEdit ? 'Colaborador actualizado' : 'Colaborador creado exitosamente', 'success');
    }

    closeModalPersonal();
    await loadPersonal();

    // Actualizar caches si existen
    if (typeof personalListCache !== 'undefined') personalListCache = [];
    if (window.loadAsistenciasMatrix) window.loadAsistenciasMatrix();
  } catch (err) {
    console.error('Error guardando personal:', err);
    if (window.showToast) window.showToast('Error: ' + err.message, 'error');
  }
}

async function toggleEstadoPersonal(id, nuevoEstado) {
  try {
    const item = personalCache.find(p => p.id === id);
    if (!item) return;

    const res = await fetch(`/api/personal/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...item,
        estado: nuevoEstado
      })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || json.message);

    if (window.showToast) {
      window.showToast(`Colaborador marcado como ${nuevoEstado}`, 'info');
    }

    await loadPersonal();
    if (typeof personalListCache !== 'undefined') personalListCache = [];
    if (window.loadAsistenciasMatrix) window.loadAsistenciasMatrix();
  } catch (err) {
    console.error('Error al cambiar estado:', err);
    if (window.showToast) window.showToast('Error: ' + err.message, 'error');
  }
}

async function eliminarPersonalPermanente(id) {
  const item = personalCache.find(p => p.id === id);
  const nombre = item ? item.nombre_completo : 'este colaborador';

  if (!confirm(`¿Estás seguro de eliminar permanentemente a "${nombre}"?\nSi tiene asistencias o adelantos registrados, será marcado como INACTIVO para preservar el historial.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/personal/${id}?permanente=true`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || json.message);

    if (window.showToast) {
      window.showToast(json.message || 'Colaborador eliminado', 'info');
    }

    await loadPersonal();
    if (typeof personalListCache !== 'undefined') personalListCache = [];
    if (window.loadAsistenciasMatrix) window.loadAsistenciasMatrix();
  } catch (err) {
    console.error('Error al eliminar personal:', err);
    if (window.showToast) window.showToast('Error: ' + err.message, 'error');
  }
}

window.loadPersonal = loadPersonal;
window.openModalCrearPersonal = openModalCrearPersonal;
window.openModalEditarPersonal = openModalEditarPersonal;
window.closeModalPersonal = closeModalPersonal;
window.guardarPersonal = guardarPersonal;
window.toggleEstadoPersonal = toggleEstadoPersonal;
window.eliminarPersonalPermanente = eliminarPersonalPermanente;
window.filtrarPersonal = filtrarPersonal;
