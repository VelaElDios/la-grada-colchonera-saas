// Pruebas de los muñecos de píxeles (sprites.js): se pintan sin DOM, cada persona tiene su cara,
// caminan con 4 fotogramas y los rivales genéricos varían.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);

/** Huella de una zona de píxeles (filas desde `y0` hasta `y1`, sin incluir). */
const huella = (d, ancho, y0, y1) => Buffer.from(d.subarray(y0 * ancho * 4, y1 * ancho * 4)).toString('base64');
const opaco = (d, ancho, x, y) => d[(y * ancho + x) * 4 + 3] > 127;

test('muñeco chibi: cuadrícula cuadrada de 32×32 (cabeza grande, sin piernas) y 4 fotogramas de caminar', async () => {
  const S = await cargar('sprites.js');
  assert.equal(S.ANCHO, 32);
  assert.equal(S.ALTO, 32, 'chibi: sin piernas, el muñeco es cuadrado');
  assert.equal(S.FOTOGRAMAS, 4);
});

test('todos los muñecos se pintan sin DOM, con colores válidos y pisando la última fila', async () => {
  const S = await cargar('sprites.js');
  const { PERSONAJES, ENTRENADORES, JEFES, EQUIPOS, PIELES, PELOS } = await cargar('config.js');
  const aspectos = [
    ...Object.keys(PERSONAJES).map((k) => [`personaje ${k}`, S.aspectoDe('personaje', k)]),
    ...Object.keys(ENTRENADORES).map((k) => [`entrenador ${k}`, S.aspectoDe('entrenador', k)]),
    ...Object.keys(JEFES).map((k) => [`jefe ${k}`, S.aspectoDe('jefe', k)]),
  ];
  for (const e of Object.keys(EQUIPOS)) for (let p = 0; p < PIELES.length; p++) for (let q = 0; q < PELOS.length; q++) aspectos.push([`rival ${e} ${p} ${q}`, S.aspectoDe('rival', e, p, q)]);
  for (const [nombre, a] of aspectos) {
    for (let f = 0; f < S.FOTOGRAMAS; f++) {
      const d = S.pixelesMuneco(a, f);
      assert.equal(d.length, S.ANCHO * S.ALTO * 4, nombre);
      let pintados = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        pintados++;
        assert.ok(!(d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255), `${nombre}: hay un color que no se entiende (magenta)`);
      }
      assert.ok(pintados > S.ANCHO * S.ALTO * 0.35, `${nombre}: el muñeco ocupa su cuadrícula`);
      let pisa = false;
      for (let x = 0; x < S.ANCHO; x++) if (opaco(d, S.ANCHO, x, S.ALTO - 1)) pisa = true;
      assert.ok(pisa, `${nombre} (fotograma ${f}): todos pisan la misma fila`);
    }
  }
});

test('cada jugador, entrenador y jefe tiene una cabeza distinta (no solo la camiseta)', async () => {
  const S = await cargar('sprites.js');
  const { PERSONAJES, ENTRENADORES, JEFES } = await cargar('config.js');
  const vistas = new Map();
  const todos = [
    ...Object.keys(PERSONAJES).map((k) => ['personaje', k]),
    ...Object.keys(ENTRENADORES).map((k) => ['entrenador', k]),
    ...Object.keys(JEFES).map((k) => ['jefe', k]),
  ];
  for (const [tipo, k] of todos) {
    const a = S.aspectoDe(tipo, k);
    const d = S.pixelesMuneco(a, 0);
    // Solo la cabeza: desde arriba hasta la barbilla (el cráneo mide 18 filas)
    const h = huella(d, S.ANCHO, 0, S.filaCabeza(a) + 18);
    assert.ok(!vistas.has(h), `${tipo} ${k} tiene la misma cabeza que ${vistas.get(h)}`);
    vistas.set(h, `${tipo} ${k}`);
  }
});

test('cada peinado y cada barba se dibujan de verdad (no caen en el corto por defecto)', async () => {
  const S = await cargar('sprites.js');
  const { PERSONAJES, ENTRENADORES, JEFES, PELOS } = await cargar('config.js');
  const todos = [...Object.values(PERSONAJES), ...Object.values(ENTRENADORES), ...Object.values(JEFES)].map((p) => p.aspecto);
  const peinados = new Set([...todos.map((a) => a.pelo.e), ...PELOS.map((p) => p.e)]);
  const base = { ...PERSONAJES.koke.aspecto, barba: undefined, pelo: { c: '#3a2214', e: 'corto' } };
  const corto = huella(S.pixelesMuneco(base, 0), S.ANCHO, 0, S.ALTO);
  const vistos = new Set([corto]);
  for (const e of peinados) {
    if (e === 'corto') continue;
    const h = huella(S.pixelesMuneco({ ...base, pelo: { c: '#3a2214', e } }, 0), S.ANCHO, 0, S.ALTO);
    assert.ok(!vistos.has(h), `el peinado ${e} se ve igual que otro`);
    vistos.add(h);
  }
  const barbas = new Set(todos.filter((a) => a.estiloBarba).map((a) => a.estiloBarba));
  ['completa', 'corta', 'perilla', 'candado'].forEach((b) => assert.ok(barbas.has(b), `se usa la barba ${b}`));
  const sinBarba = huella(S.pixelesMuneco(base, 0), S.ANCHO, 0, S.ALTO);
  const hechas = new Set([sinBarba]);
  for (const estilo of [...barbas, 'incipiente', 'bigote']) {
    const h = huella(S.pixelesMuneco({ ...base, barba: '#2b1b12', estiloBarba: estilo }, 0), S.ANCHO, 0, S.ALTO);
    assert.ok(!hechas.has(h), `la barba ${estilo} se ve igual que otra`);
    hechas.add(h);
  }
});

