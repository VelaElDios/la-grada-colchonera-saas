// Migraciones: crean y actualizan el esquema de la base de datos de forma ordenada.
// Cada fichero de src/db/migrations se ejecuta una sola vez, en orden alfabético,
// y queda anotado en la tabla schema_migrations.
const fs = require('node:fs/promises');
const path = require('node:path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Aplica las migraciones pendientes. Devuelve la lista de las que se han aplicado ahora.
 * @param {import('pg').Pool} pool
 */
async function migrate(pool, { dir = MIGRATIONS_DIR } = {}) {
  const { rows: existing } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'schema_migrations'",
  );
  if (existing.length === 0) {
    await pool.query(`
      CREATE TABLE schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.name));

  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.sql')).sort();
  const appliedNow = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    appliedNow.push(file);
  }
  return appliedNow;
}

// Uso desde la terminal: npm run db:migrate (lee DATABASE_URL del entorno o del .env)
if (require.main === module) {
  const config = require('../config');
  const { createPool } = require('./pool');
  const pool = createPool(config.databaseUrl);
  migrate(pool)
    .then((done) => console.log(done.length ? `Migraciones aplicadas: ${done.join(', ')}` : 'La base de datos ya está al día'))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { migrate };
