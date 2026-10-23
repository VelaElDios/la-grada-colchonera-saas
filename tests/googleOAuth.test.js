// Pruebas del inicio de sesión con Google: el cliente se sustituye por uno falso (no se llama a Google).
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { createGoogleOAuthClient } = require('../src/integrations/googleOAuth');
const { createTestServer } = require('./helpers');

const servers = [];
after(() => Promise.all(servers.map((s) => s.close())));

function fakeGoogle(profile) {
  return {
    provider: 'google',
    getAuthorizationUrl: ({ redirectUri, state }) => `https://accounts.example/auth?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    getProfile: async ({ code }) => {
      if (code === 'malo') throw new Error('Google ha rechazado el código');
      return profile;
    },
  };
}

async function arrancar(profile = { subject: '1', email: 'fan@gmail.com', emailVerified: true }) {
  const t = await createTestServer({ oauthClients: { google: fakeGoogle(profile) } });
  servers.push(t);
  return t;
}

/** Hace el paso 1 y devuelve la cookie de sesión y el state generado. */
async function iniciar(t) {
  const paso1 = await t.request('GET', '/auth/google');
  assert.equal(paso1.status, 303);
  const url = new URL(paso1.location);
  return { cookie: paso1.cookie, state: url.searchParams.get('state'), redirectUri: url.searchParams.get('redirect_uri') };
}

test('/auth/providers indica si Google está configurado', async () => {
  const con = await arrancar();
  assert.deepEqual((await con.request('GET', '/auth/providers')).body, { google: true });
  const sin = await createTestServer({ oauthClients: { google: null } });
  servers.push(sin);
  assert.deepEqual((await sin.request('GET', '/auth/providers')).body, { google: false });
  const r = await sin.request('GET', '/auth/google');
  assert.match(r.location, /aviso=google-no-disponible/);
});

test('el paso 1 redirige a Google con un state aleatorio y la URL de vuelta de la app', async () => {
  const t = await arrancar();
  const a = await iniciar(t);
  const b = await iniciar(t);
  assert.match(a.state, /^[0-9a-f]{48}$/);
  assert.notEqual(a.state, b.state);
  assert.match(a.redirectUri, /\/api\/auth\/google\/callback$/);
  assert.ok(a.cookie, 'el state se guarda en la sesión');
});

test('una cuenta nueva se crea activa y con proveedor google, y queda con sesión', async () => {
  const t = await arrancar();
  const { cookie, state } = await iniciar(t);
  const r = await t.request('GET', `/auth/google/callback?code=ok&state=${state}`, { cookie });
  assert.equal(r.status, 303);
  assert.match(r.location, /aviso=google-cuenta-creada#\/jugar/);
  const me = await t.request('GET', '/auth/me', { cookie: r.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.email, 'fan@gmail.com');
  assert.equal(me.body.status, 'active');
  assert.equal(me.body.authProvider, 'google');
  assert.equal(me.body.passwordHash, undefined);
});

test('una cuenta existente entra sin crear otra; una pendiente queda confirmada', async () => {
  const t = await arrancar();
  await t.seedUser({ email: 'fan@gmail.com', status: 'pending' });
  const { cookie, state } = await iniciar(t);
  const r = await t.request('GET', `/auth/google/callback?code=ok&state=${state}`, { cookie });
  assert.match(r.location, /aviso=google-ok#\/jugar/);
  const me = await t.request('GET', '/auth/me', { cookie: r.cookie });
  assert.equal(me.body.status, 'active');
});

test('un state incorrecto o ausente se rechaza (protección CSRF) y no se inicia sesión', async () => {
  const t = await arrancar();
  const { cookie } = await iniciar(t);
  const mal = await t.request('GET', '/auth/google/callback?code=ok&state=inventado', { cookie });
  assert.match(mal.location, /aviso=google-error/);
  const sinSesion = await t.request('GET', '/auth/google/callback?code=ok&state=x');
  assert.match(sinSesion.location, /aviso=google-error/);
  assert.equal((await t.request('GET', '/auth/me', { cookie: mal.cookie || cookie })).status, 401);
});

test('el state solo sirve una vez', async () => {
  const t = await arrancar();
  const { cookie, state } = await iniciar(t);
  await t.request('GET', `/auth/google/callback?code=ok&state=${state}`, { cookie });
  const repetido = await t.request('GET', `/auth/google/callback?code=ok&state=${state}`, { cookie });
  assert.match(repetido.location, /aviso=google-error/);
});

test('si el usuario cancela en Google o el código es malo, vuelve a la interfaz con un aviso', async () => {
  const t = await arrancar();
  let s = await iniciar(t);
  const cancelado = await t.request('GET', `/auth/google/callback?error=access_denied&state=${s.state}`, { cookie: s.cookie });
  assert.match(cancelado.location, /aviso=google-cancelado/);
  s = await iniciar(t);
  const malo = await t.request('GET', `/auth/google/callback?code=malo&state=${s.state}`, { cookie: s.cookie });
  assert.match(malo.location, /aviso=google-error/);
});

test('Google sin email verificado o una cuenta eliminada no pueden entrar', async () => {
  const sinVerificar = await arrancar({ subject: '1', email: 'fan@gmail.com', emailVerified: false });
  let s = await iniciar(sinVerificar);
  let r = await sinVerificar.request('GET', `/auth/google/callback?code=ok&state=${s.state}`, { cookie: s.cookie });
  assert.match(r.location, /aviso=google-rechazado/);

  const eliminada = await arrancar();
  await eliminada.seedUser({ email: 'fan@gmail.com', status: 'deleted' });
  s = await iniciar(eliminada);
  r = await eliminada.request('GET', `/auth/google/callback?code=ok&state=${s.state}`, { cookie: s.cookie });
  assert.match(r.location, /aviso=google-rechazado/);
});

test('el cliente real pide el token con el secreto y lee el perfil (con fetch falso)', async () => {
  const llamadas = [];
  const fetchFalso = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones });
    if (String(url).includes('/token')) return { ok: true, json: async () => ({ access_token: 'tok' }) };
    return { ok: true, json: async () => ({ sub: '42', email: 'a@gmail.com', email_verified: true }) };
  };
  const cliente = createGoogleOAuthClient({ clientId: 'id', clientSecret: 'secreto', fetch: fetchFalso });
  const url = new URL(cliente.getAuthorizationUrl({ redirectUri: 'https://x/cb', state: 'abc' }));
  assert.equal(url.searchParams.get('client_id'), 'id');
  assert.equal(url.searchParams.get('state'), 'abc');
  assert.equal(url.searchParams.get('client_secret'), null, 'el secreto nunca va en la URL del navegador');
  const perfil = await cliente.getProfile({ code: 'c', redirectUri: 'https://x/cb' });
  assert.deepEqual(perfil, { subject: '42', email: 'a@gmail.com', emailVerified: true });
  assert.match(String(llamadas[0].opciones.body), /client_secret=secreto/);
  assert.equal(llamadas[1].opciones.headers.Authorization, 'Bearer tok');
  assert.throws(() => createGoogleOAuthClient({ clientId: 'id' }));
});

test('la configuración exige las dos variables de Google a la vez', () => {
  const { loadConfig } = require('../src/loadConfig');
  assert.throws(() => loadConfig({ GOOGLE_CLIENT_ID: 'x', SESSION_SECRET: 's'.repeat(32) }), /GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET/);
});
