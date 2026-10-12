// Hash de contraseñas con bcrypt (implementación en JavaScript puro: bcryptjs).
// La contraseña nunca se guarda en claro ni cifrada de forma reversible: solo su hash con sal.

const bcrypt = require('bcryptjs');

/**
 * @param {object} [opciones]
 * @param {number} [opciones.rounds=10] Coste de bcrypt (2^rounds iteraciones). En las pruebas se usa uno bajo.
 */
function createPasswordHasher({ rounds = 10 } = {}) {
  return {
    hash: (password) => bcrypt.hash(password, rounds),
    verify: (password, hash) => bcrypt.compare(password, hash),
  };
}

module.exports = { createPasswordHasher };
