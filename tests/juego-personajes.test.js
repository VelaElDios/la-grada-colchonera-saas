// Pruebas de personajes, entrenadores, rivales, jefes, armas nuevas y dificultad infinita.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);
const PASO = 1 / 60;

async function simular(m, mundo, segundos, entrada = { x: 0, y: 0 }) {
  for (let i = 0; i < segundos * 60 && mundo.estado !== 'fin'; i++) {
    if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
    m.avanzar(mundo, PASO, entrada);
    mundo.eventos.length = 0;
  }
}

test('hay 4 personajes del Atleti y sus estadísticas dependen solo de la posición', async () => {
  const { PERSONAJES, POSICIONES } = await cargar('config.js');
  const m = await cargar('mundo.js');
  assert.deepEqual(Object.keys(PERSONAJES).sort(), ['godin', 'griezmann', 'koke', 'oblak']);
  assert.deepEqual(Object.values(PERSONAJES).map((p) => p.posicion).sort(), ['defensa', 'delantero', 'medio', 'portero']);
  // Dos delanteros distintos tendrían exactamente las mismas estadísticas: se comprueba con la posición
  const a = m.crearMundo({ semilla: 1, personaje: 'griezmann' }).jugador;
  const pos = POSICIONES.delantero;
  assert.equal(a.vidaMax, Math.round(pos.vida * 1.05)); // entrenador por defecto: Cholo (+5 % de vida)
  assert.equal(a.mult.disparo, pos.disparo);
  assert.equal(a.mult.cuerpo, pos.cuerpo);
});

test('el portero ataca solo cuerpo a cuerpo; delanteros disparan más y defensas pegan más de cerca', async () => {
  const { POSICIONES, ARMAS } = await cargar('config.js');
  const m = await cargar('mundo.js');
  assert.equal(POSICIONES.portero.disparo, 0);
  assert.ok(POSICIONES.delantero.disparo > POSICIONES.medio.disparo && POSICIONES.medio.disparo > POSICIONES.defensa.disparo);
  assert.ok(POSICIONES.defensa.cuerpo > POSICIONES.medio.cuerpo && POSICIONES.medio.cuerpo > POSICIONES.delantero.cuerpo);

  const mundo = m.crearMundo({ semilla: 2, personaje: 'oblak' });
  assert.equal(ARMAS[Object.keys(mundo.jugador.armas).find((k) => mundo.jugador.armas[k].nivel > 0)].tipo, 'cuerpo');
  // En 200 subidas de nivel, al portero nunca se le ofrece un arma de disparo
  for (let i = 0; i < 200; i++) {
    mundo.pendientes = 1;
    mundo.estado = 'jugando';
    m.avanzar(mundo, PASO);
    for (const o of mundo.opciones) {
      if (o.tipo === 'arma') assert.equal(ARMAS[o.clave].tipo, 'cuerpo', `se ofreció ${o.clave} al portero`);
    }
    m.elegirMejora(mundo, mundo.opciones[0].id);
  }
});

test('hay 16 equipos rivales y se desbloquean poco a poco', async () => {
  const { EQUIPOS } = await cargar('config.js');
  assert.equal(Object.keys(EQUIPOS).length, 16);
  const desbloqueos = new Set(Object.values(EQUIPOS).map((e) => e.desde));
  assert.ok(desbloqueos.size >= 7, 'los equipos no salen todos a la vez');
  for (const e of Object.values(EQUIPOS)) assert.ok(e.kit.camiseta.c && e.vida > 0 && e.velocidad > 0);
});

test('hay 4 jefes (Guardiola, Mourinho, Cristiano y Messi) y salen cada 5 oleadas en orden', async () => {
  const { JEFES, ORDEN_JEFES } = await cargar('config.js');
  const m = await cargar('mundo.js');
  const { empezarOleada } = await cargar('oleadas.js');
  assert.deepEqual(ORDEN_JEFES, ['guardiola', 'mourinho', 'cristiano', 'messi']);
  assert.equal(JEFES.guardiola.nombre, 'Pep Guardiola');
  const vistos = [];
  for (const oleada of [5, 10, 15, 20, 25]) {
    const mundo = m.crearMundo({ semilla: 3 });
    mundo.oleada = oleada;
    empezarOleada(mundo);
    const jefe = mundo.enemigos.find((e) => e.jefe);
    assert.ok(jefe, `jefe en la oleada ${oleada}`);
    vistos.push(jefe.jefe);
  }
  assert.deepEqual(vistos, ['guardiola', 'mourinho', 'cristiano', 'messi', 'guardiola']);
});

