# Asistencia Planta (SURGAS)

Sistema completo de **Control de Asistencia del Personal, Tardanzas y Despacho de Balones de Gas (Esquelas)** para la planta **SURGAS**. Réplica exacta y funcional con arquitectura **Node.js + Express** y base de datos relacional en **MySQL**.

---

## 🚀 Características Principales

1. **Panel Principal (Dashboard):**
   - 4 Tarjetas de métricas en tiempo real: *Personal Registrado*, *Asistieron Hoy*, *Esquelas Hoy*, *Fecha de Hoy*.
   - Accesos directos rápidos para registrar asistencia, ver matriz y crear esquelas.

2. **Matriz Mensual de Asistencias (`url=asistencia&i=1`):**
   - Vista columnar interactiva: Fecha vs. Cada uno de los 8 empleados.
   - Indicadores visuales exactos:
     - `P`: Presente
     - `F`: Falta (Insignia amarilla/ámbar)
     - `T`: Tardanza (Insignia naranja rojizo)
     - `-`: Descanso / Feriado
   - Exportación nativa e instantánea a **Excel (`.xlsx`)** mediante SheetJS y a **PDF**.

3. **Módulo de Tardanzas (`url=asistencia/tardanzas`):**
   - Agrupación por empleado con tarjeta visual color naranja de alta fidelidad.
   - Cálculo automático de minutos acumulados y su equivalente en horas (`Xh Ymin`).
   - Detalle cronológico de cada retraso con hora exacta de entrada, salida e insignia de tardanza.

4. **Registro Diario de Asistencia (`url=asistencia/registrar`):**
   - Selector de fecha dinámico.
   - Switches `[ SI ]` / `[ NO ]` interactivos por empleado.
   - Activación automática de campos de hora de entrada y salida (`07:30`, `16:30`).
   - Detección y cálculo automático de minutos de tardanza.

5. **Módulo de Esquelas de Despacho (`url=esquela/crear` y `url=esquelas`):**
   - Generación de correlativo automático (`ESQ-013`, `ESQ-014`, etc.).
   - Selección de chofer y placa de vehículo.
   - Formularios modulares con balances de gas por capacidad (10kg, 45kg, 5kg):
     - Balones Llenos (Salida)
     - Devolución Cambios (Salida)
     - Balones Vacíos (Ingreso / Retorno)
     - Devolución Cambios (Ingreso / Retorno)
   - Historial completo de esquelas emitidas.

---

## 📂 Estructura del Proyecto

```text
asistencia-planta/
├── .env                  # Variables de entorno (puerto, conexión MySQL)
├── .env.example          # Plantilla de variables de entorno
├── package.json          # Dependencias (express, cors, mysql2, dotenv)
├── script.sql            # Script SQL completo de creación y datos semilla
├── README.md             # Esta documentación
├── src/
│   ├── server.js         # Servidor Express y definición de rutas API
│   ├── db.js             # Pool de conexiones MySQL + Fallback reactivo
│   └── controllers/
│       ├── personalController.js
│       ├── asistenciaController.js
│       ├── tardanzasController.js
│       ├── esquelasController.js
│       └── dashboardController.js
└── public/
    ├── index.html        # Aplicación SPA con las 6 vistas completas
    ├── css/
    │   └── styles.css    # Estilos CSS fieles a la interfaz de SURGAS
    └── js/
        ├── app.js        # Enrutador de vistas, navegación y estado
        ├── dashboard.js  # Lógica del panel principal
        ├── asistencia.js # Renderizado de matriz y selector de mes
        ├── tardanzas.js  # Cálculo de tardanzas y tarjetas
        ├── registro.js   # Pase de lista diario interactivo
        ├── esquela.js    # Formulario y listado de esquelas
        └── export.js     # Exportación a Excel (SheetJS) y PDF
```

---

## 🗄️ Configuración de Base de Datos MySQL (`script.sql`)

El archivo [`script.sql`](./script.sql) contiene la estructura completa con claves foráneas, índices optimizados y la inserción de:
- Los 8 trabajadores de planta.
- Flota de vehículos de despacho.
- La matriz completa de octubre de 2026.
- Historial de esquelas correlativas.

### Importar en MySQL CLI o Terminal:
```bash
mysql -u root -p < script.sql
```

### Importar en phpMyAdmin o MySQL Workbench:
1. Abre tu panel phpMyAdmin o MySQL Workbench.
2. Ve a la pestaña **Importar** o abre una pestaña SQL.
3. Carga el archivo `script.sql` y ejecútalo. Creará automáticamente la base de datos `asistencia_planta`.

---

## ⚙️ Instalación y Puesta en Marcha

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno (`.env`):**
   Asegúrate de que los datos de tu servidor MySQL coincidan:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=asistencia_planta
   ```

3. **Iniciar el servidor:**
   ```bash
   # Modo Producción
   npm start

   # Modo Desarrollo con recarga automática
   npm run dev
   ```

4. **Abrir en el Navegador:**
   Ingresa a: [http://localhost:3000](http://localhost:3000)

> **Nota:** La aplicación cuenta con un almacén reactivo en memoria que le permite arrancar y ser completamente funcional incluso antes de iniciar MySQL. En cuanto la base de datos esté activa, se sincronizará automáticamente.
