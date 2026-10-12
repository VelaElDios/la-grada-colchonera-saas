// Pruebas de la API de autenticación: registro e inicio de sesión locales.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer } = require('./helpers');

describe('API /api/auth', () => {
  let srv;

  before(async () => {
    srv = await createTestServer();
  });

  after(() => srv.close());

  describe('registro', () => {
    test('crea la cuenta (201) sin devolver nunca la contraseña ni su hash', async () => {
      const res = await srv.request('POST', '/auth/register', {
        body: { email: 'Fan@Grada.es', password: 'aupa-atleti' },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.email, 'fan@grada.es');
      assert.equal(res.body.role, 'user');
      assert.equal('password' in res.body, false);
      assert.equal('passwordHash' in res.body, false);
    });

    test('rechaza un email repetido (409), un email inválido (400) y una contraseña corta (400)', async () => {
      const repetido = await srv.request('POST', '/auth/register', { body: { email: 'fan@grada.es', password: 'otra-clave-1' } });
      const invalido = await srv.request('POST', '/auth/register', { body: { email: 'no-es-email', password: 'clave-larga' } });
      const corta = await srv.request('POST', '/auth/register', { body: { email: 'nuevo@grada.es', password: '123' } });

      assert.equal(repetido.status, 409);
      assert.equal(invalido.status, 400);
      assert.equal(corta.status, 400);
      assert.equal(corta.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('inicio de sesión', () => {
    test('con las credenciales correctas devuelve el usuario (200)', async () => {
      const res = await srv.request('POST', '/auth/login', { body: { email: 'fan@grada.es', password: 'aupa-atleti' } });

      assert.equal(res.status, 200);
      assert.equal(res.body.email, 'fan@grada.es');
    });

    test('con contraseña incorrecta o email desconocido devuelve 401 con el mismo mensaje', async () => {
      const malaClave = await srv.request('POST', '/auth/login', { body: { email: 'fan@grada.es', password: 'equivocada' } });
      const desconocido = await srv.request('POST', '/auth/login', { body: { email: 'nadie@grada.es', password: 'aupa-atleti' } });

      assert.equal(malaClave.status, 401);
      assert.equal(desconocido.status, 401);
      assert.equal(malaClave.body.error.message, desconocido.body.error.message);
    });
  });

  describe('con confirmación de correo obligatoria', () => {
    let srvConfirmacion;

    before(async () => {
      srvConfirmacion = await createTestServer({ config: { requireEmailConfirmation: true } });
    });

    after(() => srvConfirmacion.close());

    test('una cuenta recién registrada queda pendiente y no puede iniciar sesión (403)', async () => {
      const registro = await srvConfirmacion.request('POST', '/auth/register', {
        body: { email: 'pendiente@grada.es', password: 'aupa-atleti' },
      });
      const login = await srvConfirmacion.request('POST', '/auth/login', {
        body: { email: 'pendiente@grada.es', password: 'aupa-atleti' },
      });

      assert.equal(registro.body.status, 'pending');
      assert.equal(login.status, 403);
    });
  });
});
