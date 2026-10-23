// Pruebas del motor del juego: la simulación es independiente del dibujo, así que se prueba sin navegador.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);
const PASO = 1 / 60;

async function simular(mundoModulo, mundo, segundos, entrada = { x: 0, y: 0 }) {
  for (let i = 0; i < segundos * 60 && mundo.estado !== 'fin'; i++) {
    if (mundo.estado === 'mejora') mundoModulo.elegirMejora(mundo, mundo.opciones[0].id);
    mundoModulo.avanzar(mundo, PASO, entrada);
    mundo.eventos.length = 0;
  }
}

function sinNaN(valor, ruta = 'mundo') {
  if (typeof valor === 'number') assert.ok(Number.isFinite(valor), `${ruta} no es un número finito`);
  else if (Array.isArray(valor)) valor.forEach((v, i) => sinNaN(v, `${ruta}[${i}]`));
  else if (valor && typeof valor === 'object' && ruta.split('.').length < 4) {
    for (const [k, v] of Object.entries(valor)) if (k !== 'cuadricula') sinNaN(v, `${ruta}.${k}`);
  }
}

test('el generador aleatorio con semilla es determinista', async () => {
  const { crearRng } = await cargar('util.js');
  const a = crearRng(42);
  const b = crearRng(42);
  const c = crearRng(43);
  const sa = Array.from({ length: 10 }, () => a.siguiente());
  assert.deepEqual(sa, Array.from({ length: 10 }, () => b.siguiente()));
  assert.notDeepEqual(sa, Array.from({ length: 10 }, () => c.siguiente()));
  sa.forEach((n) => assert.ok(n >= 0 && n < 1));
});

test('la misma semilla produce la misma partida', async () => {
  const m = await cargar('mundo.js');
  const resultados = [];
  for (let i = 0; i < 2; i++) {
    const mundo = m.crearMundo({ semilla: 7 });
    await simular(m, mundo, 20, { x: 1, y: 0 });
    resultados.push(JSON.stringify([mundo.jugador.x, mundo.jugador.y, mundo.jugador.vida, mundo.jugador.bajas, mundo.enemigos.length]));
  }
  assert.equal(resultados[0], resultados[1]);
});

test('la experiencia necesaria para subir crece con el nivel', async () => {
  const { xpParaSubir } = await cargar('config.js');
  for (let n = 1; n < 30; n++) assert.ok(xpParaSubir(n + 1) > xpParaSubir(n), `nivel ${n}`);
});

test('una partida larga no genera valores inválidos y respeta los límites', async () => {
  const m = await cargar('mundo.js');
  const { MUNDO } = await cargar('config.js');
  const mundo = m.crearMundo({ semilla: 3 });
  for (let s = 0; s < 6; s++) {
    await simular(m, mundo, 20, { x: Math.cos(s), y: Math.sin(s) });
    sinNaN(mundo.jugador, 'jugador');
    assert.ok(mundo.enemigos.length <= MUNDO.maxEnemigos);
    assert.ok(mundo.gemas.length <= MUNDO.maxGemas);
  }
  assert.ok(mundo.oleada >= 2, 'tras 2 minutos debe haber pasado de oleada');
});

test('los enemigos aparecen fuera de la pantalla, a la distancia configurada', async () => {
  const m = await cargar('mundo.js');
  const { MUNDO } = await cargar('config.js');
  const mundo = m.crearMundo({ semilla: 11 });
  await simular(m, mundo, 3);
  assert.ok(mundo.enemigos.length > 0);
  const cerca = mundo.enemigos.filter((e) => Math.hypot(e.x - mundo.jugador.x, e.y - mundo.jugador.y) < MUNDO.distanciaAparicion - 150);
  assert.equal(cerca.length, 0);
});

test('subir de nivel pausa la partida hasta elegir una mejora, y la mejora se aplica', async () => {
  const m = await cargar('mundo.js');
  const mundo = m.crearMundo({ semilla: 5 });
  mundo.pendientes = 1; // como si hubiera recogido experiencia suficiente
  m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.equal(mundo.estado, 'mejora');
  assert.ok(mundo.opciones.length >= 1 && mundo.opciones.length <= 3);
  const t = mundo.tiempo;
  m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.equal(mundo.tiempo, t, 'el tiempo no avanza mientras se elige');
  assert.ok(m.elegirMejora(mundo, mundo.opciones[0].id));
  assert.equal(mundo.estado, 'jugando');
  assert.equal(mundo.pendientes, 0);
  assert.equal(m.elegirMejora(mundo, 'no-existe'), false);
});

test('si la vida llega a 0 la partida termina y el resumen es coherente', async () => {
  const m = await cargar('mundo.js');
  const mundo = m.crearMundo({ semilla: 9 });
  await simular(m, mundo, 5);
  mundo.jugador.vida = 0.01;
  mundo.jugador.invul = 0;
  // un rival encima del jugador
  const { crearEnemigo } = await cargar('oleadas.js');
  const e = crearEnemigo('madrid', mundo.jugador.x, mundo.jugador.y, 1);
  mundo.enemigos.push(e);
  await simular(m, mundo, 3);
  assert.equal(mundo.estado, 'fin');
  const r = m.resumen(mundo);
  assert.ok(r.tiempo > 0 && r.oleada >= 1 && r.nivel >= 1);
});

test('la mejor marca solo se guarda si supera a la anterior', async () => {
  const marca = await cargar('marca.js');
  const almacen = new Map();
  global.localStorage = { getItem: (k) => almacen.get(k) ?? null, setItem: (k, v) => almacen.set(k, String(v)) };
  try {
    const u = { id: 'u1' };
    assert.equal(marca.leerMarca(u), null);
    assert.equal(marca.guardarMarca(u, { tiempo: 50, oleada: 2, nivel: 3, bajas: 20 }), true);
    assert.equal(marca.guardarMarca(u, { tiempo: 30, oleada: 1, nivel: 2, bajas: 5 }), false);
    assert.equal(marca.leerMarca(u).tiempo, 50);
    assert.equal(marca.guardarMarca(u, { tiempo: 90, oleada: 4, nivel: 6, bajas: 60 }), true);
    assert.match(marca.textoMarca(marca.leerMarca(u)), /1:30/);
  } finally {
    delete global.localStorage;
  }
});
