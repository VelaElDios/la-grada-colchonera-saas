// Configuración de la aplicación a partir de variables de entorno (ver .env.example).

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction,

  // Secreto con el que se firma la cookie de sesión. En producción es obligatorio.
  sessionSecret: process.env.SESSION_SECRET || (isProduction ? null : 'secreto-solo-para-desarrollo-local'),
  sessionCookieName: 'grada.sid',

  // Base de datos PostgreSQL (Neon). Sin ella, los datos se guardan en memoria (desarrollo y pruebas).
  databaseUrl: process.env.DATABASE_URL || null,

  // Mientras no exista el envío de correos (Hito 4), las cuentas locales quedan activas al
  // registrarse. Con REQUIRE_EMAIL_CONFIRMATION=true quedan pendientes hasta confirmar el correo.
  requireEmailConfirmation: process.env.REQUIRE_EMAIL_CONFIRMATION === 'true',
};

if (!config.sessionSecret) {
  throw new Error('Falta la variable de entorno SESSION_SECRET (obligatoria en producción)');
}

module.exports = config;
