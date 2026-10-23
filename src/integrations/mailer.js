// Integración con el servicio de correo (servicio externo, como la base de datos).
// La capa de lógica solo conoce el contrato `mailer.send({ to, subject, text, html })`:
// no sabe si el correo sale por SMTP o si solo se escribe en el registro.
//
//   - Con SMTP_URL: se envía de verdad por SMTP autenticado (Gmail, Brevo...).
//     Los proveedores cloud suelen bloquear el SMTP directo (puerto 25); el SMTP autenticado
//     por los puertos 465/587 de un servicio de correo sí funciona en Cloud Run.
//   - Sin SMTP_URL (desarrollo y pruebas): el correo no se envía; se escribe en el registro
//     con el enlace, para poder confirmar la cuenta en local sin configurar nada.
const nodemailer = require('nodemailer');

/**
 * @param {object} options
 * @param {string} options.smtpUrl Conexión SMTP, por ejemplo smtps://usuario:clave@smtp.gmail.com:465
 * @param {string} options.from Remitente (debe estar autorizado en el servicio de correo)
 * @param {object} [options.transport] Transporte de nodemailer (las pruebas pasan uno falso)
 */
function createSmtpMailer({ smtpUrl, from, transport }) {
  const transporte = transport || nodemailer.createTransport(smtpUrl);
  return {
    kind: 'SMTP',
    async send({ to, subject, text, html }) {
      await transporte.sendMail({ from, to, subject, text, html });
    },
  };
}

/** Correo "de mentira": no envía nada, deja el mensaje (y su enlace) en el registro. */
function createConsoleMailer({ logger }) {
  return {
    kind: 'registro',
    async send({ to, subject, text, link }) {
      logger.warn('mail.not_sent', 'Correo no enviado (no hay SMTP_URL): se muestra en el registro', {
        to,
        subject,
        link,
        body: link ? undefined : text,
      });
    },
  };
}

/** Elige la implementación según la configuración (config.mail). */
function createMailer(mailConfig, { logger }) {
  if (mailConfig?.smtpUrl) {
    return createSmtpMailer({ smtpUrl: mailConfig.smtpUrl, from: mailConfig.from });
  }
  return createConsoleMailer({ logger });
}

module.exports = { createMailer, createSmtpMailer, createConsoleMailer };
