// Pruebas unitarias de la capa de lógica: reglas de gestión de usuarios.
const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { createUserService } = require('../src/services/userService');
const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');
const {
  ValidationError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, AccountPendingError,
} = require('../src/services/errors');
const { createPasswordHasher } = require('../src/services/passwordHasher');
const { ROLES, STATUS, AUTH_PROVIDERS } = require('../src/models/user');

describe('Servicio de usuarios', () => {
  let service;
  let repo;
  const passwordHasher = createPasswordHasher({ rounds: 4 });

  beforeEach(() => {
    repo = createMemoryUserRepository();
    service = createUserService({ userRepository: repo, passwordHasher });
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

  describe('roles y primer administrador', () => {
    test('un administrador puede dar y quitar el rol de administrador', async () => {
      const admin = await service.createUser({ email: 'admin@grada.es', role: ROLES.ADMIN, authProvider: AUTH_PROVIDERS.GOOGLE });
      const usuario = await service.createUser({ email: 'gimenez@grada.es', authProvider: AUTH_PROVIDERS.GOOGLE });

      assert.equal((await service.changeRole(admin, usuario.id, ROLES.ADMIN)).role, ROLES.ADMIN);
      assert.equal((await service.changeRole(admin, usuario.id, ROLES.USER)).role, ROLES.USER);
    });

    test('un usuario normal no puede cambiar roles', async () => {
      const usuario = await service.createUser({ email: 'llorente@grada.es', authProvider: AUTH_PROVIDERS.GOOGLE });
      await assert.rejects(service.changeRole(usuario, usuario.id, ROLES.ADMIN), ForbiddenError);
    });

    test('un rol que no existe se rechaza', async () => {
      const admin = await service.createUser({ email: 'admin@grada.es', role: ROLES.ADMIN, authProvider: AUTH_PROVIDERS.GOOGLE });
      await assert.rejects(service.changeRole(admin, admin.id, 'superadmin'), ValidationError);
    });

    test('siempre queda al menos un administrador: no se puede degradar ni eliminar al último', async () => {
      const admin = await service.createUser({ email: 'admin@grada.es', role: ROLES.ADMIN, authProvider: AUTH_PROVIDERS.GOOGLE });

      await assert.rejects(service.changeRole(admin, admin.id, ROLES.USER), ForbiddenError);
      await assert.rejects(service.deleteUser(admin, admin.id), ForbiddenError);

      const otro = await service.createUser({ email: 'admin2@grada.es', role: ROLES.ADMIN, authProvider: AUTH_PROVIDERS.GOOGLE });
      await service.deleteUser(otro, admin.id); // con dos administradores, sí
      assert.equal(await service.isUserActive(admin.id), false);
    });

    test('ensureAdmin crea el primer administrador, activo y con su contraseña', async () => {
      const { user, action } = await service.ensureAdmin({ email: 'Presi@Grada.es', password: 'cholismo-2026' });

      assert.equal(action, 'created');
      assert.equal(user.email, 'presi@grada.es');
      assert.equal(user.role, ROLES.ADMIN);
      assert.equal(user.status, STATUS.ACTIVE);
      assert.equal((await service.authenticate({ email: 'presi@grada.es', password: 'cholismo-2026' })).role, ROLES.ADMIN);
    });

    test('ensureAdmin promociona una cuenta existente y es idempotente', async () => {
      const koke = await service.registerUser({ email: 'koke@grada.es', password: 'capitan-rojiblanco' });
      await service.confirmUser(koke.id);

      assert.equal((await service.ensureAdmin({ email: 'koke@grada.es' })).action, 'promoted');
      assert.equal((await service.ensureAdmin({ email: 'koke@grada.es' })).action, 'unchanged');
      // la contraseña de la cuenta no cambia
      assert.equal((await service.authenticate({ email: 'koke@grada.es', password: 'capitan-rojiblanco' })).role, ROLES.ADMIN);
    });

    test('ensureAdmin exige una contraseña válida para crear la cuenta', async () => {
      await assert.rejects(service.ensureAdmin({ email: 'nuevo@grada.es' }), ValidationError);
      await assert.rejects(service.ensureAdmin({ email: 'nuevo@grada.es', password: 'corta' }), ValidationError);
      await assert.rejects(service.ensureAdmin({ email: 'no-es-un-email', password: 'larga-suficiente' }), ValidationError);
    });
  });

  describe('registro e inicio de sesión', () => {
    test('el registro guarda un hash de la contraseña, nunca la contraseña en claro', async () => {
      const user = await service.registerUser({ email: 'simeone@grada.es', password: 'partido-a-partido' });

      const guardado = await repo.findById(user.id);
      assert.ok(guardado.passwordHash);
      assert.notEqual(guardado.passwordHash, 'partido-a-partido');
      assert.equal(await passwordHasher.verify('partido-a-partido', guardado.passwordHash), true);
    });

    test('el registro rechaza contraseñas de menos de 8 caracteres', async () => {
      await assert.rejects(service.registerUser({ email: 'cerezo@grada.es', password: '1234567' }), ValidationError);
    });

    test('inicia sesión con las credenciales correctas de una cuenta activa', async () => {
      const user = await service.registerUser({ email: 'arda@grada.es', password: 'partido-a-partido' });
      await service.confirmUser(user.id);

      const autenticado = await service.authenticate({ email: 'ARDA@grada.es', password: 'partido-a-partido' });

      assert.equal(autenticado.id, user.id);
    });

    test('con contraseña incorrecta o email desconocido lanza UnauthorizedError', async () => {
      const user = await service.registerUser({ email: 'diego@grada.es', password: 'partido-a-partido' });
      await service.confirmUser(user.id);

      await assert.rejects(service.authenticate({ email: 'diego@grada.es', password: 'otra-clave' }), UnauthorizedError);
      await assert.rejects(service.authenticate({ email: 'nadie@grada.es', password: 'partido-a-partido' }), UnauthorizedError);
    });

    test('una cuenta pendiente de confirmar no puede iniciar sesión', async () => {
      await service.registerUser({ email: 'joao@grada.es', password: 'partido-a-partido' });

      await assert.rejects(service.authenticate({ email: 'joao@grada.es', password: 'partido-a-partido' }), AccountPendingError);
    });

    test('una cuenta eliminada no puede volver a iniciar sesión (para el login ya no existe)', async () => {
      const user = await service.registerUser({ email: 'witsel@grada.es', password: 'partido-a-partido' });
      await service.confirmUser(user.id);
      await service.deleteUser(user, user.id);

      await assert.rejects(service.authenticate({ email: 'witsel@grada.es', password: 'partido-a-partido' }), UnauthorizedError);
    });

    test('tras darse de baja, el email queda libre: se puede registrar de nuevo o entrar con Google (cuenta nueva)', async () => {
      const vieja = await service.registerUser({ email: 'witsel@grada.es', password: 'partido-a-partido' });
      await service.confirmUser(vieja.id);
      await service.deleteUser(vieja, vieja.id);

      const nueva = await service.registerUser({ email: 'witsel@grada.es', password: 'otra-clave-123' });
      assert.notEqual(nueva.id, vieja.id);
      assert.equal(nueva.status, STATUS.PENDING);
      await assert.rejects(service.registerUser({ email: 'witsel@grada.es', password: 'otra-clave-123' }), ConflictError);
      assert.equal((await service.getUserById(vieja.id)).status, STATUS.DELETED); // la eliminada se conserva

      await service.deleteUser(nueva, nueva.id);
      const { user: conGoogle, created } = await service.loginWithOAuth({ provider: 'google', email: 'witsel@grada.es', emailVerified: true });
      assert.equal(created, true);
      assert.equal(conGoogle.status, STATUS.ACTIVE);
      assert.ok(![vieja.id, nueva.id].includes(conGoogle.id));
    });

    test('sin confirmación de correo obligatoria, la cuenta queda activa al registrarse', async () => {
      const sinConfirmacion = createUserService({ userRepository: createMemoryUserRepository(), passwordHasher, requireEmailConfirmation: false });

      const user = await sinConfirmacion.registerUser({ email: 'nahuel@grada.es', password: 'partido-a-partido' });

      assert.equal(user.status, STATUS.ACTIVE);
    });
  });
});
