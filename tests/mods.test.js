// Pruebas de los mods (Ajustes → Mods): el registro, el estado guardado en el navegador (por defecto desactivado),
// el tema visual del Albacete Balompié y que el DLC ya no tiene botones ni selectores propios en la interfaz.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PUBLICO = path.join(__dirname, '..', 'public');
const cargar = (...partes) => import(pathToFileURL(path.join(PUBLICO, ...partes)).href);
const leer = (...partes) => fs.readFileSync(path.join(PUBLICO, ...partes), 'utf8');

/** localStorage de mentira. */
function almacen(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => { datos.set(k, String(v)); },
    removeItem: (k) => { datos.delete(k); },
    datos,
  };
}

/** Raíz del documento de mentira (solo atributos). */
function raiz() {
  const attrs = new Map();
  return {
    setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k), getAttribute: (k) => attrs.get(k) ?? null,
  };
}

test('registro de mods: el del Albacete Balompié apunta a su pack, su tema y dice lo que trae', async () => {
  const { MODS } = await cargar('js', 'mods.js');
  const { PACKS, jugadoresDePack } = await cargar('js', 'game', 'config.js');
  const alba = MODS.albacete;
  assert.equal(alba.nombre, 'Albacete Balompié — El Queso Mecánico');
  assert.equal(alba.tema, 'albacete');
  assert.ok(PACKS[alba.pack], 'su pack existe en config.js');
  assert.equal(jugadoresDePack(alba.pack).length, 14);
  assert.ok(alba.descripcion.length > 60);
  assert.ok(alba.incluye.includes('Tema visual'));
  for (const m of Object.values(MODS)) assert.ok(PACKS[m.pack] && m.tema && m.nombre, m.id);
});

test('estado del mod: por defecto desactivado (juego original), se guarda y se quita, y lo raro cuenta como ninguno', async () => {
  const { modActivo, ponerMod, packDelMod } = await cargar('js', 'mods.js');
  const a = almacen();
  assert.equal(modActivo(a), null, 'sin nada guardado arranca con el Atleti');
  assert.equal(packDelMod(modActivo(a)), 'atleti');

  assert.equal(ponerMod('albacete', a), 'albacete');
  assert.equal(modActivo(a), 'albacete');
  assert.equal(packDelMod(modActivo(a)), 'alba');
  assert.deepEqual(JSON.parse(a.getItem('grada.mods')), { activo: 'albacete' });

  assert.equal(ponerMod(null, a), null);
  assert.equal(modActivo(a), null);
  assert.equal(a.getItem('grada.mods'), null, 'al desactivarlo no queda nada guardado');

  assert.equal(ponerMod('inventado', a), null, 'un mod que no existe no se activa');
  assert.equal(modActivo(almacen({ 'grada.mods': '{roto' })), null);
  assert.equal(modActivo(almacen({ 'grada.mods': JSON.stringify({ activo: 'inventado' }) })), null);
  assert.equal(modActivo(almacen({ 'grada.mods': JSON.stringify({ activo: '__proto__' }) })), null);
  // Sin almacenamiento (navegador en modo privado estricto) no falla
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); }, removeItem: () => {} };
  assert.equal(modActivo(roto), null);
  assert.equal(ponerMod('albacete', roto), 'albacete');
});

test('tema visual: data-mod-theme="albacete" con el mod y nada sin él', async () => {
  const { aplicarTema } = await cargar('js', 'mods.js');
  const r = raiz();
  aplicarTema('albacete', r);
  assert.equal(r.getAttribute('data-mod-theme'), 'albacete');
  aplicarTema(null, r);
  assert.equal(r.getAttribute('data-mod-theme'), null, 'al desactivarlo vuelve el tema original');
  aplicarTema('inventado', r);
  assert.equal(r.getAttribute('data-mod-theme'), null);
});

