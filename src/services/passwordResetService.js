// Capa de lógica: recuperar la contraseña por correo («¿Olvidaste tu contraseña?»).
//
//   1. El usuario escribe su email. Si hay una cuenta activa con él, se le envía un enlace.
//      La respuesta es siempre la misma, exista o no la cuenta (no se revela qué emails están registrados).
//   2. El enlace lleva un token firmado (tokenSigner) con el usuario, su email, la huella de sus
//      credenciales y una caducidad de 1 hora. No se guarda nada en la base de datos.
//   3. Al poner la contraseña nueva cambia la huella: el mismo enlace ya no vale (un solo uso)
//      y las sesiones abiertas en otros dispositivos se cierran.
//
// No sabe nada de HTTP ni de SMTP: recibe el servicio de usuarios, el de correo y el firmador.
const { STATUS } = require('../models/user');
const { ValidationError } = require('./errors');
const { crearCorreo } = require('./plantillaCorreo');

const PURPOSE = 'restablecer-contrasena';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // el enlace caduca a la hora
const DEFAULT_ESPERA_MS = 60 * 1000; // como mucho un correo por minuto para el mismo email
const RESET_PATH = '/#/restablecer';
const ENLACE_NO_VALIDO = 'El enlace para cambiar la contraseña no es válido, ya se ha usado o ha caducado. Pide otro desde «¿Olvidaste tu contraseña?».';

/**
 * @param {object} deps
 * @param {object} deps.userService Servicio de usuarios (findUserByEmail, getCredentialStamp, getUserById, resetPassword)
 * @param {object} deps.mailer Servicio de correo: send({ to, subject, text, html, link })
 * @param {object} deps.tokenSigner Firmador de tokens (sign / verify)
 * @param {number} [deps.ttlMs] Validez del enlace
 * @param {number} [deps.esperaMs] Tiempo mínimo entre dos correos al mismo email
 * @param {() => number} [deps.now] Reloj (las pruebas lo cambian)
 */
function createPasswordResetService({
  userService, mailer, tokenSigner, ttlMs = DEFAULT_TTL_MS, esperaMs = DEFAULT_ESPERA_MS, now = () => Date.now(),
}) {
  if (!userService || !mailer || !tokenSigner) {
    throw new Error('createPasswordResetService necesita userService, mailer y tokenSigner');
  }
  const ultimoEnvio = new Map(); // email → momento del último correo (evita usar el formulario para inundar un buzón)

  function buildMessage(user, link) {
    const minutos = Math.round(ttlMs / (60 * 1000));
    const correo = crearCorreo({
      asunto: 'Cambia tu contraseña de La Grada Colchonera',
      titulo: '¿Has olvidado tu contraseña?',
      previa: 'Usa este enlace para poner una contraseña nueva.',
      parrafos: [
        'Hemos recibido una petición para cambiar la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.',
        'Al cambiarla se cerrará la sesión en el resto de dispositivos en los que hayas entrado.',
      ],
      boton: { texto: 'Poner una contraseña nueva', url: link },
      aviso: `El enlace caduca en ${minutos} minutos y solo sirve una vez. Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.`,
    });
    return { to: user.email, ...correo, link };
  }

  /**
   * Envía el enlace si hay una cuenta activa con ese email. No lanza error si no la hay.
   * @returns {Promise<boolean>} true si se ha enviado un correo (solo para el registro, no para el usuario)
   */
  async function requestReset(email, { baseUrl }) {
    const user = await userService.findUserByEmail(email);
    if (!user || user.status !== STATUS.ACTIVE) return false;
    const previo = ultimoEnvio.get(user.email);
    if (previo !== undefined && now() - previo < esperaMs) return false;

    const huella = await userService.getCredentialStamp(user.id);
    const token = tokenSigner.sign({ sub: user.id, email: user.email, huella, purpose: PURPOSE }, { ttlMs });
    // El token va en el fragmento (#): el navegador no lo manda al servidor al abrir la página ni lo filtra en el Referer
    const link = `${baseUrl}${RESET_PATH}?token=${encodeURIComponent(token)}`;
    ultimoEnvio.set(user.email, now());
    await mailer.send(buildMessage(user, link));
    return true;
  }

  /**
   * Pone la contraseña nueva a partir del token del enlace.
   * @returns {Promise<object>} El usuario (vista pública)
   */
  async function resetPassword(token, newPassword) {
    const payload = tokenSigner.verify(token, { purpose: PURPOSE });
    if (!payload) throw new ValidationError(ENLACE_NO_VALIDO);
    let user;
    try {
      user = await userService.getUserById(payload.sub);
    } catch {
      throw new ValidationError(ENLACE_NO_VALIDO);
    }
    if (user.status !== STATUS.ACTIVE || user.email !== payload.email
      || (await userService.getCredentialStamp(user.id)) !== payload.huella) {
      throw new ValidationError(ENLACE_NO_VALIDO);
    }
    return userService.resetPassword(user.id, newPassword);
  }

  return { requestReset, resetPassword };
}

module.exports = { createPasswordResetService, RESET_PATH };
