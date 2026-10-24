const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../src/db/migrate');
const { createTestPool } = require('./testDatabase');

describe('Migraciones de la base de datos', () => {
  let pool;
  beforeEach(async () => { pool = await createTestPool(); });
  afterEach(async () => { await pool.end(); });

  test('crea las tablas de usuarios y de sesiones', async () => {
    const applied = await migrate(pool);
    assert.deepEqual(applied, ['001_crear_tabla_usuarios.sql', '002_crear_tabla_sesiones.sql', '003_crear_tablas_juego.sql']);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM users');
    assert.equal(rows[0].total, 0);
    await pool.query('SELECT sid, sess, expire FROM session');
  });

  test('es idempotente: la segunda vez no vuelve a aplicar nada', async () => {
    await migrate(pool);
    assert.deepEqual(await migrate(pool), []);
  });

  test('el email es único y el rol solo admite valores válidos', async () => {
    await migrate(pool);
    const insert = (id, email, role) => pool.query(
      'INSERT INTO users (id, email, role, status) VALUES ($1, $2, $3, $4)',
      [id, email, role, 'active'],
    );
    await insert('6f1c8a0e-1d1b-4f7e-9c1a-000000000001', 'koke@grada.es', 'user');
    await assert.rejects(insert('6f1c8a0e-1d1b-4f7e-9c1a-000000000002', 'koke@grada.es', 'user'));
    await assert.rejects(insert('6f1c8a0e-1d1b-4f7e-9c1a-000000000003', 'otro@grada.es', 'superadmin'));
  });
});
