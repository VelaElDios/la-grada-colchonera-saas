// Identificación del usuario que hace la petición.
//
// PROVISIONAL (Hito 1): todavía no hay inicio de sesión, así que el usuario se indica
// con la cabecera "X-User-Id". En el Hito 2 este middleware se sustituirá por la sesión
// real, sin cambiar las rutas ni la capa de lógica.

function currentUser({ userService }) {
  return async (req, res, next) => {
    req.user = null;
    const userId = req.get('X-User-Id');
    if (userId) {
      try {
        req.user = await userService.getUserById(userId);
      } catch {
        req.user = null;
      }
    }
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Debes identificarte para hacer esto' },
    });
  }
  return next();
}

module.exports = { currentUser, requireUser };
