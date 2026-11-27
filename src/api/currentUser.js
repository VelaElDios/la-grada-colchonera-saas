// Identifica al usuario que hace la petición a partir de su sesión.
// La sesión solo guarda el id del usuario y la huella de sus credenciales; en cada petición se vuelve a
// leer de la capa de lógica, así un usuario eliminado deja de estar autenticado aunque conserve la cookie,
// y al cambiar la contraseña se cierran las sesiones abiertas en otros dispositivos.

const { STATUS } = require('../models/user');

function currentUser({ userService }) {
  return async (req, res, next) => {
    req.user = null;
    const userId = req.session?.userId;
    if (userId) {
      try {
        const { user, stamp } = await userService.getSessionUser(userId);
        // Las sesiones anteriores a la huella (sin `huella`) siguen valiendo hasta que caduquen
        const huellaValida = req.session.huella === undefined || req.session.huella === stamp;
        if (user.status === STATUS.ACTIVE && huellaValida) req.user = user;
      } catch {
        // el usuario ya no existe
      }
      if (!req.user) { delete req.session.userId; delete req.session.huella; }
    }
    next();
  };
}

/**
 * Protege una ruta: rechaza con 401 cualquier petición sin una sesión válida.
 * La comprobación se hace en el servidor; ocultar botones en la interfaz no basta.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Debes iniciar sesión' },
    });
  }
  return next();
}

/**
 * Autorización por rol: solo deja pasar a los usuarios con alguno de los roles indicados (403 si no).
 * Se usa siempre después de requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.log?.warn('auth.forbidden', 'Acceso denegado por rol', { userId: req.user?.id ?? null, path: req.originalUrl });
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'No tienes permiso para acceder a este recurso' },
      });
    }
    return next();
  };
}

/** El propio usuario o un administrador (por ejemplo, para consultar o eliminar una cuenta). */
function requireSelfOrRole(...roles) {
  return (req, res, next) => {
    if (req.user && (req.user.id === req.params.id || roles.includes(req.user.role))) return next();
    req.log?.warn('auth.forbidden', 'Acceso denegado a una cuenta ajena', { userId: req.user?.id ?? null, path: req.originalUrl });
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'No tienes permiso para acceder a este recurso' },
    });
  };
}

module.exports = { currentUser, requireAuth, requireRole, requireSelfOrRole };
