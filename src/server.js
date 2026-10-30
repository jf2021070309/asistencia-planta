const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Controladores
const personalCtrl = require('./controllers/personalController');
const asistenciaCtrl = require('./controllers/asistenciaController');
const tardanzasCtrl = require('./controllers/tardanzasController');
const adelantosCtrl = require('./controllers/adelantosController');
const esquelasCtrl = require('./controllers/esquelasController');
const dashboardCtrl = require('./controllers/dashboardController');

// Rutas de API
app.get('/api/status', (req, res) => {
  res.json({
    app: 'SURGAS - Sistema de Control de Asistencia y Despacho',
    version: '1.0.0',
    db_connected: db.isLiveDB(),
    db_engine: db.isLiveDB() ? 'MySQL 8.0+' : 'Almacén en memoria reactivo'
  });
});

// Dashboard
app.get('/api/dashboard/kpis', dashboardCtrl.getKpis);

// Personal
app.get('/api/personal', personalCtrl.getAll);
app.get('/api/personal/choferes', personalCtrl.getChoferes);

// Asistencias
app.get('/api/asistencias/matriz', asistenciaCtrl.getMatrix);
app.get('/api/asistencias/reporte', asistenciaCtrl.getReporteData);
app.get('/api/asistencias/dia', asistenciaCtrl.getByDate);
app.post('/api/asistencias/dia', asistenciaCtrl.saveDia);
app.get('/api/asistencias/individual', asistenciaCtrl.getIndividual);
app.post('/api/asistencias/individual', asistenciaCtrl.saveIndividual);
app.delete('/api/asistencias/individual', asistenciaCtrl.deleteIndividual);

// Tardanzas
app.get('/api/tardanzas/resumen', tardanzasCtrl.getResumen);

// Adelantos de Dinero (CRUD Completo)
app.get('/api/adelantos', adelantosCtrl.getAll);
app.post('/api/adelantos', adelantosCtrl.create);
app.put('/api/adelantos/:id', adelantosCtrl.update);
app.delete('/api/adelantos/:id', adelantosCtrl.delete);

// Esquelas y Vehículos
app.get('/api/esquelas', esquelasCtrl.getAll);
app.post('/api/esquelas', esquelasCtrl.create);
app.get('/api/esquelas/siguiente-correlativo', esquelasCtrl.getSiguienteCorrelativo);
app.get('/api/vehiculos', esquelasCtrl.getVehiculos);

// Redirigir cualquier otra ruta web al SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Inicialización del servidor
async function startServer() {
  await db.initDB();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SURGAS - Asistencia Planta funcionando en:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('[Process Error - uncaughtException]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error - unhandledRejection]:', reason);
});

startServer();