test('cada jefe usa su habilidad: cerco, onda de choque, abanico de tiros y embestida', async () => {
  const m = await cargar('mundo.js');
  const { crearJefe } = await cargar('oleadas.js');
  const probar = (indice, segundos) => {
    const mundo = m.crearMundo({ semilla: 4 });
    mundo.jugador.vida = 1e9;
    mundo.jugador.vidaMax = 1e9;
    const jefe = crearJefe(indice, 200, 0, 5);
    jefe.vida = 1e9;
    mundo.enemigos.push(jefe);
    mundo.temporizadorAparicion = 1e9; // sin más rivales
    let maxEnemigos = 0;
    let disparos = 0;
    let ondas = 0;
    let embistio = false;
    for (let i = 0; i < segundos * 60; i++) {
      m.avanzar(mundo, PASO, { x: 0, y: 0 });
      maxEnemigos = Math.max(maxEnemigos, mundo.enemigos.length);
      disparos = Math.max(disparos, mundo.disparosEnemigos.length);
      ondas += mundo.ondas.filter((o) => o.enemiga && o.vida > 0.48).length;
      if (jefe.estado === 'embestida') embistio = true;
      mundo.eventos.length = 0;
    }
    return { maxEnemigos, disparos, ondas, embistio };
  };
  assert.ok(probar(0, 9).maxEnemigos >= 9, 'Guardiola invoca rivales');
  assert.ok(probar(1, 9).ondas >= 1, 'Mourinho suelta una onda de choque');
  assert.ok(probar(2, 4).disparos >= 5, 'Cristiano dispara un abanico');
  assert.ok(probar(3, 6).embistio, 'Messi embiste');
});

test('los entrenadores multiplican las estadísticas', async () => {
  const m = await cargar('mundo.js');
  const cholo = m.crearMundo({ semilla: 5, entrenador: 'cholo' }).jugador;
  const luis = m.crearMundo({ semilla: 5, entrenador: 'aragones' }).jugador;
  assert.ok(cholo.mult.dano > luis.mult.dano);
  assert.ok(luis.mult.xp > cholo.mult.xp && luis.mult.vel > cholo.mult.vel);
  assert.ok(cholo.vidaMax > luis.vidaMax);
});

test('la ulti se carga con las bajas, se lanza y la siguiente cuesta más', async () => {
  const m = await cargar('mundo.js');
  const { ultiLista } = await cargar('ulti.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  for (const entrenador of ['cholo', 'aragones']) {
    const mundo = m.crearMundo({ semilla: 6, entrenador });
    const j = mundo.jugador;
    assert.equal(m.usarUlti(mundo), false, 'no se puede lanzar sin carga');
    j.ulti.carga = j.ulti.max;
    assert.ok(ultiLista(mundo));
    for (let i = 0; i < 20; i++) mundo.enemigos.push(crearEnemigo('madrid', 100 + i * 5, 50, 1));
    const antes = mundo.enemigos.length;
    const maxAntes = j.ulti.max;
    assert.equal(m.usarUlti(mundo), true);
    assert.equal(j.ulti.carga, 0);
    assert.ok(j.ulti.max > maxAntes);
    if (entrenador === 'cholo') {
      assert.ok(mundo.enemigos.filter((e) => !e.muerto).length < antes, 'la onda del Cholo elimina rivales');
      assert.ok(j.animo > 0);
    } else {
      assert.ok(j.furia > 0);
    }
  }
  // Las bajas cargan la ulti
  const mundo = m.crearMundo({ semilla: 7 });
  await simular(m, mundo, 30);
  assert.ok(mundo.jugador.ulti.carga > 0 || mundo.jugador.ulti.usos > 0);
});

test('la ulti del Cholo es fuerte al principio y floja al final', async () => {
  const { ENTRENADORES, ESCALADO, EQUIPOS, minutosDeOleada } = await cargar('config.js');
  const dano = ENTRENADORES.cholo.ulti.dano + ENTRENADORES.cholo.ulti.danoPorNivel * 5;
  const vidaRival = (oleada) => EQUIPOS.madrid.vida * ESCALADO.vida(minutosDeOleada(oleada));
  assert.ok(dano > vidaRival(3), 'al principio mata a todo');
  assert.ok(dano < vidaRival(40) / 2, 'tarde ya no mata ni a un rival normal');
});

test('el juego es infinito: 400 subidas de nivel seguidas y siempre hay mejoras que elegir', async () => {
  const m = await cargar('mundo.js');
  for (const personaje of ['oblak', 'godin', 'koke', 'griezmann']) {
    const mundo = m.crearMundo({ semilla: 8, personaje });
    for (let i = 0; i < 400; i++) {
      mundo.pendientes = 1;
      mundo.estado = 'jugando';
      m.avanzar(mundo, PASO);
      assert.equal(mundo.estado, 'mejora', `nivel ${i}: debe abrirse la elección`);
      assert.ok(mundo.opciones.length >= 1, `nivel ${i}: sin opciones`);
      assert.ok(m.elegirMejora(mundo, mundo.opciones[mundo.opciones.length - 1].id));
      assert.equal(mundo.estado, 'jugando');
    }
    const j = mundo.jugador;
    assert.ok(Number.isFinite(j.vidaMax) && Number.isFinite(j.mult.dano) && Number.isFinite(j.mult.cd));
    assert.ok(j.mult.cd >= 0.45 && j.mult.armadura <= 0.6);
  }
});

