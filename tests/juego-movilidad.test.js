// Pruebas de movilidad: terreno (barro, lluvia, gradas), ritmo, premios, rivales que embisten o disparan y jefes con fases.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);
const PASO = 1 / 60;

/** Busca en el terreno la primera celda con lo que se pide. */
async function buscar(semilla, que) {
  const T = await cargar('terreno.js');
  const t = T.crearTerreno(semilla);
  for (let cx = -8; cx <= 8; cx++) {
    for (let cy = -8; cy <= 8; cy++) {
      const c = T.celda(t, cx, cy);
      if (que === 'barro' && c.zona?.tipo === 'barro') return { T, t, zona: c.zona };
      if (que === 'lluvia' && c.zona?.tipo === 'lluvia') return { T, t, zona: c.zona };
      if (que === 'grada' && c.grada) return { T, t, grada: c.grada };
    }
  }
  throw new Error(`no hay ${que} cerca del inicio`);
}

/** Mundo sin rivales y con el jugador inmortal, para probar una sola cosa. */
async function mundoLimpio(semilla = 3, opciones = {}) {
  const m = await cargar('mundo.js');
  const mundo = m.crearMundo({ semilla, ...opciones });
  mundo.temporizadorAparicion = 1e9;
  mundo.temporizadorPremio = 1e9;
  mundo.jugador.vida = 1e9;
  mundo.jugador.vidaMax = 1e9;
  return { m, mundo };
}

test('el terreno es siempre el mismo para una semilla y no hay gradas encima del punto de salida', async () => {
  const T = await cargar('terreno.js');
  const { TERRENO } = await cargar('config.js');
  const a = T.crearTerreno(42);
  const b = T.crearTerreno(42);
  const c = T.crearTerreno(43);
  let distintas = 0;
  for (let cx = -6; cx <= 6; cx++) {
    for (let cy = -6; cy <= 6; cy++) {
      const ca = T.celda(a, cx, cy);
      assert.deepEqual(ca, T.celda(b, cx, cy));
      if (JSON.stringify(ca) !== JSON.stringify(T.celda(c, cx, cy))) distintas++;
      if (ca.grada) {
        assert.ok(Math.hypot(ca.grada.x, ca.grada.y) - Math.max(ca.grada.w, ca.grada.h) / 2 > TERRENO.claroInicial - 1);
      }
    }
  }
  assert.ok(distintas > 20, 'otra semilla da otro campo');
});

test('hay zonas de barro, de lluvia y gradas repartidas por el campo', async () => {
  for (const que of ['barro', 'lluvia', 'grada']) {
    const r = await buscar(1, que);
    assert.ok(r, que);
  }
});

test('el barro frena al jugador a la mitad y la lluvia no', async () => {
  const { T, zona } = await buscar(5, 'barro');
  const { m, mundo } = await mundoLimpio(5);
  const j = mundo.jugador;
  const recorrer = (x, y) => {
    j.x = x; j.y = y;
    m.avanzar(mundo, PASO, { x: 1, y: 0 });
    return j.x - x;
  };
  assert.equal(T.zonaEn(mundo.terreno, zona.x, zona.y), 'barro');
  const enBarro = recorrer(zona.x - 5, zona.y);
  // un sitio sin barro ni gradas cerca del origen
  let libre = null;
  for (let x = -250; x <= 250 && !libre; x += 25) if (!T.zonaEn(mundo.terreno, x, 0)) libre = x;
  const normal = recorrer(libre, 0);
  assert.ok(enBarro > 0 && enBarro < normal * 0.6, `barro ${enBarro} vs normal ${normal}`);
});

