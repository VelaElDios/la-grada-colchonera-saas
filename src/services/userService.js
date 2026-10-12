// Capa de lógica de negocio: reglas de gestión de usuarios.
// No sabe nada de HTTP ni de cómo se guardan los datos: recibe el repositorio por parámetro
// (inyección de dependencias), así puede usar el repositorio en memoria o el de base de datos.

const { ROLES, STATUS, AUTH_PROVIDERS, toPublicUser } = require('../models/user');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('./errors');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function createUserService({ userRepository }) {
  if (!userRepository) {
    throw new Error('createUserService necesita un userRepository');
  }

  async function findUserOrFail(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  }

  return {
    /**
     * Alta de usuario. Las cuentas locales quedan pendientes de confirmar el correo;
     * las registradas con un proveedor externo (OAuth) quedan activas directamente.
     */
    async createUser({ email, role = ROLES.USER, authProvider = AUTH_PROVIDERS.LOCAL, passwordHash } = {}) {
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

      const user = await userRepository.create({
        email: normalizedEmail,
        role,
        authProvider,
        status: authProvider === AUTH_PROVIDERS.LOCAL ? STATUS.PENDING : STATUS.ACTIVE,
        ...(passwordHash ? { passwordHash } : {}),
      });
      return toPublicUser(user);
    },

    /** Marca la cuenta como confirmada (en el Hito 4 lo hará el enlace del correo). */
    async confirmUser(id) {
      const user = await findUserOrFail(id);
      if (user.status === STATUS.DELETED) {
        throw new NotFoundError('Usuario no encontrado');
      }
      if (user.status === STATUS.ACTIVE) return toPublicUser(user);
      return toPublicUser(await userRepository.update(id, { status: STATUS.ACTIVE }));
    },

    async getUserById(id) {
      return toPublicUser(await findUserOrFail(id));
    },

    /** Listado de usuarios con, al menos, email, rol y estado. */
    async listUsers() {
      const users = await userRepository.findAll();
      return users.map(toPublicUser);
    },

    /**
     * Un usuario está activo si ha confirmado su cuenta (o se registró con OAuth)
     * y no ha sido eliminado. No tiene nada que ver con estar conectado ahora mismo.
     */
    async isUserActive(id) {
      const user = await findUserOrFail(id);
      return user.status === STATUS.ACTIVE;
    },

    /**
     * Elimina un usuario. El administrador puede eliminar a cualquiera;
     * un usuario normal solo puede eliminar su propia cuenta.
     */
    async deleteUser(actor, targetId) {
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

      const deleted = await userRepository.update(targetId, {
        status: STATUS.DELETED,
        deletedAt: new Date().toISOString(),
      });
      return toPublicUser(deleted);
    },
  };
}

module.exports = { createUserService };
