import { Router } from 'express';
import {
  getTrucks,
  createTruck,
  registerFleetLog,
  getFleetLogs,
  updateTruckLocation,
  assignDriverToTruck,
  getMyTruck,
  reportTruckIssue
} from '../controllers/fleet.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { uploadReportPhotoMiddleware } from '../middlewares/upload.js';

const router = Router();

// Todos los endpoints de flota requieren autenticación de operadores, administradores o choferes
router.use(authenticate);

// Camión asignado al chofer en sesión
router.get('/my-truck', getMyTruck);

// Camiones generales
router.get('/trucks', getTrucks);
router.post('/trucks', requireRole(['admin']), createTruck);

// Asignación de Chofer a Camión (Admin / Supervisor)
router.put('/trucks/:id/assign-driver', requireRole(['admin', 'supervisor']), assignDriverToTruck);

// Reporte de Avería en el camión asignado
router.post('/trucks/:id/report-issue', uploadReportPhotoMiddleware, reportTruckIssue);

// Registro de entradas / salidas (Bitácora)
router.post('/logs', requireRole(['admin', 'supervisor', 'operator', 'chofer']), registerFleetLog);
router.get('/logs', getFleetLogs);

// Telemetría GPS
router.patch('/trucks/:id/location', updateTruckLocation);

export default router;
