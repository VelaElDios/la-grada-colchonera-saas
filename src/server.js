// Punto de entrada: prepara la capa de datos y arranca el servidor HTTP.
const config = require('./config');
const { bootstrap } = require('./bootstrap');

async function main() {
  const { app, storage, close } = await bootstrap(config);

  if (storage === 'memoria') {
    console.warn('Sin DATABASE_URL: los datos se guardan en memoria y se perderán al reiniciar');
  }

  const server = app.listen(config.port, () => {
    console.log(`La Grada Colchonera escuchando en http://localhost:${config.port} (datos en ${storage})`);
  });

  // Cierre ordenado (Render envía SIGTERM al desplegar una versión nueva)
  process.on('SIGTERM', () => {
    server.close(() => close().finally(() => process.exit(0)));
  });
}

main().catch((err) => {
  console.error('No se ha podido arrancar la aplicación:', err);
  process.exit(1);
});
