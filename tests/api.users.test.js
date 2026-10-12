// Pruebas de la capa API de usuarios: peticiones HTTP reales contra la app en memoria.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer } = require('./helpers');

describe('API /api/users', () => {
  let srv;
  let admin;

  before(async () => {
    srv = await createTestServer();
    // El administrador se crea directamente en la capa de datos (en producción lo crea ensureAdmin al arrancar)
    admin = await srv.seedUser({ email: 'admin@grada.es', role: 'admin', password: 'clave-del-admin' });
  });

  after(() => srv.close());

  const registrar = async (email) => (await srv.request('POST', '/auth/register', {
    body: { email, password: 'aupa-atleti' },
  })).body;

  /** Inicia sesión y devuelve la cookie de sesión. */
  const entrar = async (email, password = 'aupa-atleti') => (await srv.request('POST', '/auth/login', {
    body: { email, password },
  })).cookie;

  test('todas las rutas de /api/users rechazan las peticiones sin sesión (401)', async () => {
    assert.equal((await srv.request('GET', '/users')).status, 401);
    assert.equal((await srv.request('GET', `/users/${admin.id}/active`)).status, 401);
    assert.equal((await srv.request('DELETE', `/users/${admin.id}`)).status, 401);
  });

  test('una cookie de sesión inventada no sirve (401)', async () => {
    const res = await srv.request('GET', '/users', { cookie: 'grada.sid=s%3Ainventada.firma-falsa' });

    assert.equal(res.status, 401);
  });

  test('GET lista los usuarios con email, rol y estado', async () => {
    await registrar('fan1@grada.es');

    const res = await srv.request('GET', '/users', { cookie: await entrar('admin@grada.es', 'clave-del-admin') });

    assert.equal(res.status, 200);
    assert.ok(res.body.some((u) => u.email === 'fan1@grada.es' && u.role === 'user' && u.status === 'active'));
  });

  test('GET /:id/active indica si el usuario está activo y 404 si no existe', async () => {
    const cookie = await entrar('admin@grada.es', 'clave-del-admin');
    const res = await srv.request('GET', `/users/${admin.id}/active`, { cookie });

    assert.deepEqual(res.body, { id: admin.id, active: true });
    assert.equal((await srv.request('GET', '/users/no-existe/active', { cookie })).status, 404);
  });

  test('DELETE de otro usuario siendo usuario normal devuelve 403', async () => {
    const a = await registrar('fan2@grada.es');
    const b = await registrar('fan3@grada.es');

    const res = await srv.request('DELETE', `/users/${b.id}`, { cookie: await entrar(a.email) });

    assert.equal(res.status, 403);
  });

  test('DELETE de la propia cuenta (204) y el admin puede eliminar a cualquiera (204)', async () => {
    const a = await registrar('fan4@grada.es');
    const b = await registrar('fan5@grada.es');

    assert.equal((await srv.request('DELETE', `/users/${a.id}`, { cookie: await entrar(a.email) })).status, 204);
    assert.equal((await srv.request('DELETE', `/users/${b.id}`, { cookie: await entrar(admin.email, 'clave-del-admin') })).status, 204);
  });

  test('un usuario normal no puede ver el listado de usuarios (403)', async () => {
    const res = await srv.request('GET', '/users', { cookie: await entrar((await registrar('fan6@grada.es')).email) });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  test('comprobar si un usuario está activo es solo del administrador: un usuario normal recibe 403, también con su cuenta', async () => {
    const yo = await registrar('fan7@grada.es');
    const cookie = await entrar(yo.email);

    assert.equal((await srv.request('GET', `/users/${yo.id}/active`, { cookie })).status, 403);
    assert.equal((await srv.request('GET', `/users/${admin.id}/active`, { cookie })).status, 403);
    assert.equal((await srv.request('GET', `/users/${yo.id}/active`, { cookie: await entrar(admin.email, 'clave-del-admin') })).status, 200);
  });

  test('PATCH /:id/role: el admin cambia roles y un usuario normal no puede (403)', async () => {
    const fan = await registrar('fan8@grada.es');
    const cookieAdmin = await entrar(admin.email, 'clave-del-admin');

    assert.equal((await srv.request('PATCH', `/users/${fan.id}/role`, { cookie: await entrar(fan.email), body: { role: 'admin' } })).status, 403);

    const ascenso = await srv.request('PATCH', `/users/${fan.id}/role`, { cookie: cookieAdmin, body: { role: 'admin' } });
    assert.equal(ascenso.status, 200);
    assert.equal(ascenso.body.role, 'admin');

    const invalido = await srv.request('PATCH', `/users/${fan.id}/role`, { cookie: cookieAdmin, body: { role: 'jefe' } });
    assert.equal(invalido.status, 400);

    assert.equal((await srv.request('PATCH', `/users/${fan.id}/role`, { cookie: cookieAdmin, body: { role: 'user' } })).body.role, 'user');
  });

  test('el último administrador no puede eliminarse a sí mismo (403)', async () => {
    const res = await srv.request('DELETE', `/users/${admin.id}`, { cookie: await entrar(admin.email, 'clave-del-admin') });

    assert.equal(res.status, 403);
  });

  test('una ruta de la API que no existe devuelve 404 en JSON', async () => {
    const res = await srv.request('GET', '/no-existe');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
