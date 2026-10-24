// El repositorio del juego cumple el mismo contrato en memoria y en PostgreSQL (pg-mem o real).
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { createMemoryJuegoRepository } = require('../src/repositories/memoryJuegoRepository');
const { createPostgresJuegoRepository } = require('../src/repositories/postgresJuegoRepository');
const { createPostgresUserRepository } = require('../src/repositories/postgresUserRepository');
const { migrate } = require('../src/db/migrate');
const { createTestPool } = require('./testDatabase');

function contrato(nombre, fabrica) {
  describe(`juegoRepository (${nombre})`, () => {
    let repo;
    let nuevoUsuario;
    let cerrar = async () => {};

    before(async () => {
      const f = await fabrica();
      repo = f.repo;
      nuevoUsuario = f.nuevoUsuario;
      cerrar = f.cerrar || cerrar;
    });
    after(() => cerrar());

    test('crea el perfil una sola vez y lo devuelve con su versión', async () => {
      const id = await nuevoUsuario();
      assert.equal(await repo.getPerfil(id), null);
      assert.equal(await repo.crearPerfil(id, { jugadores: { a: { jefes: 0 } } }), true);
      assert.equal(await repo.crearPerfil(id, { jugadores: {} }), false);
      const p = await repo.getPerfil(id);
      assert.equal(p.version, 1);
      assert.deepEqual(p.datos, { jugadores: { a: { jefes: 0 } } });
    });

    test('guardar exige la versión leída (control de concurrencia)', async () => {
      const id = await nuevoUsuario();
      await repo.crearPerfil(id, { n: 1 });
      assert.equal(await repo.guardarPerfil(id, { n: 2 }, 1), true);
      assert.equal(await repo.guardarPerfil(id, { n: 3 }, 1), false); // versión vieja
      const p = await repo.getPerfil(id);
      assert.deepEqual([p.datos.n, p.version], [2, 2]);
    });

    test('un récord se guarda, se sustituye y el ranking sale ordenado', async () => {
      const [a, b] = [await nuevoUsuario(), await nuevoUsuario()];
      const base = { entrenador: 'cholo', jefes: 1, bajas: 10 };
      await repo.guardarRecord(a, { ...base, alias: 'ana', personaje: 'koke', tiempo: 300, nivel: 20 });
      await repo.guardarRecord(b, { ...base, alias: 'beto', personaje: 'oblak', tiempo: 800, nivel: 50 });
      await repo.guardarRecord(a, { ...base, alias: 'ana', personaje: 'koke', tiempo: 500, nivel: 33 });
      assert.equal((await repo.getRecord(a)).tiempo, 500);
      const lista = (await repo.mejoresRecords(50)).filter((r) => [a, b].includes(r.userId));
      assert.deepEqual(lista.map((r) => r.alias), ['beto', 'ana']);
      assert.equal((await repo.mejoresRecords(1)).length, 1);
    });
  });
}

contrato('memoria', async () => ({ repo: createMemoryJuegoRepository(), nuevoUsuario: async () => randomUUID() }));

contrato('PostgreSQL', async () => {
  const pool = await createTestPool();
  await migrate(pool);
  const usuarios = createPostgresUserRepository(pool);
  let n = 0;
  return {
    repo: createPostgresJuegoRepository(pool),
    nuevoUsuario: async () => (await usuarios.create({ email: `u${n += 1}@grada.es`, status: 'active', passwordHash: 'x' })).id,
    cerrar: () => pool.end(),
  };
});