test('la hoja del tema se carga en la web, solo actúa con el mod activo y cambia la paleta entera', () => {
  const html = leer('index.html');
  assert.match(html, /href="\/css\/mod-albacete\.css"/);
  assert.ok(html.indexOf('mod-albacete.css') > html.indexOf('juego.css'), 'va después para poder sobrescribir');
  const css = leer('css', 'mod-albacete.css');
  // Cada regla empieza por el selector del tema: sin el atributo no se aplica nada
  const reglas = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((r) => r.trim()).filter((r) => r.includes('{'));
  assert.ok(reglas.length > 15);
  for (const regla of reglas) {
    const selectores = regla.slice(0, regla.indexOf('{')).split(',').map((x) => x.trim());
    selectores.forEach((sel) => assert.ok(sel.startsWith(':root[data-mod-theme="albacete"]'), `regla sin el selector del tema: ${sel}`));
  }
  for (const v of ['--rojo', '--acento', '--marino', '--azul-800', '--azul-700', '--velo-rgb', '--rojo-club-rgb']) {
    assert.match(css, new RegExp(`${v}:`), `el tema redefine ${v}`);
  }
  // Y esas variables existen en la paleta original con el valor de siempre (el Atleti no cambia)
  const tokens = leer('css', 'tokens.css');
  assert.match(tokens, /--acento: #ff4d63;/);
  assert.match(tokens, /--rojo-club-rgb: 200 16 46;/);
  assert.match(tokens, /--marino: #1b2a5c;/);
  // Los colores de marca ya no están escritos a mano en los estilos del juego
  const juego = leer('css', 'juego.css');
  assert.doesNotMatch(juego, /#ff4d63|#1b2a5c|rgb\(200 16 46|rgb\(4 7 20/i);
});

test('la web aplica el tema al arrancar (la cabecera ya sale con él)', () => {
  const ui = leer('js', 'ui.js');
  assert.match(ui, /import \{ aplicarTema \} from '\.\/mods\.js'/);
  assert.ok(ui.indexOf('aplicarTema();') < ui.indexOf('montarCabecera('), 'antes de pintar la cabecera');
});

test('Ajustes tiene las pestañas General y Mods con el interruptor, y el DLC ya no tiene botones propios', () => {
  const juego = leer('js', 'game', 'juego.js');
  assert.match(juego, /role="tablist"/);
  assert.match(juego, /data-pestana-ajustes="general"/);
  assert.match(juego, /data-pestana-ajustes="mods"/);
  assert.match(juego, /data-panel-ajustes="mods"/);
  assert.match(juego, /role="switch" data-mod=/);
  assert.match(juego, /cambiarMod\(/);
  // Ni botón de «Activar/Añadir DLC», ni selector dual de equipos, ni franja del DLC, ni sus estilos
  const todo = [juego, leer('js', 'game', 'club-ui.js'), leer('css', 'juego.css')].join('\n');
  for (const resto of ['Activar DLC', 'Añadir DLC', 'data-accion="activarPack"', 'data-pack=', 'htmlPacks', 'pack-aviso', 'pack-boton', 'packs-vestuario']) {
    assert.ok(!todo.includes(resto), `queda rastro del DLC: ${resto}`);
  }
});

test('confeti del menú con los colores del tema', async () => {
  const { PALETAS_PAPELITOS, crearPapelitos } = await cargar('js', 'game', 'menu-fx.js');
  assert.ok(PALETAS_PAPELITOS.atleti.length && PALETAS_PAPELITOS.albacete.length);
  assert.ok(PALETAS_PAPELITOS.albacete.flat().includes('#d4af37'), 'oro del Alba');
  assert.ok(!PALETAS_PAPELITOS.albacete.flat().includes('#d4152f'), 'sin rojo del Atleti');
  assert.equal(typeof crearPapelitos({ paleta: () => PALETAS_PAPELITOS.albacete }), 'object');
});

test('sin mod, la vitrina de logros no enseña los del Alba', async () => {
  const { htmlLogros } = await cargar('js', 'game', 'fin-ui.js');
  const { LOGROS } = await cargar('js', 'game', 'logros.js');
  const originales = Object.keys(LOGROS).filter((k) => !LOGROS[k].pack);
  const sin = htmlLogros({}, originales);
  assert.match(sin.cuenta, new RegExp(`0 de ${originales.length} conseguidos`));
  assert.doesNotMatch(sin.html, /Queso Mecánico|Belmonte|Alba/);
  const con = htmlLogros({}, Object.keys(LOGROS));
  assert.match(con.html, /El Queso Mecánico/);
});
