// Pruebas del dibujo del mapa (render-suelo.js, render-obstaculos.js y render-paletas.js) con un lienzo falso:
// sombras coherentes, dibujos que ocupan justo lo que choca, público animado barato y texturas repartidas.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);

/** `document` falso: cada lienzo guarda los píxeles que se le ponen con putImageData. */
function documentoFalso() {
  let texturas = 0;
  const crear = () => {
    const lienzo = { width: 0, height: 0, datos: null };
    const ctx = new Proxy({}, {
      get: (obj, k) => {
        if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
        if (k === 'putImageData') return (img) => { lienzo.datos = img.data.slice(); if (lienzo.width === 320) texturas += 1; };
        if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
        if (k in obj) return obj[k];
        return () => {};
      },
      set: (obj, k, v) => { obj[k] = v; return true; },
    });
    lienzo.getContext = () => ctx;
    return lienzo;
  };
  return { createElement: crear, texturas: () => texturas };
}

/** Contexto falso que apunta cada drawImage. */
function contextoQueApunta() {
  const dibujos = [];
  const ctx = new Proxy({}, {
    get: (obj, k) => {
      if (k === 'drawImage') return (img, x, y, w, h) => dibujos.push({ img, x, y, w, h });
      if (k in obj) return obj[k];
      return () => {};
    },
    set: (obj, k, v) => { obj[k] = v; return true; },
  });
  return { ctx, dibujos };
}

async function conDocumento(fn) {
  const anterior = globalThis.document;
  const doc = documentoFalso();
  globalThis.document = doc;
  try {
    return await fn(doc);
  } finally {
    globalThis.document = anterior;
  }
}

/** Obstáculos y adornos de un trozo del mapa. */
async function muestra(semilla, radio = 8) {
  const T = await cargar('terreno.js');
  const t = T.crearTerreno(semilla);
  const obstaculos = [];
  const decor = [];
  for (let cx = -radio; cx <= radio; cx++) {
    for (let cy = -radio; cy <= radio; cy++) {
      const c = T.celda(t, cx, cy);
      obstaculos.push(...c.obstaculos);
      decor.push(...c.decor);
    }
  }
  return { T, t, obstaculos, decor };
}

test('las sombras de todo lo que está de pie caen hacia el mismo lado (abajo a la derecha) y se alargan al atardecer', async () => {
  const { sombrasDe } = await cargar('render-obstaculos.js');
  const { PALETAS } = await cargar('render-paletas.js');
  const { obstaculos, decor } = await muestra(11);
  const tipos = new Set();
  /** Centro y extremo derecho de la sombra (muestreando la forma cada 3 unidades). */
  const medir = (o, pal) => {
    let n = 0; let sx = 0; let sy = 0; let maxX = -Infinity;
    sombrasDe(o, pal, (x0, y0, x1, y1, dentro) => {
      for (let y = y0; y <= y1; y += 3) for (let x = x0; x <= x1; x += 3) if (dentro(x, y)) { n++; sx += x; sy += y; maxX = Math.max(maxX, x); }
    });
    return n ? { x: sx / n, y: sy / n, maxX } : null;
  };
  for (const o of [...obstaculos, ...decor]) {
    if (o.tipo === 'talud' || o.tipo === 'balon' || o.tipo === 'conos' || o.tipo === 'piedras') continue;
    const pie = o.y + (o.h || 0) / 2;
    const baseY = o.hBase !== undefined ? pie - o.hBase / 2 : o.y; // centro de lo que pisa
    for (const clave of Object.keys(PALETAS)) {
      const s = medir(o, PALETAS[clave]);
      assert.ok(s, `${o.tipo} echa sombra en ${clave}`);
      assert.ok(s.x > o.x, `la sombra de ${o.tipo} va a la derecha en ${clave}`);
      assert.ok(s.y >= baseY - 1, `la sombra de ${o.tipo} va hacia abajo en ${clave}`);
    }
    tipos.add(o.tipo);
    if (o.tipo === 'arbol' || o.tipo === 'foco' || o.tipo === 'grada') {
      assert.ok(medir(o, PALETAS.liga).maxX > medir(o, PALETAS.inicio).maxX, `al atardecer la sombra de ${o.tipo} es más larga`);
    }
  }
  for (const tipo of ['arbol', 'grada', 'foco', 'tienda', 'kiosco', 'farola', 'mata']) assert.ok(tipos.has(tipo), `se ha probado ${tipo}`);
});

test('lo que se ve es lo que choca también al dibujar: cada macizo ocupa justo su rectángulo de colisión', async () => {
  await conDocumento(async () => {
    const RO = await cargar('render-obstaculos.js');
    const { MACIZOS } = await cargar('terreno.js');
    const { AMBIENTES } = await cargar('config.js');
    const { PX } = await cargar('render-paletas.js');
    const { obstaculos } = await muestra(4, 7);
    const mundo = { jugador: { personaje: 'koke', x: 1e6, y: 1e6 } };
    let probados = 0;
    for (const amb of [AMBIENTES[0], AMBIENTES[3], AMBIENTES[4]]) {
      for (const o of obstaculos) {
        if (!MACIZOS.has(o.tipo)) continue;
        const { ctx, dibujos } = contextoQueApunta();
        RO.dibujarObstaculo(ctx, o, amb, mundo, 1.7);
        assert.equal(dibujos.length, 1, `${o.tipo} se dibuja con un solo drawImage`);
        const [d] = dibujos;
        assert.deepEqual([d.x, d.y, d.w, d.h], [o.x - o.w / 2, o.y - o.h / 2, o.w, o.h], `${o.tipo} ocupa su colisión`);
        assert.equal(d.img.width, Math.max(2, Math.round(o.w / PX)), `${o.tipo}: píxeles de ${PX} unidades (ancho)`);
        assert.equal(d.img.height, Math.max(2, Math.round(o.h / PX)), `${o.tipo}: píxeles de ${PX} unidades (alto)`);
        probados++;
      }
    }
    assert.ok(probados > 50);
  });
});

