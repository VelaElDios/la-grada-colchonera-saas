// Pruebas unitarias de la capa de lógica: reglas de gestión de usuarios.
const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { createUserService } = require('../src/services/userService');
const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');
const { ValidationError, ConflictError, ForbiddenError, NotFoundError } = require('../src/services/errors');
const { ROLES, STATUS, AUTH_PROVIDERS } = require('../src/models/user');

describe('Servicio de usuarios', () => {
  let service;

  beforeEach(() => {
    service = createUserService({ userRepository: createMemoryUserRepository() });
  });

  describe('alta', () => {
    test('una cuenta local nueva queda pendiente y no está activa', async () => {
      const user = await service.createUser({ email: 'koke@grada.es' });

      assert.equal(user.email, 'koke@grada.es');
      assert.equal(user.role, ROLES.USER);
      assert.equal(user.status, STATUS.PENDING);
      assert.equal(await service.isUserActive(user.id), false);
    });

    test('una cuenta registrada con OAuth queda activa directamente', async () => {
      const user = await service.createUser({ email: 'oblak@grada.es', authProvider: AUTH_PROVIDERS.GOOGLE });

      assert.equal(await service.isUserActive(user.id), true);
    });

    test('no permite registrar un email ya existente (sin distinguir mayúsculas)', async () => {
      await service.createUser({ email: 'griezmann@grada.es' });

      await assert.rejects(service.createUser({ email: '  GRIEZMANN@grada.es ' }), ConflictError);
    });

    test('rechaza un email con formato inválido', async () => {
      await assert.rejects(service.createUser({ email: 'esto-no-es-un-email' }), ValidationError);
    });

    test('no devuelve nunca el hash de la contraseña', async () => {
      const user = await service.createUser({ email: 'gimenez@grada.es', passwordHash: 'hash-secreto' });

      assert.equal('passwordHash' in user, false);
    });
  });

  describe('confirmación y estado', () => {
    test('al confirmar la cuenta pasa a estar activa', async () => {
      const user = await service.createUser({ email: 'llorente@grada.es' });

      await service.confirmUser(user.id);

      assert.equal(await service.isUserActive(user.id), true);
    });

    test('comprobar si está activo un usuario que no existe lanza NotFoundError', async () => {
      await assert.rejects(service.isUserActive('id-inexistente'), NotFoundError);
    });
  });

  describe('listado', () => {
    test('muestra email, rol y estado de cada usuario', async () => {
      await service.createUser({ email: 'torres@grada.es' });
      await service.createUser({ email: 'gabi@grada.es', role: ROLES.ADMIN });

      const users = await service.listUsers();

      assert.equal(users.length, 2);
      for (const user of users) {
        assert.ok(user.email);
        assert.ok(user.role);
        assert.ok(user.status);
      }
    });
  });

  describe('eliminación', () => {
    test('un usuario normal no puede eliminar a otro usuario', async () => {
      const usuario = await service.createUser({ email: 'saul@grada.es' });
      const otro = await service.createUser({ email: 'correa@grada.es' });

      await assert.rejects(service.deleteUser(usuario, otro.id), ForbiddenError);
    });

    test('un usuario normal puede eliminar su propia cuenta y deja de estar activo', async () => {
      const usuario = await service.createUser({ email: 'lino@grada.es' });
      await service.confirmUser(usuario.id);

      await service.deleteUser(usuario, usuario.id);

      assert.equal(await service.isUserActive(usuario.id), false);
    });

    test('el administrador puede eliminar a cualquier usuario', async () => {
      const admin = await service.createUser({ email: 'admin@grada.es', role: ROLES.ADMIN });
      const usuario = await service.createUser({ email: 'molina@grada.es' });

      const eliminado = await service.deleteUser(admin, usuario.id);

      assert.equal(eliminado.status, STATUS.DELETED);
    });

    test('un usuario eliminado no puede eliminar a nadie', async () => {
      const usuario = await service.createUser({ email: 'riquelme@grada.es' });
      const eliminado = await service.deleteUser(usuario, usuario.id);

      await assert.rejects(service.deleteUser(eliminado, usuario.id), ForbiddenError);
    });
  });
});