test('bajo la lluvia los balones, tuyos y de los rivales, van más rápido', async () => {
  const { zona } = await buscar(7, 'lluvia');
  const { m, mundo } = await mundoLimpio(7);
  const { TERRENO } = await cargar('config.js');
  const j = mundo.jugador;
  j.x = zona.x - 300; j.y = zona.y; // lejos, para que no estorbe
  const mio = { x: zona.x, y: zona.y, vx: 100, vy: 0, r: 5, dano: 1, perfora: 1, vida: 5, rot: 0, empuje: 0, golpeados: new Set() };
  const suyo = { x: zona.x, y: zona.y, vx: 100, vy: 0, r: 5, dano: 1, vida: 5, rot: 0, giro: 0 };
  mundo.proyectiles.push(mio);
  mundo.disparosEnemigos.push(suyo);
  m.avanzar(mundo, 0.1, { x: 0, y: 0 });
  assert.ok(Math.abs(mio.x - (zona.x + 10 * TERRENO.lluvia)) < 1e-6, 'tu balón');
  assert.ok(Math.abs(suyo.x - (zona.x + 10 * TERRENO.lluvia)) < 1e-6, 'el balón rival');
});

test('las gradas no se atraviesan: ni el jugador, ni los rivales, ni los balones', async () => {
  const { T, grada } = await buscar(9, 'grada');
  const { m, mundo } = await mundoLimpio(9);
  const j = mundo.jugador;
  // el jugador choca contra la grada
  j.x = grada.x - grada.w / 2 - 40;
  j.y = grada.y;
  for (let i = 0; i < 120; i++) m.avanzar(mundo, PASO, { x: 1, y: 0 });
  assert.ok(j.x <= grada.x - grada.w / 2 - j.r + 1e-6, 'no entra en la grada');
  // un balón rival se rompe al tocarla
  const d = { x: grada.x - grada.w / 2 - 30, y: grada.y, vx: 300, vy: 0, r: 6, dano: 1, vida: 5, rot: 0, giro: 0 };
  j.x = grada.x - 600; j.y = grada.y - 600;
  mundo.disparosEnemigos.push(d);
  for (let i = 0; i < 30; i++) m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.equal(mundo.disparosEnemigos.length, 0, 'el balón rival se estrella');
  // resolver saca de dentro de la grada
  const e = { x: grada.x, y: grada.y, r: 10 };
  assert.equal(T.resolver(mundo.terreno, e), true);
  assert.equal(T.tocaGrada(mundo.terreno, e.x, e.y, e.r - 0.5), false);
});

test('correr da ritmo: más daño, más experiencia y la ulti se carga; parado, se pierde y los rivales aprietan', async () => {
  const { MOVIMIENTO } = await cargar('config.js');
  const { multiplicadorDano } = await cargar('combate.js');
  const { m, mundo } = await mundoLimpio(11);
  const j = mundo.jugador;
  const base = multiplicadorDano(j, 'cuerpo');
  for (let i = 0; i < 90; i++) m.avanzar(mundo, PASO, { x: 0, y: 1 });
  assert.ok(j.ritmo > 0.99);
  assert.ok(Math.abs(multiplicadorDano(j, 'cuerpo') - base * (1 + MOVIMIENTO.bonoDano)) < 1e-9);
  assert.ok(j.ulti.carga > 0, 'recorrer campo carga la ulti');
  for (let i = 0; i < 60; i++) m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.equal(j.ritmo, 0);
  assert.ok(j.quieto > 0.9);

  // La presión: un rival cerca va más rápido si estás quieto
  const { crearEnemigo } = await cargar('oleadas.js');
  const probar = async (quieto) => {
    const w = await mundoLimpio(12);
    const e = crearEnemigo('madrid', 200, 0, 1);
    w.mundo.enemigos.push(e);
    w.mundo.jugador.quieto = quieto ? 5 : 0;
    const x0 = e.x;
    w.m.avanzar(w.mundo, 0.5, { x: 0, y: 0 });
    return x0 - e.x;
  };
  assert.ok((await probar(true)) > (await probar(false)) * 1.3);
});

