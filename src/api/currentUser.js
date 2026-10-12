// Identifica al usuario que hace la petición a partir de su sesión.
// La sesión solo guarda el id del usuario; en cada petición se vuelve a leer de la capa de lógica,
// así un usuario eliminado deja de estar autenticado aunque conserve la cookie.

const { STATUS } = require('../models/user');

function currentUser({ userService }) {
  return async (req, res, next) => {
    req.user = null;
    const userId = req.session?.userId;
    if (userId) {
      try {
        const user = await userService.getUserById(userId);
        if (user.status === STATUS.ACTIVE) req.user = user;
      } catch {
        // el usuario ya no existe
      }
      if (!req.user) delete req.session.userId;
    }
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Debes iniciar sesión' },
    });
  }
  return next();
}

module.exports = { currentUser, requireUser };
