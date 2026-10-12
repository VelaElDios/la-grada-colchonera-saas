// Pruebas de la integración con el servicio de correo.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createMailer, createSmtpMailer } = require('../src/integrations/mailer');
const { createLogger } = require('../src/logger');

test('sin SMTP_URL el correo no se envía: se escribe en el registro con su enlace', async () => {
  const lineas = [];
  const logger = createLogger({ level: 'info', write: (linea) => lineas.push(JSON.parse(linea)) });
  const mailer = createMailer({ smtpUrl: null }, { logger });

  await mailer.send({ to: 'fan@grada.es', subject: 'Confirma', text: '...', link: 'http://localhost/confirmar' });

  assert.equal(mailer.kind, 'registro');
  assert.equal(lineas[0].event, 'mail.not_sent');
  assert.equal(lineas[0].to, 'fan@grada.es');
  assert.equal(lineas[0].link, 'http://localhost/confirmar');
});

test('con SMTP_URL se usa SMTP y se envía con el remitente configurado', async () => {
  assert.equal(createMailer({ smtpUrl: 'smtps://u:p@smtp.ejemplo.com:465', from: 'a@b.es' }, { logger: null }).kind, 'SMTP');

  const enviados = [];
  const mailer = createSmtpMailer({
    from: 'La Grada <grada@ejemplo.com>',
    transport: { sendMail: async (mensaje) => { enviados.push(mensaje); } },
  });
  await mailer.send({ to: 'fan@grada.es', subject: 'Hola', text: 'texto', html: '<p>texto</p>' });

  assert.deepEqual(enviados, [{ from: 'La Grada <grada@ejemplo.com>', to: 'fan@grada.es', subject: 'Hola', text: 'texto', html: '<p>texto</p>' }]);
});

test('si el servicio de correo falla, el error llega a quien envía (no se pierde en silencio)', async () => {
  const mailer = createSmtpMailer({ from: 'a@b.es', transport: { sendMail: async () => { throw new Error('SMTP caído'); } } });
  await assert.rejects(() => mailer.send({ to: 'fan@grada.es', subject: 'x', text: 'x' }), /SMTP caído/);
});
