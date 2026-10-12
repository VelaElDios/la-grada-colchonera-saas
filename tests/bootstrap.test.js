// Pruebas del arranque: capa de datos y primer administrador.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { bootstrap } = require('../src/bootstrap');
const { createPasswordHasher } = require('../src/services/passwordHasher');

const BASE = { isProduction: false, requireEmailConfirmation: false, sessionSecret: 'x'.repeat(40), sessionCookieName: 'grada.sid' };
const passwordHasher = createPasswordHasher({ rounds: 4 });

test('sin DATABASE_URL los datos se guardan en memoria', async () => {
  const { storage, admin, close } = await bootstrap({ ...BASE, databaseUrl: null }, { passwordHasher });
  assert.equal(storage, 'memoria');
  assert.equal(admin, null);
  await close();
});

test('con ADMIN_EMAIL y ADMIN_PASSWORD se crea el primer administrador, que puede iniciar sesión', async () => {
  const { app, admin, userRepository, close } = await bootstrap(
    { ...BASE, databaseUrl: null, admin: { email: 'presi@grada.es', password: 'cholismo-2026' } },
    { passwordHasher },
  );
  assert.equal(admin.action, 'created');
  assert.equal((await userRepository.findByEmail('presi@grada.es')).role, 'admin');

  const server = app.listen(0);
  try {
    const res = await fetch(`http://localhost:${server.address().port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'presi@grada.es', password: 'cholismo-2026' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).role, 'admin');
  } finally {
    server.close();
    await close();
  }
});
