// Base de datos para las pruebas.
// - Por defecto se usa pg-mem: un PostgreSQL emulado en memoria (no necesita servidor).
// - Si existe TEST_DATABASE_URL (por ejemplo, en el CI), se usa un PostgreSQL real. Cada prueba
//   trabaja en un esquema propio y vacío, así los ficheros de pruebas pueden ejecutarse en paralelo.
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { newDb } = require('pg-mem');

async function createTestPool() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    const db = newDb();
    const { Pool: MemoryPool } = db.adapters.createPg();
    return new MemoryPool();
  }

  const schema = `prueba_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();

  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
  const end = pool.end.bind(pool);
  pool.end = async () => {
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await end();
  };
  return pool;
}

module.exports = { createTestPool };
