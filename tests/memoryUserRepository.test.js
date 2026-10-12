// Pruebas de la capa de acceso a datos en memoria.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');

test('create asigna id y createdAt y se puede buscar por id y por email', async () => {
  const repo = createMemoryUserRepository();

  const user = await repo.create({ email: 'fan@grada.es' });

  assert.ok(user.id);
  assert.ok(user.createdAt);
  assert.deepEqual(await repo.findById(user.id), user);
  assert.deepEqual(await repo.findByEmail('fan@grada.es'), user);
  assert.equal(await repo.findById('no-existe'), null);
});

test('los datos devueltos son copias: modificarlos no altera lo guardado', async () => {
  const repo = createMemoryUserRepository();
  const user = await repo.create({ email: 'fan@grada.es' });

  user.email = 'otro@grada.es';

  assert.equal((await repo.findById(user.id)).email, 'fan@grada.es');
});

test('update modifica solo los campos indicados', async () => {
  const repo = createMemoryUserRepository();
  const user = await repo.create({ email: 'fan@grada.es', status: 'pending' });

  const updated = await repo.update(user.id, { status: 'active' });

  assert.equal(updated.status, 'active');
  assert.equal(updated.email, 'fan@grada.es');
  assert.equal(await repo.update('no-existe', { status: 'active' }), null);
});
