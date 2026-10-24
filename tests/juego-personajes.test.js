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

test('hay 36 jugadores del Atleti con estadísticas de su posición retocadas por sus rasgos', async () => {
  const { PERSONAJES, POSICIONES } = await cargar('config.js');
  const m = await cargar('mundo.js');
  const esperados = ['oblak', 'musso', 'godin', 'lenglet', 'pubill', 'molina', 'grimaldo', 'koke', 'llorente', 'barrios', 'lee', 'griezmann',
    'torres', 'lookman', 'giuliano', 'julian', 'costa', 'forlan', 'falcao',
    'grbic', 'courtois', 'trippier', 'savic', 'miranda', 'lodi', 'baena', 'partey', 'saul', 'pantic', 'tiago', 'gabi', 'futre', 'simeone', 'adelardo',
    'aragones', 'kun'];
  assert.deepEqual(Object.keys(PERSONAJES).sort(), [...esperados].sort());
  const delanteros = ['griezmann', 'torres', 'lookman', 'giuliano', 'julian', 'costa', 'forlan', 'falcao', 'aragones', 'kun'];
  delanteros.forEach((k) => assert.equal(PERSONAJES[k].posicion, 'delantero', k));
  // El vidaMax sale de la posición × los rasgos del jugador × el entrenador por defecto (Cholo, +5 % de vida)
  const g = m.crearMundo({ semilla: 1, personaje: 'griezmann' }).jugador;
  const pos = POSICIONES.delantero;
  assert.equal(g.vidaMax, Math.round(pos.vida * (PERSONAJES.griezmann.mods.vida ?? 1) * 1.05));
  assert.equal(g.mult.cuerpo, pos.cuerpo * (PERSONAJES.griezmann.mods.cuerpo ?? 1));
  // Dos jugadores de la misma posición ya no son idénticos
  const stats = (k) => { const j = m.crearMundo({ semilla: 1, personaje: k }).jugador; return [j.vidaMax, j.velBase, j.mult.cuerpo, j.mult.disparo].join('/'); };
  assert.notEqual(stats('torres'), stats('lookman'));
  assert.notEqual(stats('oblak'), stats('musso'));
});

test('cada jugador tiene entre 8 y 16 habilidades, empieza con una de ellas y solo se le ofrecen las suyas', async () => {
  const { PERSONAJES, ARMAS } = await cargar('config.js');
  const m = await cargar('mundo.js');
  let maximos = 0;
  for (const [clave, p] of Object.entries(PERSONAJES)) {
    const n = p.habilidades.length;
    assert.ok(n >= 8 && n <= 16, `${clave}: ${n} habilidades`);
    assert.equal(new Set(p.habilidades).size, n, `${clave}: habilidades repetidas`);
    p.habilidades.forEach((h) => assert.ok(ARMAS[h], `${clave}: ${h} no existe`));
    assert.ok(p.habilidades.includes(p.armaInicial), `${clave}: el arma inicial debe estar en su lista`);
    if (p.posicion === 'portero') p.habilidades.forEach((h) => assert.notEqual(ARMAS[h].tipo, 'disparo', `${clave}: el portero no dispara (${h})`));
    maximos = Math.max(maximos, n);
    const mundo = m.crearMundo({ semilla: 2, personaje: clave });
    const inicial = Object.keys(mundo.jugador.armas).filter((k) => mundo.jugador.armas[k].nivel > 0);
    assert.deepEqual(inicial, [p.armaInicial]);
    for (let i = 0; i < 120; i++) {
      mundo.pendientes = 1;
      mundo.estado = 'jugando';
      m.avanzar(mundo, PASO);
      for (const o of mundo.opciones) {
        if (o.tipo === 'arma') assert.ok(p.habilidades.includes(o.clave), `se ofreció ${o.clave} a ${clave}`);
      }
      m.elegirMejora(mundo, mundo.opciones[0].id);
    }
  }
  assert.equal(maximos, 16, 'los mejores llegan a 16');
});

test('las posiciones marcan el estilo: defensas más cuerpo a cuerpo, delanteros más disparos y jugones más regates', async () => {
  const { PERSONAJES, ARMAS, POSICIONES } = await cargar('config.js');
  assert.equal(POSICIONES.portero.disparo, 0);
  assert.ok(POSICIONES.delantero.disparo > POSICIONES.medio.disparo && POSICIONES.medio.disparo > POSICIONES.defensa.disparo);
  assert.ok(POSICIONES.defensa.cuerpo > POSICIONES.medio.cuerpo && POSICIONES.medio.cuerpo > POSICIONES.delantero.cuerpo);
  const cuenta = (pos, tipo) => {
    const lista = Object.values(PERSONAJES).filter((p) => p.posicion === pos);
    return lista.reduce((s, p) => s + p.habilidades.filter((h) => ARMAS[h].tipo === tipo).length, 0) / lista.length;
  };
  assert.ok(cuenta('defensa', 'cuerpo') > cuenta('delantero', 'cuerpo'));
  assert.ok(cuenta('delantero', 'disparo') > cuenta('defensa', 'disparo'));
  assert.ok(cuenta('medio', 'movil') >= cuenta('portero', 'movil'));
  // Lo concreto: un portero no aprende «Balón con efecto», un delantero sí; un delantero no se tira a hacer entradas
  assert.ok(!PERSONAJES.oblak.habilidades.includes('efecto') && PERSONAJES.griezmann.habilidades.includes('efecto'));
  assert.ok(!PERSONAJES.griezmann.habilidades.includes('entrada') && PERSONAJES.godin.habilidades.includes('entrada'));
});

