// Capa de lógica: confirmación de la cuenta por correo electrónico (requisito 4.1).
//
//   1. Al registrarse, la cuenta local queda PENDIENTE y se envía un correo con un enlace.
//   2. El enlace lleva un token firmado (tokenSigner) con el id del usuario y una caducidad.
//   3. Al abrirlo, se comprueba el token y la cuenta pasa a ACTIVA: ya puede iniciar sesión.
//
// No sabe nada de HTTP ni de SMTP: recibe el servicio de usuarios, el de correo y el firmador.
const { STATUS } = require('../models/user');
const { ValidationError } = require('./errors');
const { crearCorreo } = require('./plantillaCorreo');

const PURPOSE = 'confirmar-correo';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // el enlace caduca a las 24 horas
const CONFIRM_PATH = '/api/auth/confirm';

/**
 * @param {object} deps
 * @param {object} deps.userService Servicio de usuarios (getUserById, findUserByEmail, confirmUser)
 * @param {object} deps.mailer Servicio de correo: send({ to, subject, text, html, link })
 * @param {object} deps.tokenSigner Firmador de tokens (sign / verify)
 * @param {number} [deps.ttlMs] Validez del enlace
 */
function createAccountConfirmationService({ userService, mailer, tokenSigner, ttlMs = DEFAULT_TTL_MS }) {
  if (!userService || !mailer || !tokenSigner) {
    throw new Error('createAccountConfirmationService necesita userService, mailer y tokenSigner');
  }

  function buildMessage(user, link) {
    const horas = Math.round(ttlMs / (60 * 60 * 1000));
    const correo = crearCorreo({
      asunto: 'Confirma tu cuenta en La Grada Colchonera',
      titulo: '¡Bienvenido a la grada!',
      previa: 'Confirma tu correo para empezar a jugar.',
      parrafos: [
        'Gracias por unirte a La Grada Colchonera. Solo falta un paso: confirma que este correo es tuyo para activar tu cuenta y empezar a jugar.',
      ],
      boton: { texto: 'Confirmar mi cuenta', url: link },
      aviso: `El enlace caduca en ${horas} horas. Si no has creado tú esta cuenta, ignora este correo.`,
    });
    return { to: user.email, ...correo, link };
  }

  /**
   * Envía el correo de confirmación a una cuenta pendiente.
   * @param {object} user Usuario (vista pública)
   * @param {object} options
   * @param {string} options.baseUrl URL pública de la aplicación (sin barra final)
   * @returns {Promise<boolean>} true si se ha enviado; false si la cuenta no está pendiente
   */
  async function sendConfirmation(user, { baseUrl }) {
    if (!user || user.status !== STATUS.PENDING) return false;
    const token = tokenSigner.sign({ sub: user.id, email: user.email, purpose: PURPOSE }, { ttlMs });
    const link = `${baseUrl}${CONFIRM_PATH}?token=${encodeURIComponent(token)}`;
    await mailer.send(buildMessage(user, link));
    return true;
  }

  /**
   * Confirma la cuenta a partir del token del enlace. Si ya estaba confirmada, no pasa nada.
   * @returns {Promise<object>} El usuario, ya activo
   */
  async function confirm(token) {
    const payload = tokenSigner.verify(token, { purpose: PURPOSE });
    if (!payload) {
      throw new ValidationError('El enlace de confirmación no es válido o ha caducado');
    }
    const user = await userService.getUserById(payload.sub);
    // El token se emitió para este email: si la cuenta ha cambiado, el enlace ya no vale
    if (user.email !== payload.email) {
      throw new ValidationError('El enlace de confirmación no es válido o ha caducado');
    }
    return userService.confirmUser(user.id); // una cuenta eliminada da NotFoundError
  }

  /**
   * Vuelve a enviar el correo si la cuenta existe y está pendiente.
   * No indica si el email existe (para no revelar qué cuentas hay registradas).
   */
  async function resendConfirmation(email, { baseUrl }) {
    const user = await userService.findUserByEmail(email);
    return sendConfirmation(user, { baseUrl });
  }

  return { sendConfirmation, confirm, resendConfirmation };
}

module.exports = { createAccountConfirmationService, CONFIRM_PATH };
