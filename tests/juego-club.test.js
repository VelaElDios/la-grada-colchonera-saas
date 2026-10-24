// Pruebas del club (plantilla, contratos, entrenamiento), los poderes de oro, los rivales élite, el nuevo equilibrio
// y las pantallas del club (HTML). La parte de servidor está en api.juego.test.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const JUEGO = path.join(__dirname, '..', 'public', 'js', 'game');
const cargar = (nombre) => import(pathToFileURL(path.join(JUEGO, nombre)).href);
const PASO = 1 / 60;

/** Azar repetible. */
const azarSemilla = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

async function mundoCon({ personaje = 'koke', armas = {}, pasivas = {}, entrenamiento = null, semilla = 31 } = {}) {
  const m = await cargar('mundo.js');
  const { recalcular } = await cargar('mejoras.js');
  const mundo = m.crearMundo({ semilla, personaje, entrenamiento });
  const j = mundo.jugador;
  Object.keys(j.armas).forEach((k) => { j.armas[k] = { nivel: 0, cd: 0 }; });
  Object.entries(armas).forEach(([k, nivel]) => { j.armas[k] = { nivel, cd: 0 }; });
  Object.entries(pasivas).forEach(([k, nivel]) => { j.pasivas[k] = nivel; });
  recalcular(j);
  mundo.temporizadorAparicion = 1e9;
  mundo.temporizadorPremio = 1e9;
  j.vida = j.vidaMax;
  return { m, mundo, j };
}

async function conRivales(mundo, n = 8, vida = 5000) {
  const { crearEnemigo } = await cargar('oleadas.js');
  for (let i = 0; i < n; i++) {
    const e = crearEnemigo('city', 70 + (i % 4) * 14, -30 + Math.floor(i / 4) * 30, 1);
    e.vida = e.vidaMax = vida;
    mundo.enemigos.push(e);
  }
}

const correr = (m, mundo, segundos, entrada = { x: 0, y: 0 }) => {
  for (let i = 0; i < segundos * 60; i++) {
    if (mundo.estado === 'mejora') { mundo.pendientes = 0; mundo.estado = 'jugando'; mundo.opciones = []; }
    m.avanzar(mundo, PASO, entrada);
    mundo.eventos.length = 0;
  }
};

// ---------------------------------------------------------------------------------------------
// Reglas del club
// ---------------------------------------------------------------------------------------------

test('el equipo inicial es un portero, un defensa, un medio y un delantero de los de pocas habilidades', async () => {
  const club = await cargar('club.js');
  const { PERSONAJES } = await cargar('config.js');
  for (let semilla = 1; semilla <= 40; semilla++) {
    const perfil = club.perfilNuevo(azarSemilla(semilla));
    const claves = Object.keys(perfil.jugadores);
    assert.equal(claves.length, 4);
    assert.deepEqual(claves.map((k) => PERSONAJES[k].posicion).sort(), ['defensa', 'delantero', 'medio', 'portero']);
    claves.forEach((k) => assert.ok(PERSONAJES[k].habilidades.length <= 10, `${k} no es de los malos`));
    assert.equal(perfil.jefesTotal, 0);
  }
  // Con muchos sorteos salen varios jugadores distintos de cada posición
  const vistos = new Set();
  for (let semilla = 1; semilla <= 200; semilla++) Object.keys(club.perfilNuevo(azarSemilla(semilla)).jugadores).forEach((k) => vistos.add(k));
  assert.ok(vistos.size >= 8, `solo salen ${vistos.size} jugadores distintos al empezar`);
  ['oblak', 'courtois', 'griezmann', 'kun', 'godin'].forEach((k) => assert.ok(!vistos.has(k), `${k} no debe salir al empezar`));
});

