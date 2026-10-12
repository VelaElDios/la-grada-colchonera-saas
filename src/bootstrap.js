// Arranque de la aplicación: decide dónde se guardan los datos y monta la app.
// - Con DATABASE_URL: PostgreSQL (aplica las migraciones pendientes) y sesiones en la BD.
// - Sin DATABASE_URL: todo en memoria (útil en desarrollo; los datos se pierden al reiniciar).
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');

const { createApp } = require('./app');
const { createPool } = require('./db/pool');
const { migrate } = require('./db/migrate');
const { createMemoryUserRepository } = require('./repositories/memoryUserRepository');
const { createPostgresUserRepository } = require('./repositories/postgresUserRepository');

/**
 * Prepara la capa de datos para la configuración dada.
 * @returns {Promise<{ userRepository, sessionStore, storage: string, close: () => Promise<void> }>}
 */
async function createDataLayer(config, { pool: givenPool } = {}) {
  if (!config.databaseUrl && !givenPool) {
    return {
      storage: 'memoria',
      userRepository: createMemoryUserRepository(),
      sessionStore: undefined,
      close: async () => {},
    };
  }

  const pool = givenPool || createPool(config.databaseUrl);
  await migrate(pool);

  const PgSessionStore = connectPgSimple(session);
  const sessionStore = new PgSessionStore({
    pool,
    tableName: 'session',
    createTableIfMissing: false, // la tabla la crean las migraciones
    pruneSessionInterval: givenPool ? false : 15 * 60, // borra las sesiones caducadas cada 15 min
  });

  return {
    storage: 'PostgreSQL',
    userRepository: createPostgresUserRepository(pool),
    sessionStore,
    close: async () => {
      sessionStore.close();
      await pool.end();
    },
  };
}

/** Crea la app lista para escuchar, con su capa de datos. */
async function bootstrap(config, options = {}) {
  const data = await createDataLayer(config, options);
  const app = createApp({ config, userRepository: data.userRepository, sessionStore: data.sessionStore });
  return { app, ...data };
}

module.exports = { bootstrap, createDataLayer };
