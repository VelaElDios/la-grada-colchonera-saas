// Pruebas de la capa API de usuarios: peticiones HTTP reales contra la app en memoria.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');
const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');

describe('API /api/users', () => {
  let server;
  let baseUrl;
  let admin;

  before(async () => {
    const userRepository = createMemoryUserRepository();
    // El primer administrador se crea directamente en la capa de datos (en el Hito 3 lo hará un script)
    admin = await userRepository.create({ email: 'admin@grada.es', role: 'admin', status: 'active', authProvider: 'local' });
    server = createApp({ userRepository }).listen(0);
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(() => server.close());

  const post = (path, body) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const del = (path, userId) => fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: userId ? { 'X-User-Id': userId } : {},
  });

  test('POST crea un usuario pendiente (201) y nunca con rol admin aunque se pida', async () => {
    const res = await post('/users', { email: 'fan1@grada.es', role: 'admin' });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.status, 'pending');
    assert.equal(body.role, 'user');
  });

  test('POST con email repetido devuelve 409 y con email inválido 400', async () => {
    assert.equal((await post('/users', { email: 'fan1@grada.es' })).status, 409);
    assert.equal((await post('/users', { email: 'no-valido' })).status, 400);
  });

  test('GET lista los usuarios con email, rol y estado', async () => {
    const res = await fetch(`${baseUrl}/users`);
    const users = await res.json();

    assert.equal(res.status, 200);
    assert.ok(users.some((u) => u.email === 'fan1@grada.es' && u.role === 'user' && u.status === 'pending'));
  });

  test('GET /:id/active indica si el usuario está activo y 404 si no existe', async () => {
    const res = await fetch(`${baseUrl}/users/${admin.id}/active`);
    assert.deepEqual(await res.json(), { id: admin.id, active: true });
    assert.equal((await fetch(`${baseUrl}/users/no-existe/active`)).status, 404);
  });

  test('DELETE sin identificarse devuelve 401', async () => {
    assert.equal((await del(`/users/${admin.id}`)).status, 401);
  });

  test('DELETE de otro usuario siendo usuario normal devuelve 403', async () => {
    const a = await (await post('/users', { email: 'fan2@grada.es' })).json();
    const b = await (await post('/users', { email: 'fan3@grada.es' })).json();

    assert.equal((await del(`/users/${b.id}`, a.id)).status, 403);
  });

  test('DELETE de la propia cuenta (204) y el admin puede eliminar a cualquiera (204)', async () => {
    const a = await (await post('/users', { email: 'fan4@grada.es' })).json();
    const b = await (await post('/users', { email: 'fan5@grada.es' })).json();

    assert.equal((await del(`/users/${a.id}`, a.id)).status, 204);
    assert.equal((await del(`/users/${b.id}`, admin.id)).status, 204);
  });

  test('una ruta de la API que no existe devuelve 404 en JSON', async () => {
    const res = await fetch(`${baseUrl}/no-existe`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  });
});