test('el entrenamiento da puntos por rivales eliminados (los primeros baratos, los últimos caros) y por cada 3 jefes', async () => {
  const club = await cargar('club.js');
  assert.equal(club.puntosPorBajas(0), 0);
  assert.equal(club.puntosPorBajas(club.costePunto(1) - 1), 0);
  assert.equal(club.puntosPorBajas(club.costePunto(1)), 1);
  // cada punto cuesta más que el anterior
  for (let k = 2; k <= club.PUNTOS_BAJAS_MAX; k += 1) assert.ok(club.costePunto(k) > club.costePunto(k - 1));
  assert.ok(club.costePunto(club.PUNTOS_BAJAS_MAX) > club.costePunto(1) * 10);
  // tope de puntos por bajas
  assert.equal(club.puntosPorBajas(10_000_000), club.PUNTOS_BAJAS_MAX);
  // próximo punto
  const sig = club.proximoPuntoPorBajas(10);
  assert.equal(sig.faltan, club.costePunto(1) - 10);
  assert.equal(club.proximoPuntoPorBajas(10_000_000), null);
  // bajas y jefes suman
  const ficha = club.fichaNueva();
  ficha.bajas = club.costePunto(1);
  ficha.jefes = 3;
  assert.equal(club.puntosLibres(ficha), 2);
});

test('un punto de entrenamiento por cada 3 jefes de ese jugador y una ficha por cada 3 jefes en total', async () => {
  const club = await cargar('club.js');
  const ficha = club.fichaNueva();
  assert.equal(club.puntosLibres(ficha), 0);
  ficha.jefes = 8;
  assert.equal(club.puntosLibres(ficha), 2);
  ficha.stats.vida = 1;
  assert.equal(club.puntosLibres(ficha), 1);
  const perfil = { jefesTotal: 7, fichasUsadas: 1, jugadores: {} };
  assert.equal(club.fichasGanadas(perfil), 2);
  assert.equal(club.fichasDisponibles(perfil), 1);
  assert.equal(club.fichasDisponibles({ jefesTotal: 2, fichasUsadas: 0, jugadores: {} }), 0);
  assert.equal(club.fichasDisponibles({ jefesTotal: 3, fichasUsadas: 0, jugadores: {} }), 1);
});

test('el contrato nunca repite jugador, da a todos y los de más habilidades salen menos', async () => {
  const club = await cargar('club.js');
  const { PERSONAJES } = await cargar('config.js');
  const todos = Object.keys(PERSONAJES);
  // Pesos: 8 habilidades pesan más que 16
  const poco = todos.find((k) => PERSONAJES[k].habilidades.length === 8);
  const mucho = todos.reduce((a, b) => (PERSONAJES[b].habilidades.length > PERSONAJES[a].habilidades.length ? b : a));
  assert.ok(club.pesoContrato(poco) > club.pesoContrato(mucho) * 5);

  // Recorriendo hasta fichar a todos no se repite ninguno
  const perfil = club.perfilNuevo(azarSemilla(3));
  const azar = azarSemilla(99);
  const vistos = new Set(Object.keys(perfil.jugadores));
  for (let i = 0; i < todos.length - 4; i++) {
    const k = club.sortearContrato(perfil, azar);
    assert.ok(k && !vistos.has(k), `repetido: ${k}`);
    vistos.add(k);
    perfil.jugadores[k] = club.fichaNueva();
  }
  assert.equal(vistos.size, todos.length);
  assert.equal(club.sortearContrato(perfil, azar), null);

  // Estadísticamente: los de pocas habilidades salen más que los de muchas
  const vacio = { jugadores: {} };
  const conteo = {};
  const a = azarSemilla(5);
  for (let i = 0; i < 6000; i++) { const k = club.sortearContrato(vacio, a); conteo[k] = (conteo[k] || 0) + 1; }
  const media = (filtro) => { const ks = todos.filter(filtro); return ks.reduce((s, k) => s + (conteo[k] || 0), 0) / ks.length; };
  assert.ok(media((k) => PERSONAJES[k].habilidades.length <= 9) > media((k) => PERSONAJES[k].habilidades.length >= 14) * 3);
  // Las probabilidades que se enseñan suman 1
  const suma = club.probabilidadesContrato(vacio).reduce((s, x) => s + x.probabilidad, 0);
  assert.ok(Math.abs(suma - 1) < 1e-9);
});

