// Capa de datos del juego EN MEMORIA (desarrollo y pruebas). Mismo contrato que postgresJuegoRepository.js.
function createMemoryJuegoRepository() {
  const perfiles = new Map(); // userId -> { datos, version }
  const records = new Map(); // userId -> record

  return {
    /** @returns {{ datos: object, version: number } | null} */
    async getPerfil(userId) {
      const p = perfiles.get(userId);
      return p ? { datos: structuredClone(p.datos), version: p.version } : null;
    },

    /** Crea el perfil si no existía. Devuelve false si ya estaba creado. */
    async crearPerfil(userId, datos) {
      if (perfiles.has(userId)) return false;
      perfiles.set(userId, { datos: structuredClone(datos), version: 1 });
      return true;
    },

    /** Guarda solo si la versión sigue siendo la leída (control de concurrencia). Devuelve si se guardó. */
    async guardarPerfil(userId, datos, versionLeida) {
      const p = perfiles.get(userId);
      if (!p || p.version !== versionLeida) return false;
      perfiles.set(userId, { datos: structuredClone(datos), version: p.version + 1 });
      return true;
    },

    async getRecord(userId) {
      const r = records.get(userId);
      return r ? { ...r } : null;
    },

    async guardarRecord(userId, record) {
      records.set(userId, { ...record, userId, createdAt: new Date().toISOString() });
    },

    /** Cambia el mote y el avatar con los que sale en el ranking (si tiene récord). */
    async actualizarIdentidad(userId, { alias, avatar }) {
      const r = records.get(userId);
      if (r) records.set(userId, { ...r, alias, avatar: avatar ?? null });
    },

    /** Los mejores récords: más tiempo primero y, a igualdad, más nivel. */
    async borrarRecord(userId) {
      records.delete(userId);
    },

    async mejoresRecords(limite) {
      return [...records.values()]
        .sort((a, b) => b.tiempo - a.tiempo || b.nivel - a.nivel || a.createdAt.localeCompare(b.createdAt))
        .slice(0, limite)
        .map((r) => ({ ...r }));
    },
  };
}

module.exports = { createMemoryJuegoRepository };
