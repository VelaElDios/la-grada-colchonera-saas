// Pruebas de la regla "dominios permitidos por configuración" (variante 3 de la prueba técnica).
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { isDomainAllowed, parseAllowedDomains } = require('../src/services/domainPolicy');
const { ValidationError } = require('../src/services/errors');
const { loadConfig } = require('../src/loadConfig');
const { createTestServer } = require('./helpers');

const PERMITIDOS = parseAllowedDomains('uclm.es,alu.uclm.es');

describe('variante3: lógica de dominios permitidos', () => {
  test('variante3: permite un dominio de la lista', () => {
    assert.equal(isDomainAllowed('ana@uclm.es', PERMITIDOS), true);
    assert.equal(isDomainAllowed('luis@alu.uclm.es', PERMITIDOS), true);
  });

  test('variante3: no distingue mayúsculas en el dominio', () => {
    assert.equal(isDomainAllowed('ana@UCLM.ES', PERMITIDOS), true);
  });

  test('variante3: rechaza un dominio que no está en la lista', () => {
    assert.equal(isDomainAllowed('ana@gmail.com', PERMITIDOS), false);
  });

  test('variante3: rechaza un subdominio no listado', () => {
    assert.equal(isDomainAllowed('x@sub.uclm.es', PERMITIDOS), false);
  });

  test('variante3: rechaza un dominio que solo termina igual que uno permitido', () => {
    assert.equal(isDomainAllowed('x@miuclm.es', PERMITIDOS), false);
  });

  test('variante3: rechaza todo si la lista de dominios está vacía', () => {
    assert.equal(isDomainAllowed('ana@uclm.es', []), false);
  });

  test('variante3: rechaza con error un valor sin @ o que no es texto', () => {
    assert.throws(() => isDomainAllowed('sin-arroba', PERMITIDOS), ValidationError);
    assert.throws(() => isDomainAllowed(42, PERMITIDOS), ValidationError);
    assert.throws(() => isDomainAllowed(undefined, PERMITIDOS), ValidationError);
  });

  test('variante3: la lista se lee de ALLOWED_DOMAINS, ignorando espacios y mayúsculas', () => {
    assert.deepEqual(parseAllowedDomains(' UCLM.es , alu.uclm.es,, '), ['uclm.es', 'alu.uclm.es']);
    assert.deepEqual(parseAllowedDomains(undefined), []);
    assert.deepEqual(loadConfig({ ALLOWED_DOMAINS: 'uclm.es' }).allowedDomains, ['uclm.es']);
  });
});

describe('variante3: endpoint POST /api/prueba/dominio', () => {
  let srv;
  before(async () => { srv = await createTestServer({ config: { allowedDomains: PERMITIDOS } }); });
  after(() => srv.close());

  const dominio = (body) => srv.request('POST', '/prueba/dominio', { body });

  test('variante3: responde 200 permitido:true sin necesidad de sesión', async () => {
    const res = await dominio({ email: 'ana@uclm.es' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { permitido: true });
  });

  test('variante3: responde 200 permitido:false para un dominio no permitido', async () => {
    const res = await dominio({ email: 'x@sub.uclm.es' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { permitido: false });
  });

  test('variante3: responde 400 con { error } si el valor no contiene @', async () => {
    const res = await dominio({ email: 'sin-arroba' });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
  });

  test('variante3: responde 400 si falta el email o no es texto', async () => {
    assert.equal((await dominio({})).status, 400);
    assert.equal((await dominio({ email: 123 })).status, 400);
    assert.equal((await dominio({ email: null })).status, 400);
  });

  test('variante3: responde 400 si el JSON está mal formado', async () => {
    const res = await fetch(`${srv.baseUrl}/prueba/dominio`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{roto',
    });
    assert.equal(res.status, 400);
    assert.equal(typeof (await res.json()).error, 'string');
  });
});
