import { Router } from 'express';
import {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute
} from '../controllers/routes.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

// Rutas Públicas (Portal Ciudadano)
router.get('/', getRoutes);
router.get('/:id', getRouteById);

// Rutas Administrativas (Panel de Control - Requiere Auth & Rol Admin/Supervisor)
router.post('/', authenticate, requireRole(['admin', 'supervisor']), createRoute);
router.put('/:id', authenticate, requireRole(['admin', 'supervisor']), updateRoute);
router.delete('/:id', authenticate, requireRole(['admin']), deleteRoute);

export default router;
