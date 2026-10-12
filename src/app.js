// Construye la aplicación Express sin arrancarla (así se puede usar en las pruebas).
// Es el único sitio donde se "enchufan" las capas: datos -> lógica -> API.
const path = require('node:path');
const express = require('express');

const { createMemoryUserRepository } = require('./repositories/memoryUserRepository');
const { createUserService } = require('./services/userService');
const { createApiRouter } = require('./api');

function createApp({ userRepository = createMemoryUserRepository() } = {}) {
  const userService = createUserService({ userRepository });

  const app = express();
  app.use(express.json());

  // Capa API: toda la comunicación cliente-servidor pasa por /api
  app.use('/api', createApiRouter({ userService }));

  // El backend sirve el frontend (mismo origen)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  return app;
}

module.exports = { createApp };
