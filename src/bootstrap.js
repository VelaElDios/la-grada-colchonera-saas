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
const { createMemoryJuegoRepository } = require('./repositories/memoryJuegoRepository');
const { createPostgresJuegoRepository } = require('./repositories/postgresJuegoRepository');
const { createPasswordHasher } = require('./services/passwordHasher');
const { createUserService } = require('./services/userService');
const { createLogger } = require('./logger');
const { createMailer } = require('./integrations/mailer');

/**
 * Prepara la capa de datos para la configuración dada.
 * @returns {Promise<{ userRepository, sessionStore, storage: string, close: () => Promise<void> }>}
 */
async function createDataLayer(config, { pool: givenPool } = {}) {
  if (!config.databaseUrl && !givenPool) {
    return {
      storage: 'memoria',
      userRepository: createMemoryUserRepository(),
      juegoRepository: createMemoryJuegoRepository(),
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
    juegoRepository: createPostgresJuegoRepository(pool),
    sessionStore,
    close: async () => {
      sessionStore.close();
      await pool.end();
    },
  };
}

/** Crea la app lista para escuchar, con su capa de datos y el primer administrador. */
async function bootstrap(config, options = {}) {
  const logger = options.logger || createLogger({ level: config.logLevel || 'info' });
  const data = await createDataLayer(config, options);
  logger.info('app.storage', `Datos guardados en ${data.storage}`, { storage: data.storage });
  if (data.storage === 'memoria') {
    logger.warn('app.storage', 'Sin DATABASE_URL: los datos se perderán al reiniciar');
  }

  const passwordHasher = options.passwordHasher || createPasswordHasher();

  let admin = null;
  if (config.admin) {
    const userService = createUserService({ userRepository: data.userRepository, passwordHasher });
    admin = await userService.ensureAdmin(config.admin);
    if (admin.action !== 'unchanged') {
      logger.info('admin.bootstrap', admin.action === 'created' ? 'Primer administrador creado' : 'Cuenta promocionada a administrador', {
        userId: admin.user.id,
        email: admin.user.email,
      });
    }
  }

  const mailer = options.mailer || createMailer(config.mail, { logger });
  if (mailer.kind === 'SMTP') {
    logger.info('app.mail', 'Correo saliente por SMTP', { from: config.mail.from });
  } else if (config.requireEmailConfirmation) {
    logger.warn('app.mail', 'Sin SMTP_URL: los enlaces de confirmación se escriben en el registro en lugar de enviarse');
  }

  const app = createApp({
    mailer,
    config,
    userRepository: data.userRepository,
    juegoRepository: data.juegoRepository,
    sessionStore: data.sessionStore,
    passwordHasher,
    logger,
  });
  return { app, admin, logger, ...data };
}

module.exports = { bootstrap, createDataLayer };
