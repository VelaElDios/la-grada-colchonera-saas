// Modelo de usuario: valores permitidos y vista pública de un usuario.
// Lo comparten la capa de lógica y la de acceso a datos.

const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

const STATUS = Object.freeze({
  PENDING: 'pending', // registrado, pendiente de confirmar el correo
  ACTIVE: 'active', // confirmado (o registrado con OAuth) y no eliminado
  DELETED: 'deleted', // eliminado: no puede volver a iniciar sesión
});

const AUTH_PROVIDERS = Object.freeze({
  LOCAL: 'local', // email + contraseña
  GOOGLE: 'google', // OAuth (Hito 4)
});

/**
 * Devuelve el usuario sin datos sensibles (por ejemplo, el hash de la contraseña),
 * listo para salir de la capa de lógica.
 */
function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

module.exports = { ROLES, STATUS, AUTH_PROVIDERS, toPublicUser };
