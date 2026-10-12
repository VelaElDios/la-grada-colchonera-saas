// Capa de lógica de negocio: reglas de gestión de usuarios.
// No sabe nada de HTTP ni de cómo se guardan los datos: recibe sus dependencias por parámetro
// (inyección de dependencias), así puede usar el repositorio en memoria o el de base de datos.

const { ROLES, STATUS, AUTH_PROVIDERS, toPublicUser } = require('../models/user');
const {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  AccountPendingError,
} = require('./errors');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * @param {object} deps
 * @param {object} deps.userRepository Repositorio de usuarios (capa de datos)
 * @param {object} [deps.passwordHasher] Servicio de hash de contraseñas (necesario para registro y login)
 * @param {boolean} [deps.requireEmailConfirmation=true] Si las cuentas locales quedan pendientes hasta confirmar el correo
 */
function createUserService({ userRepository, passwordHasher, requireEmailConfirmation = true }) {
  if (!userRepository) {
    throw new Error('createUserService necesita un userRepository');
  }

  async function findUserOrFail(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  }

  function requirePasswordHasher() {
    if (!passwordHasher) throw new Error('createUserService necesita un passwordHasher');
    return passwordHasher;
  }

  /**
   * Alta de usuario. Las cuentas locales quedan pendientes de confirmar el correo (si se exige);
   * las registradas con un proveedor externo (OAuth) quedan activas directamente.
   */
  async function createUser({ email, role = ROLES.USER, authProvider = AUTH_PROVIDERS.LOCAL, passwordHash } = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new ValidationError('El email no es válido');
    }
    if (!Object.values(ROLES).includes(role)) {
      throw new ValidationError('El rol no es válido');
    }
    if (!Object.values(AUTH_PROVIDERS).includes(authProvider)) {
      throw new ValidationError('El proveedor de autenticación no es válido');
    }
    if (await userRepository.findByEmail(normalizedEmail)) {
      throw new ConflictError('Ya existe una cuenta con ese email');
    }

    const pending = authProvider === AUTH_PROVIDERS.LOCAL && requireEmailConfirmation;
    const user = await userRepository.create({
      email: normalizedEmail,
      role,
      authProvider,
      status: pending ? STATUS.PENDING : STATUS.ACTIVE,
      ...(passwordHash ? { passwordHash } : {}),
    });
    return toPublicUser(user);
  }

  /** Registro local con email y contraseña: la contraseña se guarda solo como hash. */
  async function registerUser({ email, password } = {}) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new ValidationError('El email no es válido');
    }
    if (await userRepository.findByEmail(normalizedEmail)) {
      throw new ConflictError('Ya existe una cuenta con ese email');
    }

    const passwordHash = await requirePasswordHasher().hash(password);
    return createUser({ email: normalizedEmail, passwordHash });
  }

  /**
   * Comprueba email y contraseña. No se distingue entre "email no registrado" y
   * "contraseña incorrecta" para no revelar qué cuentas existen.
   */
  async function authenticate({ email, password } = {}) {
    const user = await userRepository.findByEmail(normalizeEmail(email));
    const valid = Boolean(
      user
      && user.passwordHash
      && typeof password === 'string'
      && (await requirePasswordHasher().verify(password, user.passwordHash)),
    );
    if (!valid) {
      throw new UnauthorizedError('Email o contraseña incorrectos');
    }
    if (user.status === STATUS.DELETED) {
      throw new ForbiddenError('Esta cuenta ha sido eliminada');
    }
    if (user.status === STATUS.PENDING) {
      throw new AccountPendingError('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam).');
    }
    return toPublicUser(user);
  }

  /** Marca la cuenta como confirmada (lo hace el enlace del correo de confirmación). */
  async function confirmUser(id) {
    const user = await findUserOrFail(id);
    if (user.status === STATUS.DELETED) {
      throw new NotFoundError('Usuario no encontrado');
    }
    if (user.status === STATUS.ACTIVE) return toPublicUser(user);
    return toPublicUser(await userRepository.update(id, { status: STATUS.ACTIVE }));
  }

  async function getUserById(id) {
    return toPublicUser(await findUserOrFail(id));
  }

  /** Busca un usuario por su email. Devuelve null si no existe. */
  async function findUserByEmail(email) {
    const user = await userRepository.findByEmail(normalizeEmail(email));
    return user ? toPublicUser(user) : null;
  }

  /** Listado de usuarios con, al menos, email, rol y estado. */
  async function listUsers() {
    const users = await userRepository.findAll();
    return users.map(toPublicUser);
  }

  /**
   * Un usuario está activo si ha confirmado su cuenta (o se registró con OAuth)
   * y no ha sido eliminado. No tiene nada que ver con estar conectado ahora mismo.
   */
  async function isUserActive(id) {
    const user = await findUserOrFail(id);
    return user.status === STATUS.ACTIVE;
  }

  /**
   * Elimina un usuario. El administrador puede eliminar a cualquiera;
   * un usuario normal solo puede eliminar su propia cuenta.
   * Nunca se elimina al último administrador activo.
   */
  async function deleteUser(actor, targetId) {
    if (!actor || actor.status === STATUS.DELETED) {
      throw new ForbiddenError('No tienes permiso para eliminar usuarios');
    }
    if (actor.role !== ROLES.ADMIN && actor.id !== targetId) {
      throw new ForbiddenError('Solo puedes eliminar tu propia cuenta');
    }

    const target = await findUserOrFail(targetId);
    if (target.status === STATUS.DELETED) {
      throw new NotFoundError('Usuario no encontrado');
    }
    if (target.role === ROLES.ADMIN && (await isLastActiveAdmin(target.id))) {
      throw new ForbiddenError('No se puede eliminar al último administrador');
    }

    const deleted = await userRepository.update(targetId, {
      status: STATUS.DELETED,
      deletedAt: new Date().toISOString(),
    });
    return toPublicUser(deleted);
  }

  /** ¿Es este usuario el único administrador activo? (siempre debe quedar al menos uno) */
  async function isLastActiveAdmin(userId) {
    const admins = (await userRepository.findAll())
      .filter((u) => u.role === ROLES.ADMIN && u.status === STATUS.ACTIVE);
    return admins.length === 1 && admins[0].id === userId;
  }

  function requireActiveAdmin(actor) {
    if (!actor || actor.role !== ROLES.ADMIN || actor.status !== STATUS.ACTIVE) {
      throw new ForbiddenError('Solo un administrador puede hacer esto');
    }
  }

  /** Cambia el rol de un usuario. Solo lo puede hacer un administrador. */
  async function changeRole(actor, targetId, role) {
    requireActiveAdmin(actor);
    if (!Object.values(ROLES).includes(role)) {
      throw new ValidationError('El rol no es válido');
    }
    const target = await findUserOrFail(targetId);
    if (target.status === STATUS.DELETED) {
      throw new NotFoundError('Usuario no encontrado');
    }
    if (target.role === role) return toPublicUser(target);
    if (target.role === ROLES.ADMIN && (await isLastActiveAdmin(target.id))) {
      throw new ForbiddenError('Debe quedar al menos un administrador');
    }
    return toPublicUser(await userRepository.update(targetId, { role }));
  }

  /**
   * Garantiza que existe el primer administrador (se llama al arrancar con ADMIN_EMAIL y ADMIN_PASSWORD).
   * - Si la cuenta ya existe, la convierte en administradora (sin tocar su contraseña).
   * - Si no existe, la crea activa y con rol de administrador.
   * @returns {Promise<{ user: object, action: 'created' | 'promoted' | 'unchanged' }>}
   */
  async function ensureAdmin({ email, password } = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new ValidationError('ADMIN_EMAIL no es un email válido');
    }

    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      if (existing.status === STATUS.DELETED) {
        throw new ConflictError('La cuenta indicada en ADMIN_EMAIL está eliminada');
      }
      if (existing.role === ROLES.ADMIN) return { user: toPublicUser(existing), action: 'unchanged' };
      const promoted = await userRepository.update(existing.id, { role: ROLES.ADMIN });
      return { user: toPublicUser(promoted), action: 'promoted' };
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    const created = await userRepository.create({
      email: normalizedEmail,
      role: ROLES.ADMIN,
      authProvider: AUTH_PROVIDERS.LOCAL,
      status: STATUS.ACTIVE,
      passwordHash: await requirePasswordHasher().hash(password),
    });
    return { user: toPublicUser(created), action: 'created' };
  }

  return {
    changeRole,
    ensureAdmin,
    createUser,
    registerUser,
    authenticate,
    confirmUser,
    getUserById,
    findUserByEmail,
    listUsers,
    isUserActive,
    deleteUser,
  };
}

module.exports = { createUserService };
