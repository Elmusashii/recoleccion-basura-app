import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getTrucks,
  getTruckRouteById,
  getTruckRoutes,
  getAvailableRoutesForTruck,
  updateTruckRoutes,
  getMyRoutes,
  createTruck,
  registerFleetLog,
  getFleetLogs,
  updateTruckLocation,
  assignDriverToTruck,
  getAvailableDrivers,
  getMyTruck,
  reportTruckIssue,
  resetTruckMaintenance,
  optimizeTruckReports,
  dispatchOptimizedRoute
} from '../controllers/fleet.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { uploadReportPhotoMiddleware } from '../middlewares/upload.js';

const router = Router();

// Limitador de tasa independiente y permisivo para rutas de camiones (consultas frecuentes y cacheadas)
const truckRouteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 600, // hasta 600 peticiones por ventana de 5 min
  message: {
    success: false,
    message: 'Demasiadas consultas de rutas de camiones, por favor reintenta en breve.'
  }
});

// ==============================================================================
// Endpoints Públicos (Portal Ciudadano / Mapa Interactivo)
// ==============================================================================
// Listar flota de camiones (posiciones y estados)
router.get('/trucks', getTrucks);

// Obtener trazado de ruta de navegación activa de un camión (ORS + Cache + Limiter Dedicado)
router.get('/trucks/:id/route', truckRouteLimiter, getTruckRouteById);

// Obtener barrios/rutas asignados a un camión específico
router.get('/trucks/:id/routes', getTruckRoutes);

// ==============================================================================
// Endpoints Protegidos (Personal Operativo, Supervisores y Administradores)
// ==============================================================================
router.use(authenticate);

// Camión asignado al chofer en sesión
router.get('/my-truck', getMyTruck);

// Rutas asignadas al camión del chofer en sesión
router.get('/my-routes', getMyRoutes);

// Consultar rutas disponibles para asignar (Admin / Supervisor)
router.get('/routes/available-for-truck', requireRole(['admin', 'supervisor']), getAvailableRoutesForTruck);

// Asignar / Sincronizar circuito de rutas a un camión (Admin / Supervisor)
router.put('/trucks/:id/routes', requireRole(['admin', 'supervisor']), updateTruckRoutes);

// Creación de camiones (Admin)
router.post('/trucks', requireRole(['admin']), createTruck);

// Choferes disponibles para asignar (sin camión actual)
router.get('/available-drivers', requireRole(['admin', 'supervisor']), getAvailableDrivers);

// Asignación de Chofer a Camión (Admin / Supervisor)
router.put('/trucks/:id/assign-driver', requireRole(['admin', 'supervisor']), assignDriverToTruck);

// Reseteo / Registro de Mantenimiento Preventivo (Admin / Supervisor)
router.patch('/trucks/:id/maintenance', requireRole(['admin', 'supervisor']), resetTruckMaintenance);

// Reporte de Avería en el camión asignado
router.post('/trucks/:id/report-issue', uploadReportPhotoMiddleware, reportTruckIssue);

// Registro de entradas / salidas (Bitácora)
router.post('/logs', requireRole(['admin', 'supervisor', 'operator', 'chofer']), registerFleetLog);
router.get('/logs', requireRole(['admin', 'supervisor']), getFleetLogs);

// Optimización de rutas de denuncias con motor VROOM según capacidad del camión
router.post('/trucks/:id/optimize-reports', requireRole(['admin', 'supervisor']), optimizeTruckReports);

// Despacho masivo y asignación oficial de denuncias al camión
router.post('/trucks/:id/dispatch-route', requireRole(['admin', 'supervisor']), dispatchOptimizedRoute);

// Telemetría GPS
router.patch('/trucks/:id/location', updateTruckLocation);

export default router;