test('el público de la grada se anima con fotogramas guardados y se queda quieto con los efectos reducidos', async () => {
  await conDocumento(async () => {
    const RO = await cargar('render-obstaculos.js');
    const { AMBIENTES } = await cargar('config.js');
    const { obstaculos } = await muestra(7, 10);
    const grada = obstaculos.find((o) => o.tipo === 'grada');
    assert.ok(grada, 'hay alguna grada');
    const dibujo = (t, reducido = false) => {
      const { ctx, dibujos } = contextoQueApunta();
      RO.dibujarObstaculo(ctx, grada, AMBIENTES[1], { jugador: { personaje: 'koke' }, efectosReducidos: reducido }, t);
      return dibujos[0].img;
    };
    const vistos = new Set();
    for (let i = 0; i < 16; i++) vistos.add(dibujo(i * 0.08));
    assert.ok(vistos.size >= 3 && vistos.size <= 4, 'unos pocos fotogramas (no se repinta cada vez)');
    const datos = [...vistos].map((c) => c.datos.join());
    assert.equal(new Set(datos).size, vistos.size, 'cada fotograma es distinto: la gente salta');
    assert.equal(dibujo(0.5), dibujo(0.5), 'el mismo instante reutiliza el dibujo guardado');
    const quietos = new Set();
    for (let i = 0; i < 16; i++) quietos.add(dibujo(i * 0.08, true));
    assert.equal(quietos.size, 1, 'con los efectos reducidos no se mueve');
  });
});

test('las texturas del suelo se reparten entre fotogramas: no se pintan todas de golpe, pero acaban todas', async () => {
  await conDocumento(async (doc) => {
    const RS = await cargar('render-suelo.js');
    const { AMBIENTES } = await cargar('config.js');
    const T = await cargar('terreno.js');
    const terreno = T.crearTerreno(97);
    const celdas = [];
    for (let cx = 3; cx < 6; cx++) for (let cy = 3; cy < 5; cy++) celdas.push(T.celda(terreno, cx, cy));
    const mundo = { terreno, yaPintado: true }; // ya no es el primer fotograma: hay presupuesto de tiempo
    const { ctx } = contextoQueApunta();
    RS.dibujarSuelo(ctx, mundo, celdas, AMBIENTES[2]);
    assert.ok(doc.texturas() < celdas.length, 'en un fotograma no da tiempo a pintar seis texturas');
    let fotogramas = 1;
    while (doc.texturas() < celdas.length && fotogramas < 400) { RS.dibujarSuelo(ctx, mundo, celdas, AMBIENTES[2]); fotogramas++; }
    assert.equal(doc.texturas(), celdas.length, 'al final están todas');
    const antes = doc.texturas();
    RS.dibujarSuelo(ctx, mundo, celdas, AMBIENTES[2]);
    assert.equal(doc.texturas(), antes, 'las ya pintadas se reutilizan');
  });
});

test('la letra de píxeles escribe los textos de los carteles y caben en las vallas', async () => {
  const { anchoTexto, escribir, PALETAS } = await cargar('render-paletas.js');
  let maxX = -1;
  let puntos = 0;
  escribir('AUPA ATLETI 1903', 0, 0, (x, y) => { maxX = Math.max(maxX, x); puntos++; assert.ok(y >= 0 && y < 5); });
  assert.equal(maxX, anchoTexto('AUPA ATLETI 1903') - 1);
  assert.ok(puntos > 60);
  const ancho = Math.round(130 / 2) - 4; // valla del estadio
  for (const pal of Object.values(PALETAS)) assert.ok(pal.textos.some((t) => anchoTexto(t) <= ancho), 'algún texto cabe en la valla');
});

test('cada mapa dibuja sus propios obstáculos: el de la partida anterior (o el del menú) no se cuela en la nueva', async () => {
  await conDocumento(async () => {
    const RO = await cargar('render-obstaculos.js');
    const { AMBIENTES } = await cargar('config.js');
    const mundo = { jugador: { personaje: 'koke', x: 1e6, y: 1e6 } };
    const a = (await muestra(101, 3)).obstaculos.filter((o) => o.tipo !== 'talud');
    const b = (await muestra(202, 3)).obstaculos.filter((o) => o.tipo !== 'talud');
    const dibujo = (o) => {
      const { ctx, dibujos } = contextoQueApunta();
      RO.dibujarObstaculo(ctx, o, AMBIENTES[0], mundo, 0);
      return dibujos[0]?.img;
    };
    const deA = new Map(a.map((o) => [`${o.id.split(':').slice(1).join(':')}`, dibujo(o)]));
    let mismaCasilla = 0;
    for (const o of b) {
      const casilla = o.id.split(':').slice(1).join(':'); // misma celda y mismo número de obstáculo que en el mapa A
      if (!deA.has(casilla)) continue;
      mismaCasilla += 1;
      const img = dibujo(o);
      if (!img) continue;
      assert.notEqual(img, deA.get(casilla), `el ${o.tipo} ${o.id} no usa el dibujo del mapa anterior`);
    }
    assert.ok(mismaCasilla > 20, 'hay obstáculos que antes compartían identificador');
  });
});