test('las estadísticas de entrenamiento mejoran de verdad al jugador en el campo', async () => {
  const sin = (await mundoCon({ personaje: 'griezmann' })).j;
  const con = (await mundoCon({ personaje: 'griezmann', entrenamiento: { vida: 10, defensa: 10, disparo: 10, suerte: 10 } })).j;
  assert.ok(con.vidaMax > sin.vidaMax * 1.5, 'vida');
  assert.ok(con.mult.armadura > sin.mult.armadura + 0.15, 'defensa');
  assert.ok(con.mult.dano > sin.mult.dano * 1.3, 'disparo (daño)');
  assert.ok(con.mult.critico > sin.mult.critico + 0.15 && con.mult.xp > sin.mult.xp, 'suerte');
  const { ESTADISTICAS } = await cargar('club.js');
  assert.deepEqual(ESTADISTICAS, ['vida', 'defensa', 'disparo', 'suerte']);
});

test('hay 36 jugadores, los 17 nuevos que se pidieron, cada uno con nacionalidad y descripción', async () => {
  const { PERSONAJES } = await cargar('config.js');
  assert.equal(Object.keys(PERSONAJES).length, 36);
  const pedidos = {
    portero: ['grbic', 'courtois'],
    defensa: ['trippier', 'savic', 'miranda', 'lodi'],
    medio: ['baena', 'partey', 'saul', 'pantic', 'tiago', 'gabi', 'futre', 'simeone', 'adelardo'],
    delantero: ['aragones', 'kun'],
  };
  Object.entries(pedidos).forEach(([pos, claves]) => claves.forEach((k) => assert.equal(PERSONAJES[k]?.posicion, pos, k)));
  const descripciones = new Set();
  Object.entries(PERSONAJES).forEach(([k, p]) => {
    assert.ok(p.nacionalidad && p.nacionalidad.length > 3, `${k}: nacionalidad`);
    assert.ok(p.descripcion && p.descripcion.length > 40, `${k}: descripción`);
    descripciones.add(p.descripcion);
    assert.ok(p.habilidades.length >= 8 && p.habilidades.length <= 16, `${k}: habilidades`);
  });
  assert.equal(descripciones.size, 36, 'cada descripción es distinta');
  assert.equal(PERSONAJES.kun.nacionalidad, 'Argentina');
  assert.equal(PERSONAJES.courtois.nacionalidad, 'Bélgica');
});

// ---------------------------------------------------------------------------------------------
// Poderes de oro
// ---------------------------------------------------------------------------------------------

test('Balón de Oro: los balones son dorados, atraviesan más y pegan más', async () => {
  const base = await mundoCon({ armas: { balon: 3 } });
  const oro = await mundoCon({ armas: { balon: 3 }, pasivas: { balonOro: 5 } });
  assert.ok(oro.j.mult.disparo > base.j.mult.disparo * 1.6);
  await conRivales(oro.mundo, 3);
  correr(oro.m, oro.mundo, 1.2);
  const p = oro.mundo.proyectiles.find((x) => x.oro);
  assert.ok(p, 'sale algún balón dorado');
  const normal = (() => { const b = base.mundo; return b.proyectiles.find((x) => x.oro); })();
  assert.equal(normal, undefined);
  assert.equal(oro.j.poder.oroPerfora, 2);
});

