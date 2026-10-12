// Construye la aplicación Express sin arrancarla (así se puede usar en las pruebas).
const path = require('node:path');
const express = require('express');
const apiRouter = require('./api');

function createApp() {
  const app = express();

  app.use(express.json());

  // Capa API: toda la comunicación cliente-servidor pasa por /api
  app.use('/api', apiRouter);

  // El backend sirve el frontend (mismo origen)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  return app;
}

module.exports = { createApp };
