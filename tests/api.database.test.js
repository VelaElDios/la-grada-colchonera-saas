// Prueba de extremo a extremo con base de datos: registro, inicio de sesión y sesión guardada en PostgreSQL.
// Necesita un PostgreSQL real (TEST_DATABASE_URL): se ejecuta en el CI y se omite en local si no lo hay.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { createDataLayer } = require('../src/bootstrap');
const { createApp } = require('../src/app');
const { createPasswordHasher } = require('../src/services/passwordHasher');
const { createTestPool, REAL_DATABASE } = require('./testDatabase');

describe('API con PostgreSQL', { skip: !REAL_DATABASE && 'necesita TEST_DATABASE_URL' }, () => {
  let pool;
  let data;
  let server;
  let baseUrl;

  before(async () => {
    pool = await createTestPool();
    data = await createDataLayer({}, { pool });
    const app = createApp({
      config: { isProduction: false, requireEmailConfirmation: false, sessionSecret: 'secreto', sessionCookieName: 'grada.sid' },
      userRepository: data.userRepository,
      sessionStore: data.sessionStore,
      passwordHasher: createPasswordHasher({ rounds: 4 }),
    });
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    server.close();
    await data.close();
  });

  const call = async (method, path, { body, cookie } = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, cookie: setCookie && setCookie.split(';')[0] };
  };

  test('el usuario registrado y su sesión quedan guardados en la base de datos', async () => {
    const credenciales = { email: 'griezmann@grada.es', password: 'rojiblanco7' };
    assert.equal((await call('POST', '/auth/register', { body: credenciales })).status, 201);

    const { rows: usuarios } = await pool.query('SELECT email, password_hash FROM users');
    assert.equal(usuarios.length, 1);
    assert.equal(usuarios[0].email, 'griezmann@grada.es');
    assert.notEqual(usuarios[0].password_hash, 'rojiblanco7'); // solo se guarda el hash

    const login = await call('POST', '/auth/login', { body: credenciales });
    assert.equal(login.status, 200);
    const { rows: sesiones } = await pool.query('SELECT sid FROM session');
    assert.equal(sesiones.length, 1);

    const me = await call('GET', '/auth/me', { cookie: login.cookie });
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'griezmann@grada.es');

    assert.equal((await call('POST', '/auth/logout', { cookie: login.cookie })).status, 204);
    const { rows: tras } = await pool.query('SELECT sid FROM session');
    assert.equal(tras.length, 0);
    assert.equal((await call('GET', '/auth/me', { cookie: login.cookie })).status, 401);
  });
});
