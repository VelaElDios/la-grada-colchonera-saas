// Conexión con PostgreSQL (Neon en producción).
// Se usa un "pool": un conjunto de conexiones reutilizables compartido por toda la aplicación.
const { Pool } = require('pg');

/**
 * Crea el pool de conexiones a partir de la URL de la base de datos.
 * Neon exige conexiones cifradas (TLS); la propia URL lo indica con ?sslmode=require.
 * @param {string} databaseUrl postgresql://usuario:contraseña@host/base?sslmode=require
 */
function createPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('createPool necesita la URL de la base de datos (DATABASE_URL)');
  }
  return new Pool({
    connectionString: databaseUrl,
    max: 5, // la capa gratuita de Neon admite pocas conexiones simultáneas
    idleTimeoutMillis: 30_000,
  });
}

module.exports = { createPool };