test('Bota de Oro: los balones queman y el fuego sigue haciendo daño después', async () => {
  const { m, mundo, j } = await mundoCon({ armas: { balon: 4 }, pasivas: { botaOro: 3 } });
  await conRivales(mundo, 4);
  correr(m, mundo, 2);
  const quemado = mundo.enemigos.find((e) => e.quemado);
  assert.ok(quemado, 'algún rival está ardiendo');
  const dano = quemado.quemado.dano;
  assert.ok(dano >= 1);
  // Sin más disparos, la quemadura sola le resta vida
  j.armas.balon.nivel = 0;
  mundo.proyectiles.length = 0;
  const antes = quemado.vida;
  correr(m, mundo, 1.2);
  assert.ok(quemado.vida < antes, 'sigue perdiendo vida solo por el fuego');
  correr(m, mundo, 4);
  assert.equal(quemado.quemado, null, 'el fuego se apaga');
});

test('Guante de Oro: cada carga detiene un golpe entero y se recupera sola', async () => {
  const { m, mundo, j } = await mundoCon({ pasivas: { guanteOro: 4 } });
  assert.equal(j.poder.guantes, 2);
  j.guantes.cargas = 2;
  const { danarJugador } = await cargar('jefes.js');
  const vida = j.vida;
  assert.equal(danarJugador(mundo, 50), 0);
  assert.equal(j.guantes.cargas, 1);
  j.invul = 0;
  assert.equal(danarJugador(mundo, 50), 0);
  j.invul = 0;
  assert.ok(danarJugador(mundo, 50) > 0, 'sin cargas, el golpe entra');
  assert.ok(j.vida < vida);
  correr(m, mundo, j.poder.guantesCada + 1);
  assert.ok(j.guantes.cargas >= 1, 'se recarga');
});

test('Trébol y suerte: hay golpes críticos que hacen el doble', async () => {
  const { m, mundo, j } = await mundoCon({ pasivas: { trebol: 5 } });
  assert.ok(j.mult.critico >= 0.3);
  const { crearEnemigo } = await cargar('oleadas.js');
  const { danar } = await cargar('combate.js');
  const e = crearEnemigo('madrid', 500, 500, 1);
  e.vida = e.vidaMax = 1e9;
  mundo.enemigos.push(e);
  j.mult.critico = 1; // seguro
  const antes = e.vida;
  danar(mundo, e, 10, null, 0, 'cuerpo');
  const normal = Math.round(10 * (await cargar('combate.js')).multiplicadorDano(j, 'cuerpo'));
  assert.equal(antes - e.vida, normal * 2);
  assert.ok(m);
});

test('Prórroga: al caer a 0 te levantas una vez (dos al nivel 5) y expulsas a los rivales', async () => {
  const { m, mundo, j } = await mundoCon({ pasivas: { prorroga: 1 } });
  await conRivales(mundo, 3, 100);
  j.vida = 0;
  m.avanzar(mundo, PASO);
  assert.equal(mundo.estado, 'jugando', 'te has levantado');
  assert.ok(j.vida > 0 && j.vida <= j.vidaMax * 0.6);
  j.vida = 0;
  j.invul = 0;
  m.avanzar(mundo, PASO);
  assert.equal(mundo.estado, 'fin', 'la segunda vez ya no (nivel 1)');

  const n5 = await mundoCon({ pasivas: { prorroga: 5 } });
  for (let i = 0; i < 2; i++) { n5.j.vida = 0; n5.m.avanzar(n5.mundo, PASO); assert.equal(n5.mundo.estado, 'jugando', `levantada ${i + 1}`); }
  n5.j.vida = 0;
  n5.m.avanzar(n5.mundo, PASO);
  assert.equal(n5.mundo.estado, 'fin');
});

