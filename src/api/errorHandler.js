// Traduce los errores de la capa de lógica a respuestas HTTP con un formato común:
// { "error": { "code": "...", "message": "..." } }

const HTTP_STATUS_BY_CODE = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // JSON mal formado en el cuerpo de la petición
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'JSON no válido' } });
  }

  const status = HTTP_STATUS_BY_CODE[err.code];
  if (status) {
    // Los accesos denegados quedan registrados (pueden indicar un intento de abuso)
    if (status === 403) {
      req.log?.warn('auth.forbidden', err.message, { userId: req.user?.id ?? null, path: req.originalUrl });
    }
    return res.status(status).json({ error: { code: err.code, message: err.message } });
  }

  // Error inesperado: se registra con todo el detalle y no se dan detalles internos al cliente
  if (req.log) req.log.error('http.error', 'Error interno', { error: err });
  else console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
}

module.exports = { errorHandler, notFoundHandler };
