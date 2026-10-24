// Modo pruebas desde la terminal: da a una cuenta TODOS los jugadores y puntos de entrenamiento de sobra.
// Uso: node scripts/desbloquear-juego.js correo@ejemplo.com   (o: npm run juego:desbloquear -- correo@ejemplo.com)
// Usa la base de datos de DATABASE_URL (la lee del entorno o del .env). No toca el ranking.
const config = require('../src/config');
const { createPool } = require('../src/db/pool');
const { createPostgresUserRepository } = require('../src/repositories/postgresUserRepository');
const { createPostgresJuegoRepository } = require('../src/repositories/postgresJuegoRepository');
const { createJuegoService } = require('../src/services/juegoService');

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) throw new Error('Indica el correo de la cuenta: node scripts/desbloquear-juego.js correo@ejemplo.com');
  if (!config.databaseUrl) throw new Error('Sin DATABASE_URL no hay base de datos que modificar (en memoria no se guarda nada).');
  const pool = createPool(config.databaseUrl);
  try {
    const usuarios = createPostgresUserRepository(pool);
    const user = await usuarios.findByEmail(email);
    if (!user) throw new Error(`No existe ninguna cuenta con el correo ${email}`);
    const servicio = createJuegoService({ juegoRepository: createPostgresJuegoRepository(pool) });
    const perfil = await servicio.desbloquearTodo(user, { forzar: true });
    console.log(`Listo: ${email} tiene ${Object.keys(perfil.jugadores).length} jugadores y ${Object.values(perfil.jugadores)[0].puntosLibres} puntos de entrenamiento en cada uno.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
