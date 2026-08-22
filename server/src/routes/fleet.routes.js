import { Router } from 'express';
import {
  getTrucks,
  createTruck,
  registerFleetLog,
  getFleetLogs,
  updateTruckLocation
} from '../controllers/fleet.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

// Todos los endpoints de flota requieren autenticación de operadores o administradores
router.use(authenticate);

router.get('/trucks', getTrucks);
router.post('/trucks', requireRole(['admin']), createTruck);

// Registro de entradas / salidas (Bitácora)
router.post('/logs', requireRole(['admin', 'supervisor', 'operator']), registerFleetLog);
router.get('/logs', getFleetLogs);

// Telemetría GPS
router.patch('/trucks/:id/location', updateTruckLocation);

export default router;
