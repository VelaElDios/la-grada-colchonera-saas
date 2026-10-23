// Utilidades para las pruebas de la API: arranca la app en un puerto libre y hace peticiones HTTP.
const { createApp } = require('../src/app');
const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');
const { createPasswordHasher } = require('../src/services/passwordHasher');

const TEST_CONFIG = {
  isProduction: false,
  requireEmailConfirmation: false,
  sessionSecret: 'secreto-de-pruebas',
  sessionCookieName: 'grada.sid',
  logLevel: 'silent',
};

// Coste bajo de bcrypt para que las pruebas sean rápidas
const passwordHasher = createPasswordHasher({ rounds: 4 });

/** Servicio de correo falso: guarda los correos "enviados" para que las pruebas los lean. */
function createFakeMailer() {
  const sent = [];
  return { kind: 'pruebas', sent, send: async (message) => { sent.push(message); } };
}

async function createTestServer({
  config = {},
  userRepository = createMemoryUserRepository(),
  mailer = createFakeMailer(),
  ...extra
} = {}) {
  const app = createApp({ config: { ...TEST_CONFIG, ...config }, userRepository, passwordHasher, mailer, ...extra });
  const server = app.listen(0);
  const baseUrl = `http://localhost:${server.address().port}/api`;

  /** Petición HTTP. Devuelve { status, body, cookie } (cookie: la de sesión recibida, si la hay). */
  async function request(method, path, { body, cookie, headers = {} } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      redirect: 'manual', // las redirecciones (confirmación, OAuth) se comprueban en las pruebas
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const setCookie = res.headers.get('set-cookie');
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    return {
      status: res.status,
      body: text && isJson ? JSON.parse(text) : (text || null),
      cookie: setCookie ? setCookie.split(';')[0] : null,
      location: res.headers.get('location'),
    };
  }

  /** Crea directamente en la capa de datos un usuario activo con contraseña. */
  async function seedUser({ email, password = 'contraseña-segura', role = 'user', status = 'active' }) {
    return userRepository.create({
      email,
      role,
      status,
      authProvider: 'local',
      passwordHash: await passwordHasher.hash(password),
    });
  }

  return { request, seedUser, userRepository, mailer, baseUrl, close: () => server.close() };
}

module.exports = { createTestServer, createFakeMailer, passwordHasher };
