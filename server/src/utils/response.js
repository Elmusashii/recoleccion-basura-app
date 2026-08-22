/**
 * Utilidades para estructurar respuestas HTTP estandarizadas en la API
 */

export const successResponse = (res, message = 'Operación exitosa', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (res, message = 'Ocurrió un error en el servidor', error = null, statusCode = 500) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message || error;
  }

  return res.status(statusCode).json(response);
};
