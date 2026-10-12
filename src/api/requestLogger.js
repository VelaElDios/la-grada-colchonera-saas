// Middleware que registra cada petición a la API al terminar: método, ruta, código de respuesta,
// duración y usuario. Cada petición recibe un identificador (también en la cabecera X-Request-Id)
// para poder seguir todos los eventos que genera.
const { randomUUID } = require('node:crypto');

function requestLogger({ logger }) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    req.id = randomUUID();
    req.log = logger.child({ requestId: req.id });
    res.setHeader('X-Request-Id', req.id);

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      const fields = {
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs,
        userId: req.user?.id ?? req.session?.userId ?? null,
      };
      // Las comprobaciones de salud (cada pocos segundos en Render) solo en modo depuración
      const level = req.path === '/health' ? 'debug' : res.statusCode >= 500 ? 'error' : 'info';
      req.log[level]('http.request', `${req.method} ${fields.path} ${res.statusCode}`, fields);
    });
    next();
  };
}

module.exports = { requestLogger };
