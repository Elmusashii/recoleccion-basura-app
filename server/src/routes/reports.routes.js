import { Router } from 'express';
import {
  getReports,
  getReportsAdmin,
  getReportsHeatmap,
  createReport,
  getReportByTicket,
  updateReportStatus,
  uploadReportPhotoController,
  getWeeklyReportStats
} from '../controllers/reports.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { uploadReportPhotoMiddleware } from '../middlewares/upload.js';

const router = Router();

// Endpoints Públicos (Portal Ciudadano)
router.post('/upload', uploadReportPhotoMiddleware, uploadReportPhotoController); // Subir foto de denuncia a Supabase Storage
router.post('/', createReport);                         // Crear denuncia (con geolocalización y fotos)
router.get('/stats/weekly', getWeeklyReportStats);       // Estadísticas de denuncias resueltas en los últimos 7 días
router.get('/ticket/:ticket', getReportByTicket);       // Consultar estado de ticket
router.get('/heatmap', getReportsHeatmap);             // Mapa de calor para visualización pública/admin
router.get('/', getReports);                            // Listar denuncias públicas (sanitizado)

// Endpoints de Gestión y Moderación (Requieren Auth & Rol)
router.get('/admin', authenticate, requireRole(['admin', 'supervisor', 'operator']), getReportsAdmin);
router.patch('/:id/status', authenticate, requireRole(['admin', 'supervisor', 'operator']), updateReportStatus);

export default router;

