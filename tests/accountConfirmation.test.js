// Pruebas unitarias de la capa de lógica: confirmación de la cuenta por correo.
const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { createUserService } = require('../src/services/userService');
const { createAccountConfirmationService } = require('../src/services/accountConfirmationService');
const { createTokenSigner } = require('../src/services/tokenSigner');
const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');
const { ValidationError, NotFoundError } = require('../src/services/errors');
const { createFakeMailer, passwordHasher } = require('./helpers');

const BASE_URL = 'https://grada.example.com';
const tokenDelEnlace = (correo) => new URL(correo.link).searchParams.get('token');

describe('confirmación de cuenta por correo', () => {
  let userService;
  let confirmacion;
  let mailer;
  let ahora;

  beforeEach(() => {
    ahora = Date.now();
    mailer = createFakeMailer();
    userService = createUserService({ userRepository: createMemoryUserRepository(), passwordHasher });
    confirmacion = createAccountConfirmationService({
      userService,
      mailer,
      tokenSigner: createTokenSigner({ secret: 'secreto-de-pruebas', now: () => ahora }),
    });
  });

  test('a una cuenta pendiente se le envía un correo con un enlace de confirmación', async () => {
    const usuario = await userService.registerUser({ email: 'koke@grada.es', password: 'partido-a-partido' });

    const enviado = await confirmacion.sendConfirmation(usuario, { baseUrl: BASE_URL });

    assert.equal(enviado, true);
    assert.equal(mailer.sent.length, 1);
    assert.equal(mailer.sent[0].to, 'koke@grada.es');
    assert.ok(mailer.sent[0].link.startsWith(`${BASE_URL}/api/auth/confirm?token=`));
    assert.ok(mailer.sent[0].text.includes(mailer.sent[0].link));
  });

  test('el enlace activa la cuenta y después ya puede iniciar sesión', async () => {
    const usuario = await userService.registerUser({ email: 'koke@grada.es', password: 'partido-a-partido' });
    await confirmacion.sendConfirmation(usuario, { baseUrl: BASE_URL });

    const confirmado = await confirmacion.confirm(tokenDelEnlace(mailer.sent[0]));

    assert.equal(confirmado.status, 'active');
    assert.equal(await userService.isUserActive(usuario.id), true);
    const sesion = await userService.authenticate({ email: 'koke@grada.es', password: 'partido-a-partido' });
    assert.equal(sesion.id, usuario.id);
  });

  test('un enlace manipulado o caducado se rechaza y la cuenta sigue pendiente (error)', async () => {
    const usuario = await userService.registerUser({ email: 'koke@grada.es', password: 'partido-a-partido' });
    await confirmacion.sendConfirmation(usuario, { baseUrl: BASE_URL });
    const token = tokenDelEnlace(mailer.sent[0]);

    await assert.rejects(confirmacion.confirm(`${token}x`), ValidationError);
    await assert.rejects(confirmacion.confirm(undefined), ValidationError);
    ahora += 25 * 60 * 60 * 1000; // 25 horas después
    await assert.rejects(confirmacion.confirm(token), /no es válido o ha caducado/);
    assert.equal(await userService.isUserActive(usuario.id), false);
  });

  test('una cuenta eliminada no se puede reactivar con un enlace antiguo', async () => {
    const usuario = await userService.registerUser({ email: 'koke@grada.es', password: 'partido-a-partido' });
    await confirmacion.sendConfirmation(usuario, { baseUrl: BASE_URL });
    await userService.deleteUser(usuario, usuario.id);

    await assert.rejects(confirmacion.confirm(tokenDelEnlace(mailer.sent[0])), NotFoundError);
  });

  test('confirmar dos veces no da error (el enlace se puede volver a abrir)', async () => {
    const usuario = await userService.registerUser({ email: 'koke@grada.es', password: 'partido-a-partido' });
    await confirmacion.sendConfirmation(usuario, { baseUrl: BASE_URL });
    const token = tokenDelEnlace(mailer.sent[0]);

    await confirmacion.confirm(token);
    const otraVez = await confirmacion.confirm(token);
    assert.equal(otraVez.status, 'active');
  });

  test('el reenvío solo manda correo a cuentas pendientes (y no revela si el email existe)', async () => {
    await userService.registerUser({ email: 'pendiente@grada.es', password: 'partido-a-partido' });
    const activo = await userService.registerUser({ email: 'activo@grada.es', password: 'partido-a-partido' });
    await userService.confirmUser(activo.id);

    assert.equal(await confirmacion.resendConfirmation('Pendiente@Grada.es', { baseUrl: BASE_URL }), true);
    assert.equal(await confirmacion.resendConfirmation('activo@grada.es', { baseUrl: BASE_URL }), false);
    assert.equal(await confirmacion.resendConfirmation('nadie@grada.es', { baseUrl: BASE_URL }), false);
    assert.deepEqual(mailer.sent.map((correo) => correo.to), ['pendiente@grada.es']);
  });
});
