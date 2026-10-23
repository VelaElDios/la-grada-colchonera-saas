// Construye la aplicación Express sin arrancarla (así se puede usar en las pruebas).
// Es el único sitio donde se "enchufan" las capas: datos -> lógica -> API.
const path = require('node:path');
const express = require('express');
const session = require('express-session');

const defaultConfig = require('./config');
const { createMemoryUserRepository } = require('./repositories/memoryUserRepository');
const { createPasswordHasher } = require('./services/passwordHasher');
const { createUserService } = require('./services/userService');
const { createAccountConfirmationService } = require('./services/accountConfirmationService');
const { createTokenSigner } = require('./services/tokenSigner');
const { createMailer } = require('./integrations/mailer');
const { createOAuthClients } = require('./integrations/googleOAuth');
const { createApiRouter } = require('./api');
const { createLogger } = require('./logger');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function createApp({
  config = defaultConfig,
  userRepository = createMemoryUserRepository(),
  passwordHasher = createPasswordHasher(),
  sessionStore, // dónde se guardan las sesiones (sin indicarlo: en memoria)
  logger = createLogger({ level: config.logLevel || 'info' }),
  mailer = createMailer(config.mail, { logger }), // servicio de correo (SMTP o registro)
  oauthClients = createOAuthClients(config.oauth), // proveedores de inicio de sesión externos (Google)
} = {}) {
  const userService = createUserService({
    userRepository,
    passwordHasher,
    requireEmailConfirmation: config.requireEmailConfirmation,
  });
  const accountConfirmation = createAccountConfirmationService({
    userService,
    mailer,
    tokenSigner: createTokenSigner({ secret: config.sessionSecret }),
  });

  const app = express();

  // En Cloud Run (y en Render) la app está detrás de un proxy HTTPS: hace falta para que la cookie "secure" funcione
  if (config.isProduction) app.set('trust proxy', 1);

  app.use(express.json());
  // Un JSON mal formado falla en este punto, antes de llegar a la capa API: se responde igualmente en JSON
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json(req.path.startsWith('/api/prueba/')
        ? { error: 'JSON no válido' }
        : { error: { code: 'VALIDATION_ERROR', message: 'JSON no válido' } });
    }
    return next(err);
  });

  // Sesión en el servidor: el navegador solo guarda una cookie firmada con el identificador.
  // Con base de datos, las sesiones se guardan en la tabla "session" y sobreviven a los reinicios.
  app.use(session({
    store: sessionStore,
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
  app.use('/api', createApiRouter({ userService, accountConfirmation, oauthClients, config, logger }));

  // El backend sirve el frontend (mismo origen)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  return app;
}

module.exports = { createApp };