test('al caminar se mueven las piernas y los brazos: parado, un pie, parado y el otro pie', async () => {
  const S = await cargar('sprites.js');
  for (const a of [S.aspectoDe('personaje', 'griezmann'), S.aspectoDe('entrenador', 'cholo'), S.aspectoDe('jefe', 'mourinho'), S.aspectoDe('rival', 'madrid', 1, 2)]) {
    const f = [0, 1, 2, 3].map((k) => huella(S.pixelesMuneco(a, k), S.ANCHO, 0, S.ALTO));
    assert.equal(f[0], f[2], 'los dos fotogramas «parado» son iguales');
    assert.notEqual(f[0], f[1]);
    assert.notEqual(f[0], f[3]);
    assert.notEqual(f[1], f[3], 'cada paso levanta un pie distinto');
    // La cabeza no cambia al caminar (lo que se mueve es el cuerpo)
    const cabeza = (k) => huella(S.pixelesMuneco(a, k), S.ANCHO, 0, S.filaCabeza(a) + 18);
    assert.equal(cabeza(0), cabeza(1));
  }
});

test('los rivales genéricos varían: muchas combinaciones de pelo, piel, barba y cuerpo por equipo', async () => {
  const S = await cargar('sprites.js');
  const { EQUIPOS, PIELES, PELOS } = await cargar('config.js');
  // oleadas.js reparte el pelo con (id * 7) % PELOS.length: con un número primo con 7 salen todos
  const mcd = (a, b) => (b ? mcd(b, a % b) : a);
  assert.equal(mcd(PELOS.length, 7), 1, 'todos los peinados de rival llegan a salir');
  assert.ok(PELOS.length >= 8, 'hay bastantes peinados de rival');
  for (const e of Object.keys(EQUIPOS)) {
    const distintos = new Set();
    for (let id = 0; id < 80; id++) {
      const a = S.aspectoDe('rival', e, id % PIELES.length, (id * 7) % PELOS.length);
      distintos.add(huella(S.pixelesMuneco(a, 0), S.ANCHO, 0, S.ALTO));
    }
    assert.ok(distintos.size >= 30, `${e}: solo ${distintos.size} rivales distintos`);
  }
  // Los tanques (radio grande) son anchos y los velocistas, delgados
  assert.equal(S.aspectoRival('benfica', 0, 0).complexion, 'ancha');
  assert.equal(S.aspectoRival('dortmund', 0, 0).complexion, 'delgada');
});

test('los entrenadores siguen con su ropa en el Mundial (traje, jersey o abrigo)', async () => {
  const S = await cargar('sprites.js');
  for (const k of ['guardiola', 'mourinho']) {
    const a = S.aspectoDe('jefe', k);
    assert.equal(S.conSeleccion(a, 'España'), a, `${k} no se pone la camiseta de la selección`);
  }
  assert.equal(S.aspectoDe('jefe', 'guardiola').ropa, 'jersey');
  assert.equal(S.aspectoDe('jefe', 'mourinho').ropa, 'abrigo');
});

test('la caché guarda cada muñeco una vez y el destello blanco se crea al pedirlo (con un lienzo falso)', async () => {
  const contextos = [];
  const lienzo = () => {
    const c = { width: 0, height: 0 };
    c.getContext = () => {
      const cx = {
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
        drawImage: (...args) => cx.dibujos.push(args),
        fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
        dibujos: [],
      };
      contextos.push(cx);
      return cx;
    };
    return c;
  };
  const anterior = globalThis.document;
  globalThis.document = { createElement: lienzo };
  try {
    const S = await cargar('sprites.js');
    const a = S.aspectoDe('personaje', 'torres');
    const s1 = S.obtenerSprite('prueba:torres', a);
    assert.equal(s1.frames.length, 4);
    assert.equal(s1.blancos.length, 0, 'el destello aún no se ha creado');
    assert.equal(S.obtenerSprite('prueba:torres', a), s1, 'la segunda vez sale de la caché');
    assert.equal(s1.cabeza, S.filaCabeza(a));
    const destino = { drawImage: (...args) => destino.args.push(args), save() {}, restore() {}, translate() {}, scale() {}, args: [] };
    S.dibujarSprite(destino, s1, 0, 0, 40, 7, false, true); // fotograma 7 → 7 % 4 = 3
    assert.ok(s1.blancos[3], 'el destello del fotograma 3 ya existe');
    assert.equal(destino.args[0][0], s1.blancos[3]);
    S.dibujarSprite(destino, s1, 0, 0, 40, 1, true, false);
    assert.equal(destino.args[1][0], s1.frames[1]);
    const cara = S.encuadreCara(s1);
    assert.ok(cara.x >= 0 && cara.y >= 0 && cara.x + cara.lado <= S.ANCHO && cara.y + cara.lado <= S.ALTO, 'el encuadre de la cara cabe en el muñeco');
  } finally {
    globalThis.document = anterior;
  }
});

test('muñeco chibi: sin piernas, debajo del pantalón asoman directamente los zapatos', async () => {
  const S = await cargar('sprites.js');
  const C = await cargar('config.js');
  const base = { ...C.PERSONAJES.koke.aspecto, medias: '#00ff00' };
  for (let f = 0; f < S.FOTOGRAMAS; f++) {
    const d = S.pixelesMuneco(base, f);
    for (let i = 0; i < d.length; i += 4) {
      assert.ok(!(d[i] === 0 && d[i + 1] === 255 && d[i + 2] === 0 && d[i + 3] > 0), `fotograma ${f}: no se pintan medias (no hay piernas)`);
    }
  }
});
