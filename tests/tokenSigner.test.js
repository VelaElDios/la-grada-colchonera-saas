// Pruebas de los tokens firmados que viajan en los enlaces de los correos.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createTokenSigner } = require('../src/services/tokenSigner');

const HORA = 60 * 60 * 1000;

test('un token recién firmado es válido y conserva sus datos', () => {
  const firmador = createTokenSigner({ secret: 'secreto-de-pruebas' });
  const token = firmador.sign({ sub: 'usuario-1', purpose: 'confirmar-correo' }, { ttlMs: HORA });

  const datos = firmador.verify(token, { purpose: 'confirmar-correo' });
  assert.equal(datos.sub, 'usuario-1');
});

test('un token modificado o firmado con otro secreto no es válido (error)', () => {
  const firmador = createTokenSigner({ secret: 'secreto-de-pruebas' });
  const otro = createTokenSigner({ secret: 'otro-secreto' });
  const token = firmador.sign({ sub: 'usuario-1', purpose: 'confirmar-correo' }, { ttlMs: HORA });

  const [, firma] = token.split('.');
  const falsificado = `${Buffer.from(JSON.stringify({ sub: 'admin', purpose: 'confirmar-correo', exp: Date.now() + HORA })).toString('base64url')}.${firma}`;

  assert.equal(firmador.verify(falsificado, { purpose: 'confirmar-correo' }), null);
  assert.equal(otro.verify(token, { purpose: 'confirmar-correo' }), null);
  assert.equal(firmador.verify('basura', { purpose: 'confirmar-correo' }), null);
  assert.equal(firmador.verify(undefined, { purpose: 'confirmar-correo' }), null);
});

test('un token caducado o con otro propósito no es válido', () => {
  let ahora = Date.now();
  const firmador = createTokenSigner({ secret: 'secreto-de-pruebas', now: () => ahora });
  const token = firmador.sign({ sub: 'usuario-1', purpose: 'confirmar-correo' }, { ttlMs: HORA });

  assert.equal(firmador.verify(token, { purpose: 'otra-cosa' }), null);
  ahora += 2 * HORA;
  assert.equal(firmador.verify(token, { purpose: 'confirmar-correo' }), null);
});