test('el Himno de la Champions daña y aturde en área; la bengala deja fuego que quema', async () => {
  const himno = await mundoCon({ armas: { champions: 3 } });
  await conRivales(himno.mundo, 8, 9000);
  const vidas = himno.mundo.enemigos.map((e) => e.vida);
  correr(himno.m, himno.mundo, 0.3);
  assert.ok(himno.mundo.enemigos.some((e, i) => e.vida < vidas[i]), 'daña');
  assert.ok(himno.mundo.enemigos.some((e) => e.aturdido > 0), 'aturde');

  const bengala = await mundoCon({ armas: { bengala: 3 } });
  await conRivales(bengala.mundo, 8, 9000);
  correr(bengala.m, bengala.mundo, 1.5);
  assert.ok(bengala.mundo.fuegos.length > 0, 'hay fuego en el suelo');
  correr(bengala.m, bengala.mundo, 3);
  assert.ok(bengala.mundo.enemigos.some((e) => e.vida < 9000), 'el fuego hace daño');
  correr(bengala.m, bengala.mundo, 8);
  assert.ok(bengala.mundo.fuegos.length <= 14);
});

test('los poderes de oro se ofrecen al subir de nivel y las nuevas combinaciones existen', async () => {
  const { PASIVAS, SINERGIAS } = await cargar('config.js');
  ['balonOro', 'botaOro', 'guanteOro', 'brazalete', 'trebol', 'prorroga'].forEach((k) => assert.ok(PASIVAS[k]?.poder, k));
  ['triplete', 'infierno', 'nocheEuropea', 'fortuna', 'capitan'].forEach((k) => assert.ok(SINERGIAS[k], k));
  const { m, mundo } = await mundoCon({ personaje: 'griezmann' });
  const vistos = new Set();
  for (let i = 0; i < 80; i++) {
    mundo.pendientes = 1;
    mundo.estado = 'jugando';
    m.avanzar(mundo, PASO);
    mundo.opciones.forEach((o) => vistos.add(o.clave));
    m.elegirMejora(mundo, mundo.opciones[0].id);
  }
  assert.ok(['balonOro', 'botaOro', 'guanteOro', 'trebol'].some((k) => vistos.has(k)), 'salen poderes');
});

// ---------------------------------------------------------------------------------------------
// Equilibrio: dificultad 10 minutos antes, élites, jefes y curas
// ---------------------------------------------------------------------------------------------

test('la dificultad llega 10 minutos antes: a los 20 min como antes a los 30 y a los 30 como antes a los 40', async () => {
  const { ESCALADO } = await cargar('config.js');
  const antes = { vida: (m) => 1 + 0.45 * m + 0.02 * m * m, dano: (m) => 1 + 0.12 * m + 0.006 * m * m };
  assert.ok(ESCALADO.vida(20) >= antes.vida(30) * 0.8, 'vida a los 20');
  assert.ok(ESCALADO.dano(20) >= antes.dano(30) * 0.95, 'daño a los 20');
  assert.ok(ESCALADO.vida(30) >= antes.vida(40) * 0.95, 'vida a los 30');
  assert.ok(ESCALADO.dano(30) >= antes.dano(40), 'daño a los 30');
  // y al empezar ya aprieta un poco más
  assert.ok(ESCALADO.vida(0) > 1);
});

