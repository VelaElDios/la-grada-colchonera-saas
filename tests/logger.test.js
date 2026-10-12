// Pruebas del registro (log) de la actividad.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { createLogger, redact } = require('../src/logger');
const { createApp } = require('../src/app');
const { createMemoryUserRepository } = require('../src/repositories/memoryUserRepository');
const { createPasswordHasher } = require('../src/services/passwordHasher');

/** Logger que guarda las líneas en un array para poder comprobarlas. */
function memoryLogger(level = 'debug') {
  const lines = [];
  return { logger: createLogger({ level, write: (line) => lines.push(JSON.parse(line)) }), lines };
}

describe('Logger', () => {
  test('escribe una línea JSON con hora, nivel, evento y campos', () => {
    const { logger, lines } = memoryLogger();
    logger.info('prueba.evento', 'Hola', { userId: 'u1' });

    assert.equal(lines.length, 1);
    assert.equal(lines[0].level, 'info');
    assert.equal(lines[0].event, 'prueba.evento');
    assert.equal(lines[0].userId, 'u1');
    assert.ok(!Number.isNaN(Date.parse(lines[0].time)));
  });

  test('respeta el nivel mínimo', () => {
    const { logger, lines } = memoryLogger('warn');
    logger.debug('a', 'a');
    logger.info('b', 'b');
    logger.warn('c', 'c');
    logger.error('d', 'd');
    assert.deepEqual(lines.map((l) => l.event), ['c', 'd']);
  });

  test('nunca registra contraseñas, hashes, cookies ni secretos', () => {
    const datos = redact({ email: 'a@b.es', password: '123', passwordHash: 'h', nested: { cookie: 'c', sessionSecret: 's' } });
    assert.deepEqual(datos, { email: 'a@b.es', password: '[oculto]', passwordHash: '[oculto]', nested: { cookie: '[oculto]', sessionSecret: '[oculto]' } });
  });

  test('un nivel desconocido es un error de configuración', () => {
    assert.throws(() => createLogger({ level: 'mucho' }), /Nivel de log no válido/);
  });
});

describe('Actividad registrada por la API', () => {
  let server;
  let baseUrl;
  let lines;

  before(() => {
    const memoria = memoryLogger('debug');
    lines = memoria.lines;
    const app = createApp({
      config: { isProduction: false, requireEmailConfirmation: false, sessionSecret: 'x'.repeat(40), sessionCookieName: 'grada.sid' },
      userRepository: createMemoryUserRepository(),
      passwordHasher: createPasswordHasher({ rounds: 4 }),
      logger: memoria.logger,
    });
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(() => server.close());

  const post = (path, body) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  test('registro, login correcto y login fallido quedan registrados sin la contraseña', async () => {
    await post('/auth/register', { email: 'saul@grada.es', password: 'chilena-2016' });
    await post('/auth/login', { email: 'saul@grada.es', password: 'chilena-2016' });
    const fallido = await post('/auth/login', { email: 'saul@grada.es', password: 'otra-cosa' });
    assert.equal(fallido.status, 401);

    const eventos = lines.map((l) => l.event);
    assert.ok(eventos.includes('user.registered'));
    assert.ok(eventos.includes('auth.login'));
    const intento = lines.find((l) => l.event === 'auth.login_failed');
    assert.equal(intento.email, 'saul@grada.es');
    assert.equal(intento.reason, 'UNAUTHENTICATED');

    const todo = JSON.stringify(lines);
    assert.ok(!todo.includes('chilena-2016'));
    assert.ok(!todo.includes('otra-cosa'));
  });

  test('cada petición queda registrada con método, ruta, estado y duración, y lleva X-Request-Id', async () => {
    const res = await fetch(`${baseUrl}/users`);
    assert.equal(res.status, 401);
    const id = res.headers.get('x-request-id');
    assert.ok(id);

    const linea = lines.find((l) => l.event === 'http.request' && l.requestId === id);
    assert.equal(linea.method, 'GET');
    assert.equal(linea.path, '/api/users');
    assert.equal(linea.status, 401);
    assert.equal(typeof linea.durationMs, 'number');
  });
});
