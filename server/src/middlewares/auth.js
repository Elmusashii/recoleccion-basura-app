import { supabase } from '../config/supabase.js';
import { errorResponse } from '../utils/response.js';

/**
 * Middleware para validar el JWT emitido por Supabase Auth
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Acceso no autorizado: Token no proporcionado', null, 401);
    }

    const token = authHeader.split(' ')[1];

    // Verificar token con el cliente de Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return errorResponse(res, 'Acceso denegado: Token inválido o expirado', error, 401);
    }

    // Adjuntar usuario autenticado a la request
    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 'Error durante la autenticación', err, 500);
  }
};

/**
 * Middleware para verificar roles de usuario (ej: 'admin', 'supervisor', 'operator')
 */
export const requireRole = (allowedRoles = ['admin']) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Usuario no autenticado', null, 401);
    }

    // En Supabase, los roles seguros se guardan en app_metadata
    const userRole = req.user.app_metadata?.role || req.user.user_metadata?.role || 'citizen';

    if (!allowedRoles.includes(userRole)) {
      return errorResponse(
        res,
        `Acceso restringido: Requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
        null,
        403
      );
    }

    next();
  };
};
