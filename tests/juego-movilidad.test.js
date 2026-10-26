// Pruebas de movilidad: terreno (barro, lluvia, gradas), ritmo, premios, rivales que embisten o disparan y jefes con fases.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);
const PASO = 1 / 60;

/**
 * Busca en el terreno un sitio con lo que se pide: un punto bien dentro de una zona de barro o de lluvia
 * (sin obstáculos alrededor) o una grada.
 */
async function buscar(semilla, que) {
  const T = await cargar('terreno.js');
  const t = T.crearTerreno(semilla);
  if (que === 'grada') {
    for (let r = 0; r < 14; r++) {
      for (let cx = -r; cx <= r; cx++) {
        for (let cy = -r; cy <= r; cy++) {
          const g = T.celda(t, cx, cy).obstaculos.find((o) => o.tipo === 'grada');
          if (g) return { T, t, grada: g };
        }
      }
    }
    throw new Error('no hay gradas cerca del inicio');
  }
  for (let r = 0; r < 120; r++) {
    for (let i = -r; i <= r; i++) {
      for (const [x, y] of [[i * 40, -r * 40], [i * 40, r * 40], [-r * 40, i * 40], [r * 40, i * 40]]) {
        const dentro = [[0, 0], [-40, 0], [40, 0], [0, -40], [0, 40]].every(([dx, dy]) => T.zonaEn(t, x + dx, y + dy) === que);
        if (dentro && !T.tocaGrada(t, x, y, 50, true)) return { T, t, zona: { tipo: que, x, y } };
      }
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
      for (const o of ca.obstaculos) {
        const d = Math.hypot(Math.max(Math.abs(o.x) - o.w / 2, 0), Math.max(Math.abs(o.y) - o.h / 2, 0));
        assert.ok(d >= TERRENO.claroInicial - 1, `${o.tipo} demasiado cerca de la salida`);
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
  assert.ok(j.x <= grada.x - grada.w / 2 - j.rPies + 1e-6, 'no entra en la grada (se choca con los pies)');
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
  for (let i = 0; i < 90; i++) m.avanzar(mundo, PASO, { x: 0, y: 1 });
  assert.ok(j.ritmo > 0.99);
  const ritmoActual = j.ritmo;
  j.ritmo = 0; // misma hora de partida (la ayuda inicial decae con el tiempo): solo cambia el ritmo
  const base = multiplicadorDano(j, 'cuerpo');
  j.ritmo = ritmoActual;
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


test('el mapa mezcla barrios distintos (estadios, gradas, plazas, entrenamiento, parques y prados) y todo cabe en su celda', async () => {
  const T = await cargar('terreno.js');
  const { TERRENO } = await cargar('config.js');
  const t = T.crearTerreno(11);
  const lotes = new Set();
  const tipos = new Set();
  const niveles = new Set();
  for (let cx = -14; cx <= 14; cx++) {
    for (let cy = -14; cy <= 14; cy++) {
      const c = T.celda(t, cx, cy);
      lotes.add(c.bioma);
      for (const o of c.obstaculos) {
        tipos.add(o.tipo);
        if (o.tipo === 'talud') niveles.add(o.nivel);
        assert.ok(o.x - o.w / 2 >= cx * TERRENO.celda - 1e-6 && o.x + o.w / 2 <= (cx + 1) * TERRENO.celda + 1e-6, `${o.tipo} cabe en su celda (x)`);
        assert.ok(o.y - o.h / 2 >= cy * TERRENO.celda - 1e-6 && o.y + o.h / 2 <= (cy + 1) * TERRENO.celda + 1e-6, `${o.tipo} cabe en su celda (y)`);
      }
    }
  }
  for (const l of ['estadio', 'grada', 'plaza', 'entrenamiento', 'parque', 'prado']) assert.ok(lotes.has(l), `hay ${l}`);
  for (const tipo of ['grada', 'tienda', 'kiosco', 'arbol', 'porteria', 'foco', 'talud', 'farola']) assert.ok(tipos.has(tipo), `hay ${tipo}`);
  assert.ok(niveles.has(1), 'hay mesetas');
});

test('las gradas miran al campo que tienen al lado y las mesetas tienen escaleras', async () => {
  const T = await cargar('terreno.js');
  const t = T.crearTerreno(4);
  let gradas = 0;
  let escaleras = 0;
  for (let cx = -10; cx <= 10; cx++) {
    for (let cy = -10; cy <= 10; cy++) {
      const c = T.celda(t, cx, cy);
      if (c.bioma === 'grada') {
        const [i, k] = { e: [1, 0], o: [-1, 0], s: [0, 1], n: [0, -1] }[c.lote.mira];
        assert.equal(T.loteDe(t, cx + i, cy + k).tipo, 'estadio', 'la grada da a un estadio');
        gradas += c.obstaculos.filter((o) => o.tipo === 'grada').length;
      }
      escaleras += c.suelo.filter((a) => a.tipo === 'escalera' || a.tipo === 'rampa').length;
    }
  }
  assert.ok(gradas > 0 && escaleras > 10, `gradas ${gradas}, escaleras ${escaleras}`);
});

test('el barro nunca está sobre el asfalto ni sobre el césped de un estadio, y los balones pasan por encima de los taludes', async () => {
  const T = await cargar('terreno.js');
  const t = T.crearTerreno(4);
  for (let x = -4000; x <= 4000; x += 53) {
    for (let y = -4000; y <= 4000; y += 59) {
      if (T.zonaEn(t, x, y) === 'barro') assert.equal(T.pavimentado(t, x, y), false, `barro en el asfalto (${x}, ${y})`);
    }
  }
  let talud = null;
  for (let cx = -10; cx <= 10 && !talud; cx++) for (let cy = -10; cy <= 10 && !talud; cy++) talud = T.celda(t, cx, cy).obstaculos.find((o) => o.tipo === 'talud');
  assert.ok(talud, 'hay algún talud');
  assert.equal(T.tocaGrada(t, talud.x, talud.y, 2), false, 'un balón pasa por encima');
  assert.equal(T.tocaGrada(t, talud.x, talud.y, 2, true), true, 'andando no se pasa');
  assert.equal(T.rayoLibre(t, talud.x, talud.y - 100, talud.x, talud.y + 100, 400, 10), false);
});

test('las estructuras no encierran a nadie: casi todo el campo se puede alcanzar desde la salida', async () => {
  const T = await cargar('terreno.js');
  for (const semilla of [1, 2, 3]) {
    const t = T.crearTerreno(semilla);
    const paso = 40;
    const R = 60; // celdas de 40 → ±2400
    const libre = (i, k) => !T.tocaGrada(t, i * paso, k * paso, 16);
    const visto = new Set(['0,0']);
    const cola = [[0, 0]];
    let totalLibres = 0;
    for (let i = -R; i <= R; i++) for (let k = -R; k <= R; k++) if (libre(i, k)) totalLibres++;
    while (cola.length) {
      const [i, k] = cola.pop();
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = [i + a, k + b];
        const clave = n.join();
        if (Math.abs(n[0]) > R || Math.abs(n[1]) > R || visto.has(clave) || !libre(...n)) continue;
        visto.add(clave);
        cola.push(n);
      }
    }
    assert.ok(visto.size / totalLibres > 0.97, `semilla ${semilla}: alcanzable ${(100 * visto.size / totalLibres).toFixed(1)} %`);
  }
});

test('un rival al pie de un talud lo rodea hasta subir por la escalera', async () => {
  const T = await cargar('terreno.js');
  let talud = null;
  const t0 = T.crearTerreno(5);
  for (let r = 0; r < 16 && !talud; r++) {
    for (let cx = -r; cx <= r && !talud; cx++) {
      for (let cy = -r; cy <= r && !talud; cy++) {
        talud = T.celda(t0, cx, cy).obstaculos.find((o) => o.tipo === 'talud' && o.lado === 's' && o.w >= 160 && Math.hypot(o.x, o.y) > 900);
      }
    }
  }
  assert.ok(talud, 'hay algún talud largo');
  const { m, mundo } = await mundoLimpio(5);
  const { crearEnemigo } = await cargar('oleadas.js');
  // Rival abajo, jugador arriba de la meseta
  const e = crearEnemigo('madrid', talud.x, talud.y + talud.h / 2 + 30, 1);
  e.vida = 1e9;
  mundo.enemigos.push(e);
  mundo.jugador.x = talud.x;
  mundo.jugador.y = talud.y - talud.h / 2 - 60;
  const inicio = Math.hypot(e.x - mundo.jugador.x, e.y - mundo.jugador.y);
  let minimo = inicio;
  for (let i = 0; i < 60 * 14; i++) {
    const x = mundo.jugador.x; const y = mundo.jugador.y;
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    mundo.jugador.x = x; mundo.jugador.y = y;
    if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
    if (!mundo.enemigos.includes(e)) break;
    minimo = Math.min(minimo, Math.hypot(e.x - x, e.y - y));
  }
  assert.ok(minimo < 50 || !mundo.enemigos.includes(e), `el rival llega hasta ti (${inicio.toFixed(0)} → ${minimo.toFixed(0)})`);
});

test('cada 5 minutos cambia el ambiente (pretemporada → Copa → Liga → Champions → Mundial) y los rivales salen más fuertes', async () => {
  const { AMBIENTES, ambienteDe, fuerzaAmbiente } = await cargar('config.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  assert.deepEqual(AMBIENTES.map((a) => a.clave), ['inicio', 'copa', 'liga', 'champions', 'mundial']);
  assert.deepEqual([0, 4.9, 5, 10, 15, 20, 45].map(ambienteDe), [0, 0, 1, 2, 3, 4, 4]);
  for (let i = 1; i < AMBIENTES.length; i++) assert.ok(AMBIENTES[i].fuerza > AMBIENTES[i - 1].fuerza);
  assert.ok(fuerzaAmbiente(21).vida > fuerzaAmbiente(4).vida);
  // Justo antes y justo después del cambio, el rival de la misma oleada sale con más vida
  const antes = crearEnemigo('madrid', 0, 0, 10); // oleada 10 → 4,5 min
  const despues = crearEnemigo('madrid', 0, 0, 11); // oleada 11 → 5 min
  assert.ok(despues.vidaMax / antes.vidaMax > 1.06, `${antes.vidaMax} → ${despues.vidaMax}`);

  const { m, mundo } = await mundoLimpio(3);
  assert.equal(mundo.ambiente, 0);
  mundo.tiempo = 299.99;
  m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.equal(mundo.ambiente, 1);
  const ev = mundo.eventos.find((e) => e.tipo === 'ambiente');
  assert.ok(ev && ev.clave === 'copa' && ev.nombre === 'Final de la Copa del Rey');
  assert.ok(mundo.cambioAmbiente && mundo.cambioAmbiente.t0 > 299);
});

test('en la final del Mundial todos tienen camiseta de selección: tu jugador, los rivales y los jefes que son jugadores', async () => {
  const {
    PERSONAJES, EQUIPOS, JEFES, SELECCIONES, SELECCION_DE_EQUIPO, SELECCION_DE_JEFE,
  } = await cargar('config.js');
  const { conSeleccion, aspectoDe } = await cargar('sprites.js');
  for (const [clave, p] of Object.entries(PERSONAJES)) assert.ok(SELECCIONES[p.nacionalidad], `${clave}: falta la selección ${p.nacionalidad}`);
  for (const e of Object.keys(EQUIPOS)) assert.ok(SELECCIONES[SELECCION_DE_EQUIPO[e]], `rival ${e}`);
  for (const [j, pais] of Object.entries(SELECCION_DE_JEFE)) assert.ok(JEFES[j] && SELECCIONES[pais], `jefe ${j}`);
  assert.ok(SELECCIONES.Dinamarca, 'la selección de reserva existe');
  const fran = conSeleccion(aspectoDe('personaje', 'griezmann'), 'Francia');
  assert.equal(fran.camiseta.c, SELECCIONES.Francia.camiseta.c);
  assert.equal(fran.pelo, PERSONAJES.griezmann.aspecto.pelo, 'el pelo no cambia');
  const traje = conSeleccion(aspectoDe('jefe', 'guardiola'), 'España');
  assert.equal(traje.camiseta.p, 'traje', 'los entrenadores siguen de traje');
});

test('el suelo se pinta por celdas y cambia de colores con cada ambiente (con un lienzo falso)', async () => {
  const imagenes = [];
  const contexto = () => new Proxy({}, {
    get: (obj, k) => {
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (k === 'putImageData') return (img) => imagenes.push(img.data);
      if (k in obj) return obj[k];
      return () => {};
    },
    set: (obj, k, v) => { obj[k] = v; return true; },
  });
  const anterior = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: contexto }) };
  try {
    const RM = await cargar('render-mundo.js');
    const T = await cargar('terreno.js');
    const { AMBIENTES } = await cargar('config.js');
    const terreno = T.crearTerreno(21);
    const celdas = [T.celda(terreno, 0, 0)];
    const lienzoFalso = contexto();
    for (const amb of AMBIENTES) RM.dibujarSuelo(lienzoFalso, { terreno, jugador: { personaje: 'koke' } }, celdas, amb);
    assert.equal(imagenes.length, AMBIENTES.length, 'una textura por ambiente');
    const pixel = (d) => [d[0], d[1], d[2]].join();
    assert.ok(new Set(imagenes.map((d) => pixel(d.subarray(4000)))).size >= 4, 'cada ambiente tiene su color');
    assert.ok(imagenes.every((d) => d[3] === 255), 'la textura es opaca');
  } finally {
    globalThis.document = anterior;
  }
});

test('lo que se ve es lo que choca: los edificios y gradas chocan en todo su dibujo y se choca con los pies', async () => {
  const T = await cargar('terreno.js');
  const { PIES } = await cargar('config.js');
  const t = T.crearTerreno(4);
  let tienda = null;
  for (let cx = -10; cx <= 10 && !tienda; cx++) for (let cy = -10; cy <= 10 && !tienda; cy++) tienda = T.celda(t, cx, cy).obstaculos.find((o) => o.tipo === 'tienda');
  assert.ok(tienda, 'hay alguna tienda');
  assert.equal(tienda.h, tienda.hBase + tienda.alto, 'choca la base más lo que se levanta');
  // Justo encima del borde de arriba del dibujo (el tejado) ya no se puede estar
  assert.equal(T.tocaGrada(t, tienda.x, tienda.y - tienda.h / 2 + 4, 2, true), true);
  // Un muñeco cuyos pies tocan el tejado sale despedido hacia arriba: nunca queda «escondido» detrás
  const r = 14;
  const ent = { x: tienda.x, y: tienda.y - tienda.h / 2 - r * PIES.alto + 3, r, pies: r * PIES.alto, rPies: r * PIES.radio };
  assert.equal(T.resolver(t, ent), true);
  assert.ok(ent.y + ent.pies <= tienda.y - tienda.h / 2 - ent.rPies + 1e-6);
  // Los árboles solo chocan por el tronco
  let arbol = null;
  for (let cx = -10; cx <= 10 && !arbol; cx++) for (let cy = -10; cy <= 10 && !arbol; cy++) arbol = T.celda(t, cx, cy).obstaculos.find((o) => o.tipo === 'arbol');
  assert.ok(arbol && arbol.hBase === undefined && arbol.w < 30);
});
