import { errorResponse } from '../utils/response.js';

/**
 * Middleware centralizado de manejo de errores para Express
 */
export const errorHandler = (err, req, res, next) => {
  console.error('🔥 [ERROR NO CONTROLADO]:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  return errorResponse(res, message, err, statusCode);
};

/**
 * Middleware para capturar rutas 404 no encontradas
 */
export const notFoundHandler = (req, res) => {
  return errorResponse(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, null, 404);
};
