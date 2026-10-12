// Prueba de humo: la API responde en /api/health.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GET /api/health devuelve status ok', async () => {
  const server = createApp().listen(0);
  try {
    const { port } = server.address();
    const respuesta = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), { status: 'ok' });
  } finally {
    server.close();
  }
});
