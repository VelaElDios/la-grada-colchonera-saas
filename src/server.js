// Punto de entrada: prepara la capa de datos y arranca el servidor HTTP.
const config = require('./config');
const { bootstrap } = require('./bootstrap');
const { createLogger } = require('./logger');

const logger = createLogger({ level: config.logLevel });

async function main() {
  const { app, close } = await bootstrap(config, { logger });

  const server = app.listen(config.port, () => {
    logger.info('app.start', `La Grada Colchonera escuchando en el puerto ${config.port}`, {
      port: config.port,
      production: config.isProduction,
    });
  });

  // Cierre ordenado (Render envía SIGTERM al desplegar una versión nueva)
  process.on('SIGTERM', () => {
    logger.info('app.stop', 'Cerrando el servidor');
    server.close(() => close().finally(() => process.exit(0)));
  });
}

main().catch((error) => {
  logger.error('app.start_failed', 'No se ha podido arrancar la aplicación', { error });
  process.exit(1);
});