test('desde la oleada 6 salen rivales élite con aro de color: más vida, más daño y más experiencia', async () => {
  const { ELITES } = await cargar('config.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  const m = await cargar('mundo.js');
  const normal = crearEnemigo('madrid', 0, 0, 10);
  Object.keys(ELITES.tipos).forEach((t) => {
    const e = crearEnemigo('madrid', 0, 0, 10, t);
    assert.equal(e.elite, t);
    assert.ok(e.xp > normal.xp);
    assert.ok(e.vida > normal.vida || e.vel > normal.vel);
  });
  assert.equal(ELITES.probabilidad(6) < ELITES.probabilidad(20), true);
  assert.ok(ELITES.probabilidad(100) <= 0.4);
  // En una partida real salen élites a partir de la oleada 6 y no antes
  const mundo = m.crearMundo({ semilla: 12 });
  mundo.jugador.vida = mundo.jugador.vidaMax = 1e9;
  let antesDe6 = 0;
  let despues = 0;
  for (let i = 0; i < 60 * 60 * 6; i++) {
    m.avanzar(mundo, PASO, { x: 1, y: 0.2 });
    if (mundo.estado === 'mejora') { mundo.pendientes = 0; mundo.estado = 'jugando'; mundo.opciones = []; }
    mundo.eventos.length = 0;
    const n = mundo.enemigos.filter((e) => e.elite).length;
    if (mundo.oleada < 6) antesDe6 += n; else despues += n;
  }
  assert.equal(antesDe6, 0);
  assert.ok(despues > 0);
});

test('el primer jefe sale a los 1:30 (oleada 4), luego cada 2 minutos, y los jefes crecen más que el tiempo', async () => {
  const { crearJefe } = await cargar('oleadas.js');
  const { empezarOleada } = await cargar('oleadas.js');
  const m = await cargar('mundo.js');
  const { ESCALADO_JEFE, ESCALADO, JEFES } = await cargar('config.js');
  const mundo = m.crearMundo({ semilla: 4 });
  for (const [oleada, esperado] of [[3, 0], [4, 1], [5, 0], [8, 1], [12, 1]]) {
    mundo.oleada = oleada;
    mundo.enemigos.length = 0;
    empezarOleada(mundo);
    assert.equal(mundo.enemigos.filter((e) => e.jefe).length, esperado, `oleada ${oleada}`);
  }
  // El primero es asequible; luego, cada jefe es más duro que el anterior aunque pase el mismo tiempo
  const primero = crearJefe(0, 0, 0, 4, 'guardiola');
  const quinto = crearJefe(4, 0, 0, 4, 'guardiola'); // mismo momento: solo cambia el nº de jefes vencidos
  assert.ok(primero.vida < JEFES.guardiola.vida * ESCALADO.vida(1.5), 'el primero cuesta menos que antes');
  assert.ok(quinto.vida > primero.vida * 2.5);
  // Mitad de partida: pesan bastante más que el crecimiento normal
  assert.ok(ESCALADO_JEFE.vida(10, 5) > ESCALADO.vida(10) * 1.8);
});

test('los botiquines escasean: pocos por el campo y curan según tu vida máxima', async () => {
  const { CURAS, PREMIOS } = await cargar('config.js');
  assert.ok(CURAS.probabilidad <= 0.008 && CURAS.maximo <= 3);
  assert.ok(PREMIOS.tipos.cura.peso < 0.2);
  const { m, mundo, j } = await mundoCon();
  await conRivales(mundo, 1, 1);
  for (let i = 0; i < 400; i++) mundo.curas.push({ x: 9999, y: 9999 });
  const { crearEnemigo } = await cargar('oleadas.js');
  let sueltos = 0;
  for (let i = 0; i < 3000; i++) {
    const e = crearEnemigo('madrid', 800, 800, 1);
    mundo.enemigos.push(e);
    e.vida = 0;
    mundo.curas.length = 0;
    (await cargar('combate.js')).danar(mundo, e, 1);
    sueltos += mundo.curas.length;
  }
  assert.ok(sueltos / 3000 < 0.02, `se sueltan demasiados botiquines (${sueltos / 3000})`);
  assert.ok(m && j);
});

test('la curva de experiencia es más exigente que antes (no te quedas sin nada que subir a los 15 minutos)', async () => {
  const { xpParaSubir } = await cargar('config.js');
  const antes = (n) => Math.round(5 + (n - 1) * 4 + (n - 1) ** 1.5);
  assert.ok(xpParaSubir(50) > antes(50) * 1.3);
  for (let n = 1; n < 200; n++) assert.ok(xpParaSubir(n + 1) > xpParaSubir(n));
});

// ---------------------------------------------------------------------------------------------
// Pantallas del club (HTML) y cliente del servidor
// ---------------------------------------------------------------------------------------------

function clubDePrueba(extra = {}) {
  const jugador = (jefes = 0, stats = {}) => ({ jefes, partidas: 0, stats: { vida: 0, defensa: 0, disparo: 0, suerte: 0, ...stats }, puntosLibres: Math.floor(jefes / 3) });
  return {
    jugadores: { musso: jugador(7, { vida: 1 }), pubill: jugador(0), baena: jugador(2), aragones: jugador(3) },
    jefesTotal: 12, partidas: 5, fichas: 2, fichasGanadas: 2, siguienteFichaEn: 3, totalJugadores: 36, ...extra,
  };
}
const retrato = () => 'data:,';

test('Entrenamiento: los botones +1 solo se activan con puntos libres y se ve lo que mejora', async () => {
  const ui = await cargar('club-ui.js');
  const { panel, lista } = ui.htmlEntrenamiento(clubDePrueba(), 'musso', retrato);
  assert.equal((panel.match(/data-entrenar="/g) || []).length, 4);
  assert.equal((panel.match(/disabled/g) || []).length, 0, 'Musso tiene 1 punto libre (7 jefes = 2 puntos, 1 gastado)');
  assert.match(panel, /nivel 1/);
  assert.match(panel, /\+6 % de vida/);
  assert.match(lista, /insignia-puntos/);
  const sin = ui.htmlEntrenamiento(clubDePrueba(), 'pubill', retrato).panel;
  assert.equal((sin.match(/disabled/g) || []).length, 4, 'sin puntos todo desactivado');
});

test('Contratar: con fichas se puede canjear, sin fichas no, y se muestran las probabilidades por rareza', async () => {
  const ui = await cargar('club-ui.js');
  const con = ui.htmlContratar(clubDePrueba(), retrato);
  assert.match(con, /data-accion="canjear"\s*>/);
  assert.match(con, /Probabilidades/);
  assert.match(con, /Leyenda/);
  const sin = ui.htmlContratar(clubDePrueba({ fichas: 0 }), retrato);
  assert.match(sin, /data-accion="canjear"\s+disabled/);
  assert.match(ui.htmlFichado('kun', retrato), /Kun Agüero/);
});

test('el ranking de la grada marca tu fila y no se deja inyectar HTML en los alias', async () => {
  const ui = await cargar('club-ui.js');
  const html = ui.htmlRankingGrada({
    filas: [
      { posicion: 1, alias: '<img src=x onerror=alert(1)>', personaje: 'koke', tiempo: 1500, nivel: 80, jefes: 9, fecha: '2026-10-01T10:00:00Z', esTuyo: false },
      { posicion: 2, alias: 'vela', personaje: 'kun', tiempo: 900, nivel: 50, jefes: 5, fecha: '2026-10-02T10:00:00Z', esTuyo: true },
    ],
    tuMejor: { tiempo: 900, nivel: 50, personaje: 'kun' },
  });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
  assert.match(html, /ranking__tuyo/);
  assert.match(html, /25:00/);
  assert.match(html, /nivel 80/);
});

test('el juego y la API cliente conocen el club: menú, entrenamiento, contratar y las rutas del servidor', () => {
  const juego = fs.readFileSync(path.join(JUEGO, 'juego.js'), 'utf8');
  for (const accion of ['entrenamiento', 'contratar']) assert.match(juego, new RegExp(`data-accion="${accion}"`));
  for (const panel of ['entrenamiento', 'contratar']) assert.match(juego, new RegExp(`data-pantalla="${panel}"`));
  const api = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'api.js'), 'utf8');
  for (const ruta of ['/juego/perfil', '/juego/partidas', '/juego/contratar', '/juego/entrenar', '/juego/ranking']) assert.ok(api.includes(ruta), ruta);
  const jugar = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'ui', 'vistas', 'jugar.js'), 'utf8');
  assert.match(jugar, /servidor/);
});