test('la dificultad sube sin parar y a los 30–40 minutos es brutal', async () => {
  const { ESCALADO, EQUIPOS, minutosDeOleada } = await cargar('config.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  let anterior = null;
  for (let o = 1; o <= 90; o += 1) {
    const e = crearEnemigo('madrid', 0, 0, o);
    if (anterior) {
      assert.ok(e.vida >= anterior.vida && e.dano >= anterior.dano && e.vel >= anterior.vel, `oleada ${o}`);
    }
    anterior = e;
  }
  const o10 = crearEnemigo('madrid', 0, 0, 21); // minuto 10
  const o30 = crearEnemigo('madrid', 0, 0, 61); // minuto 30
  const o40 = crearEnemigo('madrid', 0, 0, 81); // minuto 40
  assert.ok(o30.vida > o10.vida * 3 && o40.vida > o30.vida * 1.4);
  assert.ok(o40.dano > EQUIPOS.madrid.dano * 10, 'a los 40 min cada golpe duele mucho');
  assert.ok(o40.vel > EQUIPOS.madrid.velocidad * 1.8, 'y corren casi el doble');
  assert.ok(ESCALADO.vida(minutosDeOleada(81)) > 40);
});

test('las armas nuevas funcionan: cañonazo, esquina, efecto, silbato, tarjeta y VAR', async () => {
  const { ARMAS } = await cargar('config.js');
  const m = await cargar('mundo.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  const nuevas = ['canonazo', 'corner', 'efecto', 'silbato', 'tarjeta', 'var'];
  nuevas.forEach((k) => assert.equal(ARMAS[k].niveles.length, 5, k));
  for (const clave of nuevas) {
    const mundo = m.crearMundo({ semilla: 9, personaje: 'griezmann' });
    const j = mundo.jugador;
    Object.keys(j.armas).forEach((k) => { j.armas[k].nivel = 0; });
    j.armas[clave] = { nivel: 3, cd: 0 };
    mundo.temporizadorAparicion = 1e9;
    for (let i = 0; i < 12; i++) mundo.enemigos.push(crearEnemigo('city', 60 + i * 12, (i % 3) * 20, 1));
    j.vida = 1e9;
    j.vidaMax = 1e9;
    const vidaAntes = mundo.enemigos.reduce((s, e) => s + e.vida, 0);
    let efecto = false;
    for (let i = 0; i < 240; i++) {
      m.avanzar(mundo, PASO, { x: 0, y: 0 });
      if (mundo.enemigos.some((e) => e.lento > 0) || mundo.rayos.length || mundo.tarjetas.length || mundo.proyectiles.length) efecto = true;
      mundo.eventos.length = 0;
    }
    const vidaDespues = mundo.enemigos.reduce((s, e) => s + e.vida, 0);
    assert.ok(efecto, `${clave} debe dejar algún efecto`);
    assert.ok(vidaDespues < vidaAntes || mundo.enemigos.length < 12, `${clave} debe hacer daño`);
  }
});

test('las armaduras y el daño por tipo se aplican', async () => {
  const m = await cargar('mundo.js');
  const { danar } = await cargar('combate.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  const del = m.crearMundo({ semilla: 10, personaje: 'griezmann', entrenador: 'aragones' });
  const def = m.crearMundo({ semilla: 10, personaje: 'godin', entrenador: 'aragones' });
  const a = crearEnemigo('benfica', 0, 0, 1);
  const b = crearEnemigo('benfica', 0, 0, 1);
  danar(del, a, 100, null, 0, 'disparo');
  danar(def, b, 100, null, 0, 'disparo');
  assert.ok(a.vidaMax - a.vida > b.vidaMax - b.vida, 'el delantero dispara más fuerte que el defensa');
  const c = crearEnemigo('benfica', 0, 0, 1);
  const d = crearEnemigo('benfica', 0, 0, 1);
  danar(del, c, 100, null, 0, 'cuerpo');
  danar(def, d, 100, null, 0, 'cuerpo');
  assert.ok(d.vidaMax - d.vida > c.vidaMax - c.vida, 'el defensa pega más fuerte de cerca');
});

test('una partida de 12 minutos con cada personaje no genera valores inválidos', async () => {
  const m = await cargar('mundo.js');
  for (const personaje of ['oblak', 'godin', 'koke', 'griezmann']) {
    const mundo = m.crearMundo({ semilla: 12, personaje, entrenador: personaje === 'oblak' ? 'aragones' : 'cholo' });
    mundo.jugador.vida = 1e9;
    mundo.jugador.vidaMax = 1e9;
    for (let i = 0; i < 12 * 60 * 60; i++) { // 12 minutos de partida, sin que el jugador pueda morir
      if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
      mundo.jugador.vida = 1e9;
      const s = i / 600;
      m.avanzar(mundo, PASO, { x: Math.cos(s), y: Math.sin(s) });
      mundo.eventos.length = 0;
      if (i % 60 === 0 && mundo.jugador.ulti.carga >= mundo.jugador.ulti.max) m.usarUlti(mundo);
    }
    assert.ok(mundo.oleada >= 20);
    assert.ok(mundo.enemigos.length <= 320);
    for (const e of mundo.enemigos) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.vida));
  }
});
