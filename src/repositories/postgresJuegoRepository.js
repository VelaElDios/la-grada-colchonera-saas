// Capa de datos del juego en POSTGRESQL. Mismo contrato que memoryJuegoRepository.js.
const toIso = (v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());
const parseDatos = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

function toRecord(row) {
  return {
    userId: row.user_id,
    alias: row.alias,
    personaje: row.personaje,
    entrenador: row.entrenador,
    tiempo: row.tiempo,
    nivel: row.nivel,
    jefes: row.jefes,
    bajas: row.bajas,
    avatar: row.avatar ?? null,
    createdAt: toIso(row.created_at),
  };
}

function createPostgresJuegoRepository(pool) {
  if (!pool) throw new Error('createPostgresJuegoRepository necesita un pool de PostgreSQL');

  return {
    async getPerfil(userId) {
      const { rows } = await pool.query('SELECT datos, version FROM juego_perfiles WHERE user_id = $1', [userId]);
      return rows[0] ? { datos: parseDatos(rows[0].datos), version: Number(rows[0].version) } : null;
    },

    async crearPerfil(userId, datos) {
      try {
        await pool.query('INSERT INTO juego_perfiles (user_id, datos, version) VALUES ($1, $2, 1)', [userId, JSON.stringify(datos)]);
        return true;
      } catch (err) {
        if (err.code === '23505') return false; // ya existía (otra petición lo creó antes)
        throw err;
      }
    },

    async guardarPerfil(userId, datos, versionLeida) {
      const res = await pool.query(
        'UPDATE juego_perfiles SET datos = $2, version = version + 1, updated_at = now() WHERE user_id = $1 AND version = $3',
        [userId, JSON.stringify(datos), versionLeida],
      );
      return res.rowCount === 1;
    },

    async getRecord(userId) {
      const { rows } = await pool.query('SELECT * FROM juego_records WHERE user_id = $1', [userId]);
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async guardarRecord(userId, r) {
      const valores = [userId, r.alias, r.personaje, r.entrenador, r.tiempo, r.nivel, r.jefes, r.bajas, r.avatar ?? null];
      const res = await pool.query(
        `UPDATE juego_records SET alias = $2, personaje = $3, entrenador = $4, tiempo = $5, nivel = $6, jefes = $7, bajas = $8, avatar = $9, created_at = now()
         WHERE user_id = $1`,
        valores,
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO juego_records (user_id, alias, personaje, entrenador, tiempo, nivel, jefes, bajas, avatar)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          valores,
        );
      }
    },

    /** Cambia el mote y el avatar con los que sale en el ranking (si tiene récord). */
    async actualizarIdentidad(userId, { alias, avatar }) {
      await pool.query('UPDATE juego_records SET alias = $2, avatar = $3 WHERE user_id = $1', [userId, alias, avatar ?? null]);
    },

    async mejoresRecords(limite) {
      const { rows } = await pool.query(
        'SELECT * FROM juego_records ORDER BY tiempo DESC, nivel DESC, created_at ASC LIMIT $1',
        [limite],
      );
      return rows.map(toRecord);
    },
  };
}

module.exports = { createPostgresJuegoRepository };
