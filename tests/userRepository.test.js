// Pruebas de la capa de acceso a datos. Las dos implementaciones (memoria y PostgreSQL)
// deben cumplir el mismo contrato, así que se les pasan exactamente las mismas pruebas.
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');
const { createPostgresUserRepository } = require('../src/repositories/postgresUserRepository');
const { migrate } = require('../src/db/migrate');
const { createTestPool } = require('./testDatabase');

const IMPLEMENTATIONS = [
  { name: 'memoria', setup: async () => ({ repo: createMemoryUserRepository(), teardown: async () => {} }) },
  {
    name: 'PostgreSQL',
    setup: async () => {
      const pool = await createTestPool();
      await migrate(pool);
      return { repo: createPostgresUserRepository(pool), teardown: () => pool.end() };
    },
  },
];

const nuevoUsuario = (email, extra = {}) => ({
  email,
  role: 'user',
  status: 'active',
  authProvider: 'local',
  passwordHash: 'hash-de-prueba',
  ...extra,
});

for (const { name, setup } of IMPLEMENTATIONS) {
  describe(`Repositorio de usuarios (${name})`, () => {
    let repo;
    let teardown;
    beforeEach(async () => { ({ repo, teardown } = await setup()); });
    afterEach(async () => { await teardown(); });

    test('create asigna id y createdAt y se puede buscar por id y por email', async () => {
      const user = await repo.create(nuevoUsuario('fan@grada.es'));

      assert.ok(user.id);
      assert.ok(!Number.isNaN(Date.parse(user.createdAt)));
      assert.equal(user.passwordHash, 'hash-de-prueba');
      assert.deepEqual(await repo.findById(user.id), user);
      assert.deepEqual(await repo.findByEmail('fan@grada.es'), user);
    });

    test('buscar algo que no existe devuelve null', async () => {
      assert.equal(await repo.findById('no-existe'), null);
      assert.equal(await repo.findById('00000000-0000-4000-8000-000000000000'), null);
      assert.equal(await repo.findByEmail('nadie@grada.es'), null);
    });

    test('los datos devueltos son copias: modificarlos no altera lo guardado', async () => {
      const user = await repo.create(nuevoUsuario('fan@grada.es'));
      user.email = 'otro@grada.es';
      assert.equal((await repo.findById(user.id)).email, 'fan@grada.es');
    });

    test('findAll devuelve todos los usuarios', async () => {
      await repo.create(nuevoUsuario('koke@grada.es'));
      await repo.create(nuevoUsuario('oblak@grada.es', { role: 'admin' }));
      const emails = (await repo.findAll()).map((u) => u.email).sort();
      assert.deepEqual(emails, ['koke@grada.es', 'oblak@grada.es']);
    });

    test('update modifica solo los campos indicados', async () => {
      const user = await repo.create(nuevoUsuario('fan@grada.es', { status: 'pending' }));
      const deletedAt = new Date().toISOString();

      const updated = await repo.update(user.id, { status: 'deleted', deletedAt });

      assert.equal(updated.status, 'deleted');
      assert.equal(updated.deletedAt, deletedAt);
      assert.equal(updated.email, 'fan@grada.es');
      assert.equal(updated.role, 'user');
      assert.equal(await repo.update('00000000-0000-4000-8000-000000000000', { status: 'active' }), null);
    });

    test('una cuenta eliminada no ocupa su email: findByEmail la ignora y se puede crear otra', async () => {
      const vieja = await repo.create(nuevoUsuario('fan@grada.es'));
      await repo.update(vieja.id, { status: 'deleted', deletedAt: new Date().toISOString(), apodoClave: null });
      assert.equal(await repo.findByEmail('fan@grada.es'), null);

      const nueva = await repo.create(nuevoUsuario('fan@grada.es'));
      assert.equal((await repo.findByEmail('fan@grada.es')).id, nueva.id);
      assert.equal((await repo.findById(vieja.id)).status, 'deleted');
      assert.equal((await repo.findAll()).length, 2);
    });

    test('update puede cambiar el rol', async () => {
      const user = await repo.create(nuevoUsuario('simeone@grada.es'));
      assert.equal((await repo.update(user.id, { role: 'admin' })).role, 'admin');
      assert.equal((await repo.findById(user.id)).role, 'admin');
    });

    test('el mote se guarda normalizado y se busca por él; no se repite', async () => {
      const a = await repo.create(nuevoUsuario('a@grada.es'));
      const b = await repo.create(nuevoUsuario('b@grada.es'));
      const conMote = await repo.update(a.id, { apodo: 'El Niño', apodoClave: 'el nino', avatar: 'p:torres' });
      assert.equal(conMote.apodo, 'El Niño');
      assert.equal(conMote.avatar, 'p:torres');
      assert.equal((await repo.findByApodo('el nino')).id, a.id);
      assert.equal(await repo.findByApodo('nadie'), null);
      if (name === 'PostgreSQL') await assert.rejects(repo.update(b.id, { apodo: 'EL NIÑO', apodoClave: 'el nino' }));
    });
  });
}
