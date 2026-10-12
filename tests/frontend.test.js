// Comprueba que el backend sirve el frontend desde el mismo origen.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server;
let baseUrl;

before(() => {
  server = createApp().listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('GET / sirve la página principal', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /La Grada Colchonera/);
});

test('la interfaz y el cliente de comunicación son ficheros separados', async () => {
  assert.equal((await fetch(`${baseUrl}/js/ui.js`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/js/api.js`)).status, 200);
});