test('los premios aparecen por delante y se cobran: vida, experiencia, ulti e imán', async () => {
  const { m, mundo } = await mundoLimpio(13);
  const j = mundo.jugador;
  mundo.temporizadorPremio = 0.01;
  m.avanzar(mundo, 0.05, { x: 1, y: 0 });
  assert.equal(mundo.premios.length, 1);
  const p = mundo.premios[0];
  assert.ok(Math.hypot(p.x - j.x, p.y - j.y) >= 370);
  const cobrar = (tipo) => {
    mundo.premios.push({ tipo, x: j.x, y: j.y, recogido: false });
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
  };
  j.vidaMax = 100; j.vida = 10;
  cobrar('cura');
  assert.ok(j.vida >= 34);
  const xp = j.xp;
  cobrar('xp');
  assert.ok(j.xp > xp || j.nivel > 1);
  mundo.estado = 'jugando'; mundo.pendientes = 0;
  j.ulti.carga = 0;
  cobrar('energia');
  assert.ok(j.ulti.carga >= j.ulti.max * 0.29);
  mundo.gemas.push({ x: j.x + 900, y: j.y, valor: 1, atraida: false });
  cobrar('iman');
  assert.ok(mundo.gemas.every((g) => g.atraida || g.recogida));
});

test('hay rivales que embisten (avisan antes) y rivales que disparan balones', async () => {
  const { EQUIPOS } = await cargar('config.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  const embisten = Object.entries(EQUIPOS).filter(([, e]) => e.embiste).map(([k]) => k);
  const disparan = Object.entries(EQUIPOS).filter(([, e]) => e.dispara).map(([k]) => k);
  assert.ok(embisten.length >= 3 && disparan.length >= 5);

  const { m, mundo } = await mundoLimpio(14);
  const e = crearEnemigo('liverpool', 300, 0, 1);
  e.cdEmbestida = 0.1;
  mundo.enemigos.push(e);
  let avisó = false;
  let embistió = false;
  let vMax = 0;
  for (let i = 0; i < 180; i++) {
    const x0 = e.x;
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    if (e.aviso > 0) avisó = true;
    if (e.embestida > 0) { embistió = true; vMax = Math.max(vMax, (x0 - e.x) / PASO); }
    mundo.jugador.x = 0; mundo.jugador.y = 0;
  }
  assert.ok(avisó && embistió, 'se agacha y luego embiste');
  assert.ok(vMax > e.vel * 2, 'a más del doble de su velocidad');

  const w = await mundoLimpio(15);
  const t = crearEnemigo('napoli', 300, 0, 1);
  t.cdDisparo = 0.1;
  w.mundo.enemigos.push(t);
  let disparos = 0;
  for (let i = 0; i < 60; i++) {
    w.m.avanzar(w.mundo, PASO, { x: 0, y: 0 });
    disparos = Math.max(disparos, w.mundo.disparosEnemigos.length);
  }
  assert.ok(disparos >= 1, 'el rival dispara un balón');
});

test('todos los rivales y el jugador son más rápidos que antes y algunos rivales superan al jugador', async () => {
  const { POSICIONES, EQUIPOS, MUNDO } = await cargar('config.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  const vJugador = Math.min(...Object.values(POSICIONES).map((p) => p.vel));
  assert.ok(vJugador >= 160);
  const rapido = crearEnemigo('dortmund', 0, 0, 1);
  assert.ok(rapido.vel * EQUIPOS.dortmund.embiste.mult > vJugador, 'al embestir te alcanza');
  assert.ok(crearEnemigo('madrid', 0, 0, 1).vel > EQUIPOS.madrid.velocidad * (MUNDO.velRivales - 0.01));
});

test('los jefes pasan por tres fases y cada una añade ataques', async () => {
  const { crearJefe } = await cargar('oleadas.js');
  for (let indice = 0; indice < 4; indice++) {
    const { m, mundo } = await mundoLimpio(20 + indice);
    const jefe = crearJefe(indice, 300, 0, 5);
    mundo.enemigos.push(jefe);
    const avisos = [];
    const paso = (n) => {
      for (let i = 0; i < n; i++) {
        m.avanzar(mundo, PASO, { x: 0, y: 0 });
        mundo.jugador.x = 0; mundo.jugador.y = 0;
        avisos.push(...mundo.eventos.filter((e) => e.jefe).map((e) => e.texto));
        mundo.eventos.length = 0;
      }
    };
    paso(5);
    assert.equal(jefe.fase, 1);
    jefe.vida = jefe.vidaMax * 0.6;
    paso(5);
    assert.equal(jefe.fase, 2);
    jefe.vida = jefe.vidaMax * 0.3;
    paso(5);
    assert.equal(jefe.fase, 3);
    assert.ok(avisos.filter((t) => /se enfada/.test(t)).length === 2, `aviso de cada fase (${jefe.jefe})`);
    assert.ok(jefe.vel > jefe.velBase, 'más rápido en la última fase');
  }
});

test('las habilidades nuevas de los jefes existen: espiral, muro, salto de Cristiano y cadena de embestidas', async () => {
  const { crearJefe } = await cargar('oleadas.js');
  const correr = async (indice, fase, segundos, cuando) => {
    const { m, mundo } = await mundoLimpio(30 + indice * 4 + fase);
    const jefe = crearJefe(indice, 300, 0, 5);
    mundo.enemigos.push(jefe);
    jefe.vida = jefe.vidaMax * [1, 0.5, 0.2][fase - 1];
    const visto = {};
    for (let i = 0; i < segundos * 60; i++) {
      if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
      m.avanzar(mundo, PASO, { x: 0, y: 0 });
      mundo.jugador.x = 0; mundo.jugador.y = 0;
      cuando(mundo, jefe, visto);
      mundo.eventos.length = 0;
    }
    return visto;
  };
  const g3 = await correr(0, 3, 14, (w, j, v) => { v.disparos = Math.max(v.disparos || 0, w.disparosEnemigos.length); });
  assert.ok(g3.disparos >= 20, 'Guardiola lanza la espiral y los pases');
  const m2 = await correr(1, 2, 14, (w, j, v) => { v.united = Math.max(v.united || 0, w.enemigos.filter((e) => e.tipo === 'united').length); v.bus = v.bus || j.estado === 'embestida'; });
  assert.ok(m2.united >= 5, 'Mourinho levanta un muro de defensas');
  const c3 = await correr(2, 3, 10, (w, j, v) => { v.salto = v.salto || j.estado === 'salto'; v.impacto = v.impacto || w.avisosJefe.some((a) => a.tipo === 'impacto'); });
  assert.ok(c3.salto && c3.impacto, 'Cristiano salta y avisa dónde cae');
  const me3 = await correr(3, 3, 12, (w, j, v) => { v.dash = (v.dash || 0) + (j.estado === 'preparar' && j.carga > 0.44 ? 1 : 0); v.curvos = v.curvos || w.disparosEnemigos.some((d) => d.giro); });
  assert.ok(me3.dash >= 1 && me3.curvos, 'Messi embiste y tira con rosca');
});

test('una partida con rivales, gradas, barro y lluvia corriendo no genera valores inválidos', async () => {
  const m = await cargar('mundo.js');
  const mundo = m.crearMundo({ semilla: 77, personaje: 'griezmann' });
  for (let i = 0; i < 8 * 60 * 60; i++) {
    if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
    mundo.jugador.vida = 1e9;
    const s = i / 500;
    m.avanzar(mundo, PASO, { x: Math.cos(s), y: Math.sin(s * 0.7) });
    mundo.eventos.length = 0;
  }
  assert.ok(Number.isFinite(mundo.jugador.x) && Number.isFinite(mundo.jugador.y));
  assert.ok(mundo.enemigos.length <= 320 && mundo.disparosEnemigos.length <= 90);
  for (const e of mundo.enemigos) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y));
});

test('el jugador acelera y frena con un poco de inercia, y la cámara 3/4 sigue sin errores', async () => {
  const { m, mundo } = await mundoLimpio(7);
  const j = mundo.jugador;
  m.avanzar(mundo, PASO, { x: 1, y: 0 });
  const primera = j.vx;
  for (let i = 0; i < 60; i++) m.avanzar(mundo, PASO, { x: 1, y: 0 });
  assert.ok(primera > 0 && primera < j.vx * 0.6, 'arranca poco a poco');
  const corriendo = j.vx;
  m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.ok(j.vx > 0 && j.vx < corriendo, 'al soltar la tecla sigue un instante y frena');
  for (let i = 0; i < 60; i++) m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.ok(Math.abs(j.vx) < 1, 'acaba parándose');
  const R = await cargar('render.js');
  mundo.camara = null;
  R.actualizarCamara(mundo, 1 / 60);
  assert.ok(Number.isFinite(mundo.camara.x) && Number.isFinite(mundo.camara.y));
});
