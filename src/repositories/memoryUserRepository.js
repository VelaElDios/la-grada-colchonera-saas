// Capa de acceso a datos: repositorio de usuarios EN MEMORIA.
//
// Contrato del repositorio (todos los métodos son asíncronos):
//   create(data)        -> usuario creado (con id y createdAt)
//   findById(id)        -> usuario | null
//   findByEmail(email)  -> usuario | null
//   findAll()           -> lista de usuarios
//   update(id, changes) -> usuario actualizado | null
//
// La implementación con base de datos (postgresUserRepository.js) cumple este mismo contrato,
// de modo que la capa de lógica no cambia. Esta se usa en las pruebas y en desarrollo sin BD.

const { randomUUID } = require('node:crypto');

function createMemoryUserRepository() {
  const users = new Map();

  // Se devuelven copias para que nadie modifique los datos guardados sin pasar por el repositorio.
  const copy = (user) => (user ? { ...user } : null);

  return {
    async create(data) {
      const user = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
      users.set(user.id, user);
      return copy(user);
    },

    async findById(id) {
      return copy(users.get(id));
    },

    async findByEmail(email) {
      for (const user of users.values()) {
        if (user.email === email) return copy(user);
      }
      return null;
    },

    async findAll() {
      return [...users.values()].map(copy);
    },

    async update(id, changes) {
      const current = users.get(id);
      if (!current) return null;
      const updated = { ...current, ...changes, id };
      users.set(id, updated);
      return copy(updated);
    },
  };
}

module.exports = { createMemoryUserRepository };
