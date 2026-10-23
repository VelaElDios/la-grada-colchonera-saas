// Tokens firmados (HMAC-SHA256) para los enlaces que se envían por correo.
// El token lleva dentro el usuario, el propósito y la caducidad, y va firmado con una clave
// derivada del secreto de la aplicación: no hace falta guardarlo en la base de datos y nadie
// puede fabricar uno válido ni cambiar su contenido sin conocer el secreto.
//
//   <datos en base64url>.<firma en base64url>
const { createHmac, timingSafeEqual } = require('node:crypto');

/**
 * @param {object} options
 * @param {string} options.secret Secreto de la aplicación (SESSION_SECRET)
 * @param {() => number} [options.now] Reloj (las pruebas lo cambian para simular la caducidad)
 */
function createTokenSigner({ secret, now = () => Date.now() }) {
  if (!secret) throw new Error('createTokenSigner necesita un secreto');
  // Clave propia para los tokens: no se reutiliza tal cual la de las cookies de sesión
  const key = createHmac('sha256', secret).update('grada:tokens-de-correo').digest();
  const firmar = (datos) => createHmac('sha256', key).update(datos).digest();

  /** Crea un token con los datos indicados que caduca en `ttlMs` milisegundos. */
  function sign(payload, { ttlMs }) {
    const datos = Buffer.from(JSON.stringify({ ...payload, exp: now() + ttlMs })).toString('base64url');
    return `${datos}.${firmar(datos).toString('base64url')}`;
  }

  /**
   * Comprueba la firma, la caducidad y el propósito.
   * @returns {object | null} Los datos del token, o null si no es válido
   */
  function verify(token, { purpose }) {
    if (typeof token !== 'string') return null;
    const [datos, firma, ...resto] = token.split('.');
    if (!datos || !firma || resto.length > 0) return null;

    const esperada = firmar(datos);
    const recibida = Buffer.from(firma, 'base64url');
    if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;

    let payload;
    try {
      payload = JSON.parse(Buffer.from(datos, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
    if (payload?.purpose !== purpose || typeof payload.exp !== 'number' || payload.exp < now()) return null;
    return payload;
  }

  return { sign, verify };
}

module.exports = { createTokenSigner };
