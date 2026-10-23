// Comprueba que el backend sirve el frontend y que la estructura modular se respeta.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('../src/app');

const PUBLIC = path.join(__dirname, '..', 'public');
let server;
let baseUrl;

before(() => {
  server = createApp().listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

function ficheros(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return ficheros(ruta, ext);
    return ruta.endsWith(ext) ? [ruta] : [];
  });
}

test('GET / sirve la página principal con el script como módulo', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /La Grada Colchonera/);
  assert.match(html, /<script type="module" src="\/js\/ui\.js">/);
  assert.match(html, /class="salto"/); // enlace para saltar al contenido (accesibilidad)
});

test('todos los ficheros que referencia index.html existen y se sirven', async () => {
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  const rutas = [...html.matchAll(/(?:href|src)="(\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(rutas.length >= 6);
  for (const ruta of rutas) {
    assert.equal((await fetch(`${baseUrl}${ruta}`)).status, 200, `${ruta} debería servirse`);
  }
});

test('la interfaz y el cliente de comunicación son ficheros separados', async () => {
  assert.equal((await fetch(`${baseUrl}/js/ui.js`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/js/api.js`)).status, 200);
});

test('la interfaz incluye el panel de administración y la baja de cuenta', () => {
  const ui = fs.readFileSync(path.join(PUBLIC, 'js', 'ui.js'), 'utf8');
  const perfil = fs.readFileSync(path.join(PUBLIC, 'js', 'ui', 'vistas', 'perfil.js'), 'utf8');
  const cliente = fs.readFileSync(path.join(PUBLIC, 'js', 'api.js'), 'utf8');
  assert.match(ui, /'\/admin'/);
  assert.match(ui, /'\/jugar'/);
  assert.match(perfil, /deleteUser/);
  assert.match(cliente, /changeRole/);
});

test('solo api.js hace peticiones HTTP: la interfaz y el juego no usan fetch', () => {
  const infractores = ficheros(path.join(PUBLIC, 'js'), '.js')
    .filter((f) => path.basename(f) !== 'api.js')
    .filter((f) => /\bfetch\s*\(|XMLHttpRequest/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(infractores, []);
});

test('la interfaz no inserta texto de usuario como HTML (sin innerHTML en vistas ni formularios)', () => {
  const dirs = [path.join(PUBLIC, 'js', 'ui')];
  const infractores = dirs.flatMap((d) => ficheros(d, '.js'))
    .filter((f) => path.basename(f) !== 'dom.js') // dom.js solo convierte iconos propios
    .filter((f) => /\.innerHTML\s*=/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(infractores, []);
});

test('los módulos del frontend se pueden importar (sin errores de sintaxis ni dependencias rotas)', async () => {
  const { pathToFileURL } = require('node:url');
  const modulos = ficheros(path.join(PUBLIC, 'js', 'game'), '.js').filter((f) => !f.endsWith('juego.js') && !f.endsWith('audio.js'));
  for (const f of modulos) await import(pathToFileURL(f).href);
  await import(pathToFileURL(path.join(PUBLIC, 'js', 'api.js')).href);
});

test('la interfaz gestiona la confirmación por correo (aviso del enlace y reenvío)', () => {
  const leer = (...partes) => fs.readFileSync(path.join(PUBLIC, 'js', ...partes), 'utf8');
  assert.match(leer('ui.js'), /cuenta-confirmada/);
  assert.match(leer('ui', 'vistas', 'entrar.js'), /ACCOUNT_PENDING/);
  assert.match(leer('api.js'), /resendConfirmation/);
});
