// Capa API (presentación del backend): define las rutas HTTP y delega en la capa de lógica.
const express = require('express');

const { createAuthRouter } = require('./auth');
const { createUsersRouter } = require('./users');
const { createPruebaRouter } = require('./prueba');
const { currentUser, requireAuth } = require('./currentUser');
const { errorHandler, notFoundHandler } = require('./errorHandler');
const { requestLogger } = require('./requestLogger');

function createApiRouter({ userService, accountConfirmation, config, logger }) {
  const router = express.Router();

  router.use(requestLogger({ logger }));
  router.use(currentUser({ userService }));

  // Comprobación de que el servidor está vivo (útil para el despliegue y el CI)
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/auth', createAuthRouter({
    userService,
    accountConfirmation,
    sessionCookieName: config.sessionCookieName,
    publicUrl: config.publicUrl,
  }));
  // Público (sin sesión): comprueba si el dominio de un email está permitido
  router.use('/prueba', createPruebaRouter({ allowedDomains: config.allowedDomains || [] }));
  // Rutas protegidas: solo con sesión iniciada
  router.use('/users', requireAuth, createUsersRouter({ userService }));

  router.use(notFoundHandler);
  router.use(errorHandler);

  return router;
}

module.exports = { createApiRouter };
