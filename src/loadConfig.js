// Construye la configuración a partir de las variables de entorno.
// Los secretos (SESSION_SECRET, DATABASE_URL, ADMIN_PASSWORD...) SOLO llegan por variables de
// entorno: nunca se escriben en el código ni se suben al repositorio.
const { randomBytes } = require('node:crypto');
const { parseAllowedDomains } = require('./services/domainPolicy');

// Sin ellas la aplicación no puede funcionar de forma segura en producción
const REQUIRED_IN_PRODUCTION = ['SESSION_SECRET', 'DATABASE_URL'];
const MIN_SESSION_SECRET_LENGTH = 32;

/**
 * @param {Record<string, string | undefined>} env Normalmente process.env
 */
function loadConfig(env) {
  const isProduction = env.NODE_ENV === 'production';

  if (isProduction) {
    const missing = REQUIRED_IN_PRODUCTION.filter((name) => !env[name]);
    if (missing.length > 0) {
      throw new Error(`Faltan variables de entorno obligatorias en producción: ${missing.join(', ')}`);
    }
    if (env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
      throw new Error(`SESSION_SECRET debe tener al menos ${MIN_SESSION_SECRET_LENGTH} caracteres`);
    }
  }

  return Object.freeze({
    port: Number(env.PORT) || 3000,
    isProduction,

    // Secreto con el que se firma la cookie de sesión. En desarrollo, si no se indica, se genera
    // uno aleatorio en cada arranque (las sesiones se pierden al reiniciar, pero no hay secretos en el código).
    sessionSecret: env.SESSION_SECRET || randomBytes(32).toString('hex'),
    sessionCookieName: 'grada.sid',

    // Base de datos PostgreSQL (Neon). Sin ella (solo en desarrollo), los datos se guardan en memoria.
    databaseUrl: env.DATABASE_URL || null,

    // Mientras no exista el envío de correos (Hito 4), las cuentas locales quedan activas al
    // registrarse. Con REQUIRE_EMAIL_CONFIRMATION=true quedan pendientes hasta confirmar el correo.
    requireEmailConfirmation: env.REQUIRE_EMAIL_CONFIRMATION === 'true',

    // Nivel de detalle del registro de actividad: debug, info, warn, error o silent.
    // Durante las pruebas automáticas (node --test) no se escribe nada salvo que se indique.
    logLevel: env.LOG_LEVEL || (env.NODE_TEST_CONTEXT ? 'silent' : 'info'),

    // Dominios de correo permitidos (separados por comas). Solo por variable de entorno.
    allowedDomains: parseAllowedDomains(env.ALLOWED_DOMAINS),

    // Primer administrador: se crea (o se promociona) al arrancar si se indica su email
    admin: env.ADMIN_EMAIL ? Object.freeze({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD || null }) : null,
  });
}

module.exports = { loadConfig, REQUIRED_IN_PRODUCTION };
