// Construye la aplicación Express sin arrancarla (así se puede usar en las pruebas).
// Es el único sitio donde se "enchufan" las capas: datos -> lógica -> API.
const path = require('node:path');
const express = require('express');
const session = require('express-session');

const defaultConfig = require('./config');
const { createMemoryUserRepository } = require('./repositories/memoryUserRepository');
const { createPasswordHasher } = require('./services/passwordHasher');
const { createUserService } = require('./services/userService');
const { createApiRouter } = require('./api');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function createApp({
  config = defaultConfig,
  userRepository = createMemoryUserRepository(),
  passwordHasher = createPasswordHasher(),
} = {}) {
  const userService = createUserService({
    userRepository,
    passwordHasher,
    requireEmailConfirmation: config.requireEmailConfirmation,
  });

  const app = express();

  // En Render la app está detrás de un proxy HTTPS: hace falta para que la cookie "secure" funcione
  if (config.isProduction) app.set('trust proxy', 1);

  app.use(express.json());

  // Sesión en el servidor: el navegador solo guarda una cookie firmada con el identificador.
  // (En el Hito 3 las sesiones pasarán a guardarse en la base de datos.)
  app.use(session({
    name: config.sessionCookieName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // no accesible desde JavaScript
      sameSite: 'lax',
      secure: config.isProduction, // solo por HTTPS en producción
      maxAge: SEVEN_DAYS_MS, // la sesión sobrevive a recargas y a cerrar el navegador
    },
  }));

  // Capa API: toda la comunicación cliente-servidor pasa por /api
  app.use('/api', createApiRouter({ userService, config }));

  // El backend sirve el frontend (mismo origen)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  return app;
}

module.exports = { createApp };
