// ==============================================================================
// SURGAS - CONTROLADOR PRINCIPAL Y ENRUTADOR SPA
// ==============================================================================

const VIEWS = {
  'inicio': 'view-inicio',
  'asistencias': 'view-asistencias',
  'tardanzas': 'view-tardanzas',
  'adelantos': 'view-adelantos',
  'personal': 'view-personal',
  'registro': 'view-registro',
  'nueva-esquela': 'view-nueva-esquela',
  'esquelas': 'view-esquelas'
};

function navigateTo(viewName, updateUrl = true) {
  // Ocultar todas las vistas
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.style.display = 'none';
  });

  // Remover activo de navegación
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const viewId = VIEWS[viewName] || 'view-inicio';
  const targetSec = document.getElementById(viewId);
  if (targetSec) {
    targetSec.style.display = 'block';
  }

  // Marcar enlace activo
  const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (activeNav) {
    activeNav.classList.add('active');
  }

  // Cargar datos según la vista
  if (viewName === 'inicio' && window.loadDashboard) {
    window.loadDashboard();
  } else if (viewName === 'asistencias' && window.loadAsistenciasMatrix) {
    window.loadAsistenciasMatrix();
  } else if (viewName === 'tardanzas' && window.loadTardanzas) {
    window.loadTardanzas();
  } else if (viewName === 'adelantos' && window.loadAdelantos) {
    window.loadAdelantos();
  } else if (viewName === 'personal' && window.loadPersonal) {
    window.loadPersonal();
  } else if (viewName === 'registro' && window.loadRegistroAsistencia) {
    window.loadRegistroAsistencia();
  } else if (viewName === 'nueva-esquela' && window.initNuevaEsquelaForm) {
    window.initNuevaEsquelaForm();
  } else if (viewName === 'esquelas' && window.loadEsquelas) {
    window.loadEsquelas();
  }

  if (updateUrl) {
    let urlParam = viewName;
    if (viewName === 'asistencias') urlParam = 'asistencia&i=1';
    else if (viewName === 'tardanzas') urlParam = 'asistencia/tardanzas';
    else if (viewName === 'adelantos') urlParam = 'asistencia/adelantos';
    else if (viewName === 'personal') urlParam = 'personal';
    else if (viewName === 'registro') urlParam = 'asistencia/registrar';
    else if (viewName === 'nueva-esquela') urlParam = 'esquela/crear';
    else if (viewName === 'esquelas') urlParam = 'esquelas';
    else if (viewName === 'inicio') urlParam = 'inicio';

    const newUrl = `${window.location.pathname}?url=${urlParam}`;
    window.history.pushState({ view: viewName }, '', newUrl);
  }

  // Cerrar sidebar móvil si está abierto
  closeMobileSidebar();
}

function openMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.add('mobile-open');
  if (backdrop) backdrop.classList.add('active');
  document.body.classList.add('no-scroll');
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) {
    sidebar.classList.remove('mobile-open');
    sidebar.style.transform = ''; // limpiar cualquier inline style
  }
  if (backdrop) backdrop.classList.remove('active');
  document.body.classList.remove('no-scroll');
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && sidebar.classList.contains('mobile-open')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

function toggleSidebarCollapse() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  const isCollapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
}

function parseInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');

  if (urlParam) {
    if (urlParam.includes('tardanzas')) return 'tardanzas';
    if (urlParam.includes('adelanto')) return 'adelantos';
    if (urlParam.includes('personal')) return 'personal';
    if (urlParam.includes('registrar')) return 'registro';
    if (urlParam.includes('asistencia')) return 'asistencias';
    if (urlParam.includes('esquela/crear')) return 'nueva-esquela';
    if (urlParam.includes('esquelas')) return 'esquelas';
    if (urlParam.includes('inicio')) return 'inicio';
  }
  return 'asistencias'; // La vista por defecto de la URL proporcionada
}

function showToast(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    const swalIcon = type === 'error' ? 'error' : (type === 'success' ? 'success' : (type === 'warning' ? 'warning' : 'info'));
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: swalIcon,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
    return;
  }

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg style="width: 18px; height: 18px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'}
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

async function checkDatabaseStatus() {
  try {
    const res = await fetch('/api/status');
    const json = await res.json();
    const badge = document.getElementById('db-status-indicator');
    if (badge) {
      if (json.db_connected) {
        badge.className = 'db-status-badge';
        badge.innerHTML = `● MySQL Conectado`;
      } else {
        badge.className = 'db-status-badge offline';
        badge.innerHTML = `● Modo Local`;
      }
    }
  } catch (err) {
    console.warn('Error verificando estado de DB:', err);
  }
}

// Inicialización de la aplicación al cargar DOM
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const collapseBtn = document.getElementById('btn-collapse-sidebar');
  const mobileToggleBtn = document.getElementById('btn-mobile-menu');
  const mobileCloseBtn = document.getElementById('btn-close-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  // 1. Restaurar estado de sidebar colapsado en desktop
  if (sidebar && localStorage.getItem('sidebar_collapsed') === 'true') {
    if (window.innerWidth > 768) {
      sidebar.classList.add('collapsed');
    }
  }

  // 2. Colapsar / expandir sidebar en Desktop
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebarCollapse();
    });
  }

  // 3. Abrir / cerrar menú móvil tipo Drawer
  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileSidebar();
    });
  }

  if (mobileCloseBtn) {
    mobileCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMobileSidebar();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeMobileSidebar();
    });
  }

  // Si la pantalla se redimensiona a escritorio, limpiar estado móvil
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMobileSidebar();
    }
  });

  // 4. Manejar botones de navegación
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = el.getAttribute('data-nav');
      navigateTo(targetView);
    });
  });

  // 5. Manejar retroceso en el navegador (popstate)
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view) {
      navigateTo(e.state.view, false);
    } else {
      navigateTo(parseInitialRoute(), false);
    }
  });

  // 6. Iniciar ruta inicial
  const initial = parseInitialRoute();
  navigateTo(initial, false);

  // 7. Verificar estado de MySQL
  checkDatabaseStatus();
});

window.navigateTo = navigateTo;
window.showToast = showToast;
