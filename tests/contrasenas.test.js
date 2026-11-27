// Pruebas de las contraseñas (issue #61): recuperar la contraseña por correo, cambiarla desde
// «Mi cuenta», cierre de las sesiones de otros dispositivos y plantilla de los correos.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer, createFakeMailer, passwordHasher } = require('./helpers');
const { createUserService } = require('../src/services/userService');
const { crearCorreo } = require('../src/services/plantillaCorreo');
const { createPasswordResetService } = require('../src/services/passwordResetService');
const { createTokenSigner } = require('../src/services/tokenSigner');

/** Saca el token del enlace del último correo enviado (va en el fragmento: /#/restablecer?token=...). */
function tokenDelCorreo(mailer) {
  const { link } = mailer.sent.at(-1);
  return new URL(link.replace('/#/', '/')).searchParams.get('token');
}

const entrar = async (srv, email, password) => srv.request('POST', '/auth/login', { body: { email, password } });

describe('recuperar la contraseña por correo', () => {
  let srv;
  before(async () => {
    srv = await createTestServer({ config: { publicUrl: 'https://grada.test' } });
    await srv.seedUser({ email: 'olvido@grada.es', password: 'clave-antigua-1' });
  });
  after(() => srv.close());

  test('responde lo mismo (202) exista o no la cuenta y solo envía correo si existe', async () => {
    const existe = await srv.request('POST', '/auth/forgot-password', { body: { email: 'Olvido@Grada.es' } });
    const noExiste = await srv.request('POST', '/auth/forgot-password', { body: { email: 'nadie@grada.es' } });

    assert.equal(existe.status, 202);
    assert.equal(noExiste.status, 202);
    assert.equal(existe.body.message, noExiste.body.message);
    assert.equal(srv.mailer.sent.length, 1);
    const correo = srv.mailer.sent[0];
    assert.equal(correo.to, 'olvido@grada.es');
    assert.match(correo.link, /^https:\/\/grada\.test\/#\/restablecer\?token=/);
    assert.match(correo.html, /Poner una contraseña nueva/);
  });

  test('sin email responde 400', async () => {
    const res = await srv.request('POST', '/auth/forgot-password', { body: {} });
    assert.equal(res.status, 400);
  });

  test('con el enlace se pone la contraseña nueva, la antigua deja de valer y el enlace no sirve dos veces', async () => {
    const token = tokenDelCorreo(srv.mailer);
    const cambio = await srv.request('POST', '/auth/reset-password', { body: { token, password: 'clave-nueva-22' } });
    assert.equal(cambio.status, 200);

    assert.equal((await entrar(srv, 'olvido@grada.es', 'clave-antigua-1')).status, 401);
    assert.equal((await entrar(srv, 'olvido@grada.es', 'clave-nueva-22')).status, 200);

    const otraVez = await srv.request('POST', '/auth/reset-password', { body: { token, password: 'otra-clave-33' } });
    assert.equal(otraVez.status, 400);
    assert.match(otraVez.body.error.message, /no es válido, ya se ha usado o ha caducado/);
  });

  test('rechaza un token inventado o una contraseña corta', async () => {
    const inventado = await srv.request('POST', '/auth/reset-password', { body: { token: 'abc.def', password: 'clave-nueva-44' } });
    assert.equal(inventado.status, 400);

    await srv.request('POST', '/auth/forgot-password', { body: { email: 'olvido@grada.es' } });
    const corta = await srv.request('POST', '/auth/reset-password', { body: { token: tokenDelCorreo(srv.mailer), password: '123' } });
    assert.equal(corta.status, 400);
  });

  test('al cambiar la contraseña con el enlace se cierran las sesiones abiertas', async () => {
    await srv.seedUser({ email: 'sesiones@grada.es', password: 'clave-sesion-1' });
    const { cookie } = await entrar(srv, 'sesiones@grada.es', 'clave-sesion-1');
    assert.equal((await srv.request('GET', '/auth/me', { cookie })).status, 200);

    await srv.request('POST', '/auth/forgot-password', { body: { email: 'sesiones@grada.es' } });
    await srv.request('POST', '/auth/reset-password', { body: { token: tokenDelCorreo(srv.mailer), password: 'clave-sesion-2' } });

    assert.equal((await srv.request('GET', '/auth/me', { cookie })).status, 401);
  });
});

describe('el servicio de recuperación', () => {
  const usuario = { id: 'u1', email: 'fan@grada.es', status: 'active' };
  const userService = {
    findUserByEmail: async (email) => (email === 'fan@grada.es' ? usuario : null),
    getUserById: async () => usuario,
    getCredentialStamp: async () => 'huella-1',
    resetPassword: async () => usuario,
  };

  test('no manda más de un correo por minuto al mismo email', async () => {
    let ahora = 1000;
    const mailer = createFakeMailer();
    const servicio = createPasswordResetService({
      userService, mailer, tokenSigner: createTokenSigner({ secret: 's', now: () => ahora }), now: () => ahora,
    });
    assert.equal(await servicio.requestReset('fan@grada.es', { baseUrl: 'http://x' }), true);
    assert.equal(await servicio.requestReset('fan@grada.es', { baseUrl: 'http://x' }), false);
    ahora += 61 * 1000;
    assert.equal(await servicio.requestReset('fan@grada.es', { baseUrl: 'http://x' }), true);
    assert.equal(mailer.sent.length, 2);
  });

  test('el enlace caduca a la hora', async () => {
    let ahora = 1000;
    const mailer = createFakeMailer();
    const tokenSigner = createTokenSigner({ secret: 's', now: () => ahora });
    const servicio = createPasswordResetService({ userService, mailer, tokenSigner, now: () => ahora });
    await servicio.requestReset('fan@grada.es', { baseUrl: 'http://x' });
    ahora += 61 * 60 * 1000;
    await assert.rejects(() => servicio.resetPassword(tokenDelCorreo(mailer), 'clave-nueva-1'), /ha caducado/);
  });
});

describe('cambiar la contraseña desde Mi cuenta', () => {
  let srv;
  before(async () => {
    srv = await createTestServer();
    await srv.seedUser({ email: 'cuenta@grada.es', password: 'clave-actual-1' });
  });
  after(() => srv.close());

  test('sin sesión responde 401', async () => {
    const res = await srv.request('PUT', '/users/me/password', { body: { currentPassword: 'x', newPassword: 'clave-nueva-1' } });
    assert.equal(res.status, 401);
  });

  test('pide la contraseña actual correcta y una nueva válida y distinta', async () => {
    const { cookie } = await entrar(srv, 'cuenta@grada.es', 'clave-actual-1');
    const mala = await srv.request('PUT', '/users/me/password', { cookie, body: { currentPassword: 'otra', newPassword: 'clave-nueva-1' } });
    const corta = await srv.request('PUT', '/users/me/password', { cookie, body: { currentPassword: 'clave-actual-1', newPassword: '123' } });
    const igual = await srv.request('PUT', '/users/me/password', { cookie, body: { currentPassword: 'clave-actual-1', newPassword: 'clave-actual-1' } });
    assert.equal(mala.status, 401);
    assert.equal(corta.status, 400);
    assert.equal(igual.status, 400);
  });

  test('la cambia, mantiene esta sesión y cierra la de otro dispositivo', async () => {
    const aqui = (await entrar(srv, 'cuenta@grada.es', 'clave-actual-1')).cookie;
    const otroMovil = (await entrar(srv, 'cuenta@grada.es', 'clave-actual-1')).cookie;

    const res = await srv.request('PUT', '/users/me/password', { cookie: aqui, body: { currentPassword: 'clave-actual-1', newPassword: 'clave-nueva-1' } });
    assert.equal(res.status, 204);

    assert.equal((await srv.request('GET', '/auth/me', { cookie: aqui })).status, 200);
    assert.equal((await srv.request('GET', '/auth/me', { cookie: otroMovil })).status, 401);
    assert.equal((await entrar(srv, 'cuenta@grada.es', 'clave-actual-1')).status, 401);
    assert.equal((await entrar(srv, 'cuenta@grada.es', 'clave-nueva-1')).status, 200);
  });

  test('una cuenta de Google sin contraseña recibe un aviso para usar la recuperación', async () => {
    const google = await srv.userRepository.create({ email: 'google@grada.es', role: 'user', status: 'active', authProvider: 'google' });
    // En las pruebas no se puede entrar con Google por HTTP: se prueba directamente la lógica
    const userService = createUserService({ userRepository: srv.userRepository, passwordHasher });
    await assert.rejects(
      () => userService.changePassword({ id: google.id, status: 'active' }, { currentPassword: 'x', newPassword: 'clave-nueva-1' }),
      /Olvidaste tu contraseña/,
    );
  });
});

describe('plantilla de los correos', () => {
  test('lleva la marca, el botón con el enlace y la versión en texto plano', () => {
    const correo = crearCorreo({
      asunto: 'Asunto', titulo: 'Titular', parrafos: ['Uno', 'Dos'], boton: { texto: 'Pulsa', url: 'https://grada.test/x?a=1&b=2' }, aviso: 'Caduca',
    });
    assert.equal(correo.subject, 'Asunto');
    assert.match(correo.html, /La Grada <span[^>]*>Colchonera<\/span>/);
    assert.match(correo.html, /href="https:\/\/grada\.test\/x\?a=1&amp;b=2"/);
    assert.match(correo.html, />Pulsa<\/a>/);
    assert.match(correo.text, /Pulsa: https:\/\/grada\.test\/x\?a=1&b=2/);
    assert.match(correo.text, /Caduca/);
  });

  test('escapa lo que viene de fuera', () => {
    const correo = crearCorreo({
      asunto: 'A', titulo: '<b>T</b>', parrafos: ['<script>alert(1)</script>'], boton: { texto: 'B', url: 'https://x/"><img src=x>' },
    });
    assert.equal(correo.html.includes('<script>'), false);
    assert.equal(correo.html.includes('"><img'), false);
    assert.match(correo.html, /&lt;script&gt;/);
  });

  test('el correo de confirmación de la cuenta usa la plantilla', async () => {
    const srv = await createTestServer({ config: { requireEmailConfirmation: true } });
    try {
      await srv.request('POST', '/auth/register', { body: { email: 'nuevo@grada.es', password: 'clave-larga-1' } });
      const correo = srv.mailer.sent.at(-1);
      assert.match(correo.html, /Confirmar mi cuenta/);
      assert.match(correo.html, /La Grada <span/);
      assert.ok(correo.text.includes(correo.link));
    } finally {
      srv.close();
    }
  });
});
