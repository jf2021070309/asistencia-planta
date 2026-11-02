// ==============================================================================
// SURGAS - MÓDULO DE EXPORTACIÓN Y REPORTE OFICIAL (PDF & EXCEL)
// Adopta el formato exacto del reporte institucional de SURGAS S.A.C.
// ==============================================================================

function getSafeCurrentMonth() {
  if (window.getCurrentMonth) return window.getCurrentMonth();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function generarReporteHTML(mes) {
  const mesInput = document.getElementById('asistencia-mes-picker');
  const targetMes = mes || (mesInput && mesInput.value ? mesInput.value : getSafeCurrentMonth());
  const res = await fetch(`/api/asistencias/reporte?mes=${targetMes}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'No se pudo obtener la información del reporte');
  }
  return data;
}

function abrirReporteImpresion(data) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Ventana bloqueada',
        text: 'Por favor habilita las ventanas emergentes (pop-ups) en tu navegador para ver e imprimir el reporte.',
        confirmButtonColor: '#720917'
      });
    } else {
      alert('Por favor habilita las ventanas emergentes (pop-ups) para ver el reporte.');
    }
    return;
  }

  const { metadatos, personal, filas, resumenTardanzas, resumenFaltas, adelantos } = data;

  // Encabezados de columnas de la matriz
  let thEmpleados = '';
  personal.forEach(p => {
    thEmpleados += `<th>${p.nombreCompleto}</th>`;
  });

  // Generar filas de la matriz
  let filasHtml = '';
  filas.forEach(f => {
    const rowClass = f.esDomingo ? 'row-domingo' : '';
    filasHtml += `<tr class="${rowClass}">`;
    filasHtml += `<td class="text-center col-num">${f.numero}</td>`;
    filasHtml += `<td class="text-center col-fecha">${f.fecha}</td>`;
    filasHtml += `<td class="text-center col-dia font-bold">${f.dia}</td>`;

    personal.forEach(p => {
      const emp = f.empleados[p.id];
      const est = emp ? emp.estado : '-';
      const min = emp ? emp.minutos_tardanza : 0;

      let cellContent = '-';
      let cellClass = 'cell-dash';

      if (est === 'P') {
        cellClass = 'cell-p';
        cellContent = '<span class="badge-letter">P</span>';
      } else if (est === 'F') {
        cellClass = 'cell-f';
        cellContent = '<span class="badge-letter">F</span>';
      } else if (est === 'T') {
        cellClass = 'cell-t';
        cellContent = '<span class="badge-letter">T</span>';
      }

      filasHtml += `<td class="text-center ${cellClass}">${cellContent}</td>`;
    });

    filasHtml += `</tr>`;
  });

  // Resumen de Tardanzas
  let tardanzasRows = '';
  if (resumenTardanzas && resumenTardanzas.length > 0) {
    resumenTardanzas.forEach(t => {
      tardanzasRows += `
        <tr>
          <td class="text-center">${t.num}</td>
          <td>${t.colaborador}</td>
          <td class="text-center">${t.cantidad}</td>
          <td class="text-center">${t.total_minutos}</td>
          <td class="text-center">${t.total_horas}</td>
        </tr>
      `;
    });
  } else {
    tardanzasRows = `<tr><td colspan="5" class="text-center text-muted">No se registraron tardanzas en este período.</td></tr>`;
  }

  // Resumen de Faltas
  let faltasRows = '';
  if (resumenFaltas && resumenFaltas.length > 0) {
    resumenFaltas.forEach(f => {
      faltasRows += `
        <tr>
          <td class="text-center">${f.num}</td>
          <td>${f.colaborador}</td>
          <td class="text-center font-bold">${f.total_faltas}</td>
          <td class="col-dias-falta">${f.dias_texto}</td>
        </tr>
      `;
    });
  } else {
    faltasRows = `<tr><td colspan="4" class="text-center text-muted">No se registraron faltas en este período.</td></tr>`;
  }

  // Adelantos de Dinero
  let adelantosRows = '';
  if (adelantos && adelantos.items && adelantos.items.length > 0) {
    adelantos.items.forEach(ad => {
      adelantosRows += `
        <tr>
          <td class="text-center">${ad.num}</td>
          <td>${ad.colaborador}</td>
          <td class="text-center">${ad.monto_texto}</td>
          <td class="text-center">${ad.fecha_texto}</td>
        </tr>
      `;
    });
    adelantosRows += `
      <tr class="row-total">
        <td colspan="2" class="text-right font-bold">Total de adelantos</td>
        <td class="text-center font-bold">${adelantos.total_texto}</td>
        <td></td>
      </tr>
    `;
  } else {
    adelantosRows = `<tr><td colspan="4" class="text-center text-muted" style="padding: 10px; font-style: italic;">Sin registros de adelantos en este período (${metadatos.periodo}).</td></tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>SURGAS - Control Mensual de Asistencia - ${metadatos.periodo}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
      margin: 0;
      padding: 10px 15px;
      color: #1e293b;
      background: #ffffff;
      font-size: 10px;
    }

    /* Barra de herramientas en pantalla */
    .toolbar-screen {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      margin: -10px -15px 15px -15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .toolbar-screen h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-buttons {
      display: flex;
      gap: 10px;
    }
    .btn-action {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-action:hover { background: #059669; }
    .btn-secondary {
      background: #334155;
    }
    .btn-secondary:hover { background: #475569; }

    @media print {
      .toolbar-screen { display: none !important; }
      body { padding: 0; margin: 0; }
    }

    /* ENCABEZADO OFICIAL */
    .header-report {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 6px;
      border-bottom: 2.5px solid #720917;
      margin-bottom: 8px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-square {
      width: 36px;
      height: 36px;
      background: #720917;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 900;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #720917;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .brand-subtitle {
      font-size: 9.5px;
      color: #857372;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
    }
    .title-report {
      font-size: 13px;
      font-weight: 800;
      color: #2E2E2E;
      letter-spacing: 0.3px;
    }
    .period-report {
      font-size: 12px;
      font-weight: 700;
      color: #FF5F00;
      margin-top: 2px;
    }

    /* BLOQUE DE METADATOS (4 CAJAS) */
    .metadata-grid {
      display: grid;
      grid-template-columns: 1.2fr 1.3fr 1fr 1.2fr;
      border: 1px solid #94a3b8;
      border-radius: 4px;
      margin-bottom: 10px;
      background: #fafafa;
    }
    .meta-box {
      padding: 5px 8px;
      border-right: 1px solid #94a3b8;
    }
    .meta-box:last-child {
      border-right: none;
    }
    .meta-label {
      font-size: 8px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
    }

    /* TABLAS */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      margin-bottom: 12px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 4px;
    }
    th {
      background: #720917;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.2px;
      text-align: center;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-muted { color: #64748b; }

    /* ESTILOS DE CELDA DE LA MATRIZ */
    .col-num { width: 22px; color: #64748b; }
    .col-fecha { width: 60px; font-weight: 500; }
    .col-dia { width: 32px; }

    .cell-p {
      background: #d4edda !important;
      color: #155724 !important;
      font-weight: 700;
    }
    .cell-f {
      background: #f8d7da !important;
      color: #721c24 !important;
      font-weight: 700;
    }
    .cell-t {
      background: #fff3cd !important;
      color: #856404 !important;
      font-weight: 700;
      padding: 1.5px 2px !important;
    }
    .cell-dash {
      color: #94a3b8;
    }
    .row-domingo td {
      background-color: #f8fafc;
    }

    .badge-letter {
      display: inline-block;
      font-size: 9px;
      line-height: 1;
    }
    .badge-t-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .badge-sub {
      font-size: 7px;
      font-weight: 600;
      margin-top: 1px;
      color: #6d4c06;
    }

    /* SECCIONES DE RESÚMENES */
    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin: 10px 0 4px 0;
      text-transform: none;
    }
    .col-dias-falta {
      font-size: 7.5px;
      line-height: 1.3;
      color: #334155;
    }
    .row-total td {
      background: #f1f5f9;
      font-weight: 700;
      font-size: 9px;
    }

    /* FIRMAS */
    .signatures-block {
      display: flex;
      justify-content: space-around;
      margin-top: 25px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .sign-box {
      text-align: center;
      width: 260px;
    }
    .sign-line {
      border-top: 1.5px solid #334155;
      margin-bottom: 5px;
    }
    .sign-role {
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .sign-company {
      font-size: 8.5px;
      color: #64748b;
    }

    /* PIE DE PÁGINA */
    .footer-report {
      border-top: 1px dashed #94a3b8;
      padding-top: 4px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      color: #64748b;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>

  <!-- Barra flotante de utilidades -->
  <div class="toolbar-screen">
    <h2>
      <span>📄 Reporte Oficial de Asistencias</span>
      <span style="font-size: 11px; opacity: 0.8; font-weight: 400;">(${metadatos.periodo})</span>
    </h2>
    <div class="toolbar-buttons">
      <button class="btn-action" onclick="window.print()">
        🖨️ Imprimir / Guardar como PDF
      </button>
      <button class="btn-action btn-secondary" onclick="window.close()">
        ✕ Cerrar
      </button>
    </div>
  </div>

  <!-- ENCABEZADO INSTITUCIONAL -->
  <div class="header-report">
    <div class="brand-left">
      <div class="logo-square">S</div>
      <div>
        <div class="brand-title">PLANTA DE GAS</div>
        <div class="brand-subtitle">Sistema Integral de Control de Asistencia y Personal</div>
      </div>
    </div>
    <div class="header-right">
      <div class="title-report">CONTROL MENSUAL DE ASISTENCIA</div>
      <div class="period-report">PERÍODO: ${metadatos.periodo}</div>
    </div>
  </div>

  <!-- METADATOS DEL REPORTE -->
  <div class="metadata-grid">
    <div class="meta-box">
      <div class="meta-label">Rango de Fechas</div>
      <div class="meta-value">${metadatos.rangoFechas}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Horario Oficial</div>
      <div class="meta-value">${metadatos.horarioOficial}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Total Colaboradores</div>
      <div class="meta-value">${metadatos.totalColaboradores}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Fecha y Hora de Emisión</div>
      <div class="meta-value">${metadatos.fechaEmision}</div>
    </div>
  </div>

  <!-- MATRIZ DE ASISTENCIA -->
  <table>
    <thead>
      <tr>
        <th style="width: 22px;">Nº</th>
        <th style="width: 60px;">FECHA</th>
        <th style="width: 32px;">DÍA</th>
        ${thEmpleados}
      </tr>
    </thead>
    <tbody>
      ${filasHtml}
    </tbody>
  </table>

  <!-- SECCIÓN: RESUMEN DE TARDANZAS -->
  <div class="section-title">Resumen de tardanzas</div>
  <table style="width: 100%;">
    <thead>
      <tr>
        <th style="width: 30px;">Nº</th>
        <th style="text-align: left; padding-left: 8px;">COLABORADOR</th>
        <th style="width: 160px;">CANTIDAD DE TARDANZAS</th>
        <th style="width: 140px;">TOTAL EN MINUTOS</th>
        <th style="width: 140px;">TOTAL EN HORAS</th>
      </tr>
    </thead>
    <tbody>
      ${tardanzasRows}
    </tbody>
  </table>

  <!-- SECCIÓN: RESUMEN DE FALTAS -->
  <div class="section-title">Resumen de faltas</div>
  <table style="width: 100%;">
    <thead>
      <tr>
        <th style="width: 30px;">Nº</th>
        <th style="width: 180px; text-align: left; padding-left: 8px;">COLABORADOR</th>
        <th style="width: 120px;">TOTAL DE FALTAS</th>
        <th style="text-align: left; padding-left: 8px;">DÍAS DE FALTA</th>
      </tr>
    </thead>
    <tbody>
      ${faltasRows}
    </tbody>
  </table>

  <!-- SECCIÓN: ADELANTOS DE DINERO -->
  <div class="section-title">Adelantos de dinero</div>
  <table style="width: 100%;">
    <thead>
      <tr>
        <th style="width: 30px;">Nº</th>
        <th style="text-align: left; padding-left: 8px;">COLABORADOR</th>
        <th style="width: 140px;">MONTO</th>
        <th style="width: 160px;">FECHA</th>
      </tr>
    </thead>
    <tbody>
      ${adelantosRows}
    </tbody>
  </table>

  <!-- FIRMAS -->
  <div class="signatures-block">
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-role">Control de Asistencia / RRHH</div>
      <div class="sign-company">SURGAS S.A.C.</div>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-role">Gerencia de Operaciones</div>
      <div class="sign-company">Visto Bueno</div>
    </div>
  </div>

  <!-- PIE DE PÁGINA -->
  <div class="footer-report">
    <div>SURGAS S.A.C. • Sistema de Control de Asistencia • RUC 20601234567</div>
    <div>Hoja 1 de 1</div>
    <div>Impreso: ${metadatos.fechaEmision}</div>
  </div>

</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

async function exportarReportePDF(mes) {
  try {
    const data = await generarReporteHTML(mes);
    abrirReporteImpresion(data);
  } catch (err) {
    console.error('Error generando reporte:', err);
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error al generar el reporte: ' + err.message, confirmButtonColor: '#720917' });
    } else {
      alert('Error al generar el reporte: ' + err.message);
    }
  }
}

async function exportarMatrizExcel(mes) {
  if (typeof XLSX === 'undefined') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'info', title: 'Cargando', text: 'Librería XLSX cargando. Por favor intente de nuevo en un segundo.', confirmButtonColor: '#720917' });
    } else {
      alert('Librería XLSX cargando. Por favor intente de nuevo en un segundo.');
    }
    return;
  }

  try {
    const data = await generarReporteHTML(mes);
    const { metadatos, personal, filas, resumenTardanzas, resumenFaltas, adelantos } = data;

    const aoa = [];

    // Encabezado institucional en Excel
    aoa.push(['SURGAS S.A.C. - PLANTA DE GAS']);
    aoa.push(['CONTROL MENSUAL DE ASISTENCIA - PERÍODO: ' + metadatos.periodo]);
    aoa.push([`Rango: ${metadatos.rangoFechas}`, `Horario: ${metadatos.horarioOficial}`, `Colaboradores: ${metadatos.totalColaboradores}`, `Emisión: ${metadatos.fechaEmision}`]);
    aoa.push([]); // Espacio

    // Matriz
    const headers = ['Nº', 'Fecha', 'Día', ...personal.map(p => p.nombreCompleto)];
    aoa.push(headers);

    filas.forEach(f => {
      const row = [f.numero, f.fecha, f.dia];
      personal.forEach(p => {
        const emp = f.empleados[p.id];
        let val = emp ? emp.estado : '-';
        row.push(val);
      });
      aoa.push(row);
    });

    aoa.push([]);
    aoa.push(['RESUMEN DE TARDANZAS']);
    aoa.push(['Nº', 'Colaborador', 'Cantidad de Tardanzas', 'Total en Minutos', 'Total en Horas']);
    resumenTardanzas.forEach(t => {
      aoa.push([t.num, t.colaborador, t.cantidad, t.total_minutos, t.total_horas]);
    });

    aoa.push([]);
    aoa.push(['RESUMEN DE FALTAS']);
    aoa.push(['Nº', 'Colaborador', 'Total de Faltas', 'Días de Falta']);
    resumenFaltas.forEach(f => {
      aoa.push([f.num, f.colaborador, f.total_faltas, f.dias_texto]);
    });

    aoa.push([]);
    aoa.push(['ADELANTOS DE DINERO']);
    aoa.push(['Nº', 'Colaborador', 'Monto', 'Fecha']);
    if (adelantos && adelantos.items && adelantos.items.length > 0) {
      adelantos.items.forEach(ad => {
        aoa.push([ad.num, ad.colaborador, ad.monto_texto, ad.fecha_texto]);
      });
      aoa.push(['', 'Total de adelantos', adelantos.total_texto, '']);
    } else {
      aoa.push(['-', `Sin registros de adelantos en ${metadatos.periodo}`, 'S/ 0.00', '-']);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Asistencia ${metadatos.periodo.replace(' ', '_')}`);

    XLSX.writeFile(wb, `SURGAS_Control_Asistencia_${metadatos.periodo.replace(' ', '_')}.xlsx`);
  } catch (err) {
    console.error('Error exportando Excel:', err);
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error al exportar a Excel: ' + err.message, confirmButtonColor: '#720917' });
    } else {
      alert('Error al exportar a Excel: ' + err.message);
    }
  }
}

window.SURGAS_EXPORT = {
  exportarReportePDF,
  exportarMatrizExcel,
  generarReporteHTML
};
