// Regla de negocio: solo se admiten registros de ciertos dominios de correo.
// Función pura: no accede a la base de datos ni a la configuración (la lista llega como parámetro).
const { ValidationError } = require('./errors');

/**
 * Convierte el valor de ALLOWED_DOMAINS ("uclm.es,alu.uclm.es") en una lista normalizada.
 * @param {string | undefined} value
 * @returns {string[]}
 */
function parseAllowedDomains(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
}

/**
 * Indica si el dominio del email está en la lista de permitidos.
 * Se compara el dominio completo (lo que hay tras la @), sin distinguir mayúsculas:
 * un subdominio no listado (x@sub.uclm.es) no está permitido.
 * @param {unknown} email
 * @param {string[]} allowedDomains
 * @returns {boolean}
 * @throws {ValidationError} si el email no es un texto o no contiene @
 */
function isDomainAllowed(email, allowedDomains) {
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new ValidationError('El email debe ser un texto que contenga @');
  }
  const domain = email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase();
  return allowedDomains.includes(domain);
}

module.exports = { isDomainAllowed, parseAllowedDomains };
