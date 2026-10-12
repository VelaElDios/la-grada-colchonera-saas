// Capa API (presentación del backend): define las rutas HTTP y delega en la capa de lógica.
const express = require('express');

const { createUsersRouter } = require('./users');
const { currentUser } = require('./currentUser');
const { errorHandler, notFoundHandler } = require('./errorHandler');

function createApiRouter({ userService }) {
  const router = express.Router();

  router.use(currentUser({ userService }));

  // Comprobación de que el servidor está vivo (útil para el despliegue y el CI)
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/users', createUsersRouter({ userService }));

  router.use(notFoundHandler);
  router.use(errorHandler);

  return router;
}

module.exports = { createApiRouter };
