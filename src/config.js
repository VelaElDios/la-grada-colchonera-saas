// Configuración de la aplicación a partir de variables de entorno (ver .env.example).

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction,
  // Mientras no exista el envío de correos (Hito 4), las cuentas locales quedan activas al
  // registrarse. Con REQUIRE_EMAIL_CONFIRMATION=true quedan pendientes hasta confirmar el correo.
  requireEmailConfirmation: process.env.REQUIRE_EMAIL_CONFIRMATION === 'true',
};

module.exports = config;