test('hay 16 equipos rivales y se desbloquean poco a poco', async () => {
  const { EQUIPOS } = await cargar('config.js');
  assert.equal(Object.keys(EQUIPOS).length, 16);
  const desbloqueos = new Set(Object.values(EQUIPOS).map((e) => e.desde));
  assert.ok(desbloqueos.size >= 7, 'los equipos no salen todos a la vez');
  for (const e of Object.values(EQUIPOS)) assert.ok(e.kit.camiseta.c && e.vida > 0 && e.velocidad > 0);
});

test('hay 10 jefes y salen cada 4 oleadas, al azar entre los que ya les toca y sin repetir en la misma ronda', async () => {
  const { JEFES, ORDEN_JEFES } = await cargar('config.js');
  const m = await cargar('mundo.js');
  const { empezarOleada, elegirJefe } = await cargar('oleadas.js');
  assert.deepEqual(ORDEN_JEFES.slice(0, 4), ['guardiola', 'mourinho', 'cristiano', 'messi']);
  ['vinicius', 'yamal', 'neymar', 'bale', 'benzema', 'suarez'].forEach((k) => assert.ok(ORDEN_JEFES.includes(k) && JEFES[k], k));
  assert.equal(new Set(ORDEN_JEFES).size, 10);
  assert.equal(JEFES.guardiola.nombre, 'Pep Guardiola');
  // En la oleada 5 solo pueden salir los jefes «de entrada»; luego se van sumando los más duros
  const vistos = [];
  const mundo = m.crearMundo({ semilla: 3 });
  for (const oleada of [4, 8, 12, 16, 20]) {
    mundo.oleada = oleada;
    mundo.enemigos.length = 0;
    empezarOleada(mundo);
    const jefes = mundo.enemigos.filter((e) => e.jefe);
    assert.equal(jefes.length, 1, `un jefe en la oleada ${oleada}`);
    assert.ok((JEFES[jefes[0].jefe].desde ?? 0) <= oleada / 4 - 1, `${jefes[0].jefe} no puede salir tan pronto`);
    vistos.push(jefes[0].jefe);
  }
  assert.equal(new Set(vistos).size, 5, 'no se repiten en la misma ronda');
  // La misma semilla da los mismos jefes
  const otro = m.crearMundo({ semilla: 3 });
  const repetidos = [];
  for (const oleada of [4, 8, 12, 16, 20]) {
    otro.oleada = oleada;
    otro.enemigos.length = 0;
    empezarOleada(otro);
    repetidos.push(otro.enemigos.find((e) => e.jefe).jefe);
  }
  assert.deepEqual(repetidos, vistos);
  // Con 10 jefes seguidos salen los 10 y después empieza otra ronda sin repetir el último
  const bolsa = m.crearMundo({ semilla: 4 });
  const diez = Array.from({ length: 10 }, (_, i) => elegirJefe(bolsa, i));
  assert.equal(new Set(diez).size, 10);
  const siguiente = elegirJefe(bolsa, 10);
  assert.notEqual(siguiente, diez[9]);
  // Más adelante salen dos a la vez
  const tarde = m.crearMundo({ semilla: 5 });
  tarde.oleada = 40;
  empezarOleada(tarde);
  assert.equal(tarde.enemigos.filter((e) => e.jefe).length, 2);
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
      if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
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
  const { PERSONAJES } = await cargar('config.js');
  for (const personaje of Object.keys(PERSONAJES)) {
    const mundo = m.crearMundo({ semilla: 8, personaje });
    mundo.temporizadorAparicion = 1e9; // el mundo está quieto: solo suben de nivel las que se piden aquí
    mundo.temporizadorPremio = 1e9;
    mundo.jugador.vida = mundo.jugador.vidaMax = 1e9;
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
    assert.ok(j.mult.cd >= 0.35 && j.mult.armadura <= 0.7);
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

test('partidas largas con cada jugador no generan valores inválidos', async () => {
  const m = await cargar('mundo.js');
  const { PERSONAJES } = await cargar('config.js');
  const representantes = ['oblak', 'godin', 'koke', 'griezmann'];
  for (const personaje of Object.keys(PERSONAJES)) {
    const minutos = representantes.includes(personaje) ? 5 : 1; // los demás, un vistazo corto
    const mundo = m.crearMundo({ semilla: 12, personaje, entrenador: personaje === 'oblak' ? 'aragones' : 'cholo' });
    mundo.jugador.vida = 1e9;
    mundo.jugador.vidaMax = 1e9;
    for (let i = 0; i < minutos * 60 * 60; i++) {
      if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
      mundo.jugador.vida = 1e9;
      const s = i / 600;
      m.avanzar(mundo, PASO, { x: Math.cos(s), y: Math.sin(s) });
      mundo.eventos.length = 0;
      if (i % 60 === 0 && mundo.jugador.ulti.carga >= mundo.jugador.ulti.max) m.usarUlti(mundo);
    }
    assert.ok(mundo.oleada >= 2 * minutos, personaje);
    assert.ok(mundo.enemigos.length <= 320);
    const j = mundo.jugador;
    assert.ok(Number.isFinite(j.x) && Number.isFinite(j.y) && Number.isFinite(j.mult.dano), personaje);
    for (const e of mundo.enemigos) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.vida), personaje);
  }
});
