// Configuración de la aplicación (ver .env.example y src/loadConfig.js).
// En local, las variables se pueden poner en un fichero .env (ignorado por git).
// Las variables que ya existan en el entorno (por ejemplo, las de Render) tienen prioridad.
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('./loadConfig');

const ENV_FILE = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

module.exports = loadConfig(process.env);
