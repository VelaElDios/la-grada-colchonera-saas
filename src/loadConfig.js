// Construye la configuración a partir de las variables de entorno.
// Los secretos (SESSION_SECRET, DATABASE_URL, ADMIN_PASSWORD, SMTP_URL...) SOLO llegan por variables de
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
  if (env.SMTP_URL && !env.MAIL_FROM) {
    throw new Error('Con SMTP_URL hay que indicar también MAIL_FROM (el remitente de los correos)');
  }
  if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
    throw new Error('Para entrar con Google hacen falta GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET (las dos)');
  }
  if (env.PUBLIC_URL && !/^https?:\/\/[^/]+/.test(env.PUBLIC_URL)) {
    throw new Error('PUBLIC_URL debe empezar por http:// o https://');
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

    // Las cuentas locales quedan pendientes hasta que se confirma el correo (requisito 4.1).
    // Solo se puede desactivar a propósito con REQUIRE_EMAIL_CONFIRMATION=false.
    requireEmailConfirmation: env.REQUIRE_EMAIL_CONFIRMATION !== 'false',

    // URL pública de la aplicación, para los enlaces de los correos y la vuelta de OAuth.
    // Si no se indica, se usa la dirección con la que llega cada petición.
    publicUrl: env.PUBLIC_URL ? env.PUBLIC_URL.replace(/\/+$/, '') : null,

    // Inicio de sesión con proveedores externos (OAuth). Sin sus variables, el botón no aparece.
    oauth: Object.freeze({
      google: env.GOOGLE_CLIENT_ID
        ? Object.freeze({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET })
        : null,
    }),

    // Correo saliente (ver src/integrations/mailer.js). Sin SMTP_URL, los correos se escriben en el registro.
    mail: Object.freeze({
      smtpUrl: env.SMTP_URL || null,
      from: env.MAIL_FROM || 'La Grada Colchonera <no-responder@localhost>',
    }),

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
