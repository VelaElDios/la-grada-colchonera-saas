// Pruebas de la fase 6: logros (con su dato curioso) y equipaciones, estadísticas de fin de partida
// (daño por habilidad), pantalla de fin y la música chiptune (datos bien formados y la grada).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const JUEGO = path.join(__dirname, '..', 'public', 'js', 'game');
const cargar = (nombre) => import(pathToFileURL(path.join(JUEGO, nombre)).href);
const PASO = 1 / 60;

const base = (extra = {}) => ({
  tiempo: 60, oleada: 2, nivel: 3, bajas: 10, jefes: 0, personaje: 'koke', entrenador: 'cholo',
  ultras: [], sinergias: [], ambiente: 0, muerto: true, stats: { primerGolpe: 10 }, ...extra,
});

// --- Logros ---------------------------------------------------------------------------------

test('cada logro tiene nombre, icono, cómo se consigue y un dato; las camisetas existen y cada una sale de un solo logro', async () => {
  const { LOGROS, EQUIPACIONES } = await cargar('logros.js');
  const { icono } = await cargar('iconos.js');
  const circulo = icono('no-existe');
  const usadas = new Map();
  for (const [k, l] of Object.entries(LOGROS)) {
    for (const campo of ['nombre', 'icono', 'como', 'dato']) assert.ok(typeof l[campo] === 'string' && l[campo].length > 3, `${k}.${campo}`);
    if (l.tipo === 'club') assert.equal(typeof l.club, 'function', k);
    else {
      assert.equal(typeof l.comprobar, 'function', k);
      assert.equal(typeof l.servidor, 'function', k);
    }
    assert.notEqual(icono(l.icono), circulo, `icono ${l.icono} de ${k}`);
    if (l.camiseta) {
      assert.ok(EQUIPACIONES[l.camiseta], `${k} → ${l.camiseta}`);
      assert.ok(!usadas.has(l.camiseta), `la equipación ${l.camiseta} la dan dos logros`);
      usadas.set(l.camiseta, k);
    }
  }
  // Todas las equipaciones (menos la primera) se pueden conseguir
  Object.keys(EQUIPACIONES).filter((e) => e !== 'primera').forEach((e) => assert.ok(usadas.has(e), `nadie desbloquea ${e}`));
  assert.ok(Object.keys(LOGROS).length >= 25);
  assert.ok(Object.keys(EQUIPACIONES).length >= 10);
});

test('logros de partida: las finales por ambiente, los guiños a cada leyenda y el Pupas', async () => {
  const { logrosDePartida } = await cargar('logros.js');
  assert.deepEqual(logrosDePartida(base({ tiempo: 200 })), []);
  assert.ok(logrosDePartida(base({ tiempo: 100 })).includes('pupas'));
  assert.ok(!logrosDePartida(base({ tiempo: 100, muerto: false })).includes('pupas')); // salir del partido no cuenta
  const lejos = logrosDePartida(base({ tiempo: 1250, ambiente: 4, jefes: 6, bajas: 600 }));
  ['copa', 'liga', 'champions', 'mundial', 'primerJefe', 'adelardo', 'partidoAPartido'].forEach((k) => assert.ok(lejos.includes(k), k));
  // Griezmann solo gana su Balón de Oro con la ultra y con él
  assert.ok(logrosDePartida(base({ personaje: 'griezmann', ultras: ['balonOro'] })).includes('griezmannBalonOro'));
  assert.ok(!logrosDePartida(base({ personaje: 'koke', ultras: ['balonOro'] })).includes('griezmannBalonOro'));
  assert.ok(logrosDePartida(base({ personaje: 'godin', sinergias: ['aereo'] })).includes('godinCampNou'));
  // El muro: 5 minutos sin que te toquen
  assert.ok(logrosDePartida(base({ tiempo: 310, stats: { primerGolpe: null } })).includes('muroCholo'));
  assert.ok(!logrosDePartida(base({ tiempo: 310, stats: { primerGolpe: 200 } })).includes('muroCholo'));
});

test('el servidor solo se cree los logros que puede comprobar con su reloj y los datos de la partida', async () => {
  const { logrosCreibles } = await cargar('logros.js');
  const r = { tiempo: 320, nivel: 20, jefes: 1, bajas: 300, personaje: 'costa', entrenador: 'cholo' };
  const creidos = logrosCreibles(['primerJefe', 'copa', 'liga', 'mundial', 'costa27', 'adelardo', 'kokeVida', 'inventado', 7, 'primerJefe'], r);
  assert.deepEqual(creidos.sort(), ['copa', 'costa27', 'primerJefe']);
  assert.deepEqual(logrosCreibles('no es una lista', r), []);
  assert.deepEqual(logrosCreibles(['griezmannBalonOro'], { ...r, personaje: 'costa' }), []); // con otro jugador no
});

test('logros de club (plantilla) y equipaciones desbloqueadas', async () => {
  const { logrosDeClub, equipacionesDe } = await cargar('logros.js');
  const { PERSONAJES } = await cargar('config.js');
  const jugadores = Object.fromEntries(Object.keys(PERSONAJES).slice(0, 20).map((k) => [k, { partidas: 0 }]));
  jugadores.koke = { partidas: 25 };
  const club = logrosDeClub({ jugadores }, PERSONAJES);
  assert.ok(club.includes('kokeVida'));
  assert.ok(club.includes('centenario'));
  const todos = Object.fromEntries(Object.keys(PERSONAJES).map((k) => [k, { partidas: 1 }]));
  assert.ok(logrosDeClub({ jugadores: todos }, PERSONAJES).includes('leyendas'));
  assert.deepEqual(logrosDeClub({ jugadores: { koke: { partidas: 1 } } }, PERSONAJES), []);
  assert.deepEqual(equipacionesDe([]), ['primera']);
  assert.deepEqual(equipacionesDe(['primerJefe', 'pupas', 'copa']).sort(), ['primera', 'pupas', 'segunda']);
});

// --- Estadísticas de la partida -----------------------------------------------------------------

test('el daño se apunta a la habilidad que lo hace y el resumen trae estadísticas, armas y ambiente', async () => {
  const m = await cargar('mundo.js');
  const { recalcular } = await cargar('mejoras.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  const mundo = m.crearMundo({ semilla: 5, personaje: 'griezmann' });
  const j = mundo.jugador;
  Object.keys(j.armas).forEach((k) => { j.armas[k] = { nivel: 0, cd: 0 }; });
  j.armas.balon = { nivel: 3, cd: 0 };
  j.armas.bufanda = { nivel: 2, cd: 0 };
  recalcular(j);
  mundo.temporizadorAparicion = 1e9;
  for (let i = 0; i < 8; i += 1) {
    const e = crearEnemigo('city', j.x + 60 + (i % 4) * 16, j.y - 40 + Math.floor(i / 4) * 40, 1);
    e.vida = e.vidaMax = 400;
    mundo.enemigos.push(e);
  }
  for (let i = 0; i < 60 * 6; i += 1) {
    if (mundo.estado === 'mejora') { mundo.pendientes = 0; mundo.estado = 'jugando'; mundo.opciones = []; }
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
  }
  const r = m.resumen(mundo);
  assert.ok(r.stats.danoTotal > 0, 'hay daño');
  const suma = Object.values(r.stats.dano).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(suma - r.stats.danoTotal) < 1e-6, 'el reparto suma el total');
  assert.ok(Object.keys(r.stats.dano).some((f) => f !== 'otros'), JSON.stringify(r.stats.dano));
  assert.ok(r.stats.golpeMax > 0);
  assert.equal(typeof r.ambiente, 'number');
  assert.ok(r.armas && typeof r.armas === 'object');
  assert.ok(r.vidaMax > 0);
});

test('pantalla de fin: cifras, barras de daño por habilidad, jefes y logros nuevos', async () => {
  const { htmlEstadisticas, htmlLogros, nombreFuente } = await cargar('fin-ui.js');
  const r = base({
    tiempo: 640, ambiente: 2, jefes: 2, armas: { chut: 4 },
    stats: {
      dano: { chut: 900, 'ultra:balonOro': 300, ulti: 50, fuego: 20 }, danoTotal: 1270, criticos: 12, golpeMax: 210,
      recibido: 340, golpes: 9, curado: 80, primerGolpe: 12, jefes: [{ clave: 'guardiola', nombre: 'Guardiola', t: 300, vivo: 31.4 }], ambienteMax: 2,
    },
    ultras: ['balonOro'], sinergias: [],
  });
  const html = htmlEstadisticas(r, { logrosNuevos: ['liga', 'inventado'] });
  assert.match(html, /10:40/);
  assert.match(html, /Final de Liga/);
  assert.equal((html.match(/class="dano[ "]/g) ?? []).length, 4);
  assert.match(html, /Guardiola/);
  assert.match(html, /Campeones de Liga/);
  assert.match(html, /dato/);
  assert.equal(nombreFuente('ulti', 'cholo').icono, 'pizarra');
  assert.equal(nombreFuente('ultra:balonOro').ultra, true);
  // Sin estadísticas (partida antigua) no se rompe
  assert.doesNotThrow(() => htmlEstadisticas(base({ stats: undefined })));
  // Los no conseguidos esconden el dato curioso
  const { cuenta, html: lista } = htmlLogros({ copa: '2026-10-01' });
  assert.match(cuenta, /^1 de \d+ conseguidos$/);
  assert.ok(lista.indexOf('Camino de la final') < lista.indexOf('Primera muesca'), 'los conseguidos van primero');
  assert.match(lista, /logro__dato--oculto/);
});

// --- Música y grada -----------------------------------------------------------------------------

test('las canciones y fanfarrias están bien escritas: compases de 16 pasos y notas válidas', async () => {
  const mu = await cargar('musica.js');
  assert.equal(mu.midiDe('A4'), 69);
  assert.equal(mu.midiDe('C#5'), 73);
  assert.equal(mu.midiDe('Bb3'), 58);
  assert.equal(mu.midiDe('H2'), null);
  assert.deepEqual(mu.notasDe('C5 - - . E5 -'), [{ paso: 0, midi: 72, largo: 3 }, { paso: 4, midi: 76, largo: 2 }]);
  const valida = (t) => mu.pasos(t).every((p) => p === '-' || p === '.' || mu.midiDe(p) !== null);
  for (const [k, c] of Object.entries(mu.CANCIONES)) {
    assert.equal(mu.pasos(c.melodia).length, c.acordes.length * 16, `melodía de ${k}`);
    assert.ok(valida(c.melodia), k);
    c.acordes.forEach((a) => assert.ok(mu.acordeDe(a), `${k}: acorde ${a}`));
    assert.ok(mu.BAJOS[c.bajo] && mu.BAJOS[c.bajo].length === 16, k);
    assert.ok(mu.ARPEGIOS[c.arpegio] && mu.ARPEGIOS[c.arpegio].length === 16, k);
    assert.ok(mu.BATERIAS[c.bateria], k);
  }
  Object.entries(mu.BATERIAS).forEach(([k, niveles]) => {
    assert.equal(niveles.length, 4, k);
    niveles.forEach((n) => assert.equal(mu.pasos(n).length, 16, `${k}: ${n}`));
  });
  for (const [k, f] of Object.entries(mu.FANFARRIAS)) {
    assert.equal(mu.pasos(f.melodia).length, f.acordes.length * 16, `fanfarria ${k}`);
    assert.equal(mu.pasos(f.bateria).length % 16, 0, `batería de ${k}`);
    assert.ok(valida(f.melodia), k);
    assert.ok(mu.duracion(mu.pasos(f.melodia).length, f.bpm) < 8, `la fanfarria ${k} es corta`);
  }
  // Una canción y una fanfarria por cada pantalla, y cada pantalla más rápida que la anterior
  const { AMBIENTES } = await cargar('config.js');
  assert.equal(mu.CANCION_DE_AMBIENTE.length, AMBIENTES.length);
  assert.equal(mu.FANFARRIA_DE_AMBIENTE.length, AMBIENTES.length);
  const bpms = mu.CANCION_DE_AMBIENTE.map((k) => mu.CANCIONES[k].bpm);
  bpms.slice(1).forEach((b, i) => assert.ok(b > bpms[i], `${b} > ${bpms[i]}`));
  // Las sílabas de los cánticos tienen vocal conocida y nota
  mu.CANTICOS.forEach((c) => c.silabas.forEach(([v, n]) => assert.ok(v === '*' || (mu.VOCALES[v] && mu.midiDe(n) !== null))));
});

test('la música se anima con el tiempo y con los jefes; la grada se oye más cuanto más cerca', async () => {
  const mu = await cargar('musica.js');
  assert.equal(mu.intensidadMusica(0.2), 1);
  assert.equal(mu.intensidadMusica(1.5), 2);
  assert.equal(mu.intensidadMusica(4), 3);
  assert.equal(mu.intensidadMusica(0.1, true), 3);
  assert.equal(mu.cercaniaGrada(Infinity), 0);
  assert.equal(mu.cercaniaGrada(0), 1);
  assert.equal(mu.cercaniaGrada(800), 0);
  assert.ok(mu.cercaniaGrada(100) > mu.cercaniaGrada(400));
});

test('la distancia a la grada sale de las gradas que hay junto a los estadios', async () => {
  const { crearTerreno, distanciaGrada, celda } = await cargar('terreno.js');
  const { TERRENO } = await cargar('config.js');
  const t = crearTerreno(7);
  let grada = null;
  for (let i = -12; i <= 12 && !grada; i += 1) {
    for (let k = -12; k <= 12 && !grada; k += 1) grada = celda(t, i, k).obstaculos.find((o) => o.tipo === 'grada');
  }
  assert.ok(grada, 'hay alguna grada cerca del inicio');
  assert.equal(distanciaGrada(t, grada.x, grada.y), 0);
  const d = distanciaGrada(t, grada.x, grada.y + grada.h / 2 + 100);
  assert.ok(d <= 100 + 1e-6, String(d));
  assert.equal(distanciaGrada(t, grada.x + TERRENO.celda * 40, grada.y + TERRENO.celda * 40, 100), Infinity);
});

// --- Jefes más duros ----------------------------------------------------------------------------

async function mundoConJefe(clave, indice) {
  const m = await cargar('mundo.js');
  const { crearJefe } = await cargar('oleadas.js');
  const mundo = m.crearMundo({ semilla: 9, personaje: 'oblak' });
  const j = mundo.jugador;
  Object.keys(j.armas).forEach((k) => { j.armas[k] = { nivel: 0, cd: 0 }; }); // que no le haga daño
  mundo.temporizadorAparicion = 1e9;
  mundo.temporizadorPremio = 1e9;
  const jefe = crearJefe(indice, j.x + 260, j.y, 8, clave);
  mundo.enemigos.push(jefe);
  return { m, mundo, j, jefe };
}
const avanzarSin = (m, mundo, segundos) => {
  for (let i = 0; i < segundos / PASO; i += 1) {
    mundo.jugador.vida = mundo.jugador.vidaMax; // inmortal para la prueba
    if (mundo.estado === 'mejora') { mundo.pendientes = 0; mundo.estado = 'jugando'; mundo.opciones = []; }
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    mundo.eventos.length = 0;
  }
};

test('cada jefe tiene una jugada estrella distinta en la fase 3 y todas sus habilidades existen', async () => {
  const { PLAN, NOMBRES_HABILIDADES } = await cargar('jefes.js');
  const { JEFES } = await cargar('config.js');
  const estrellas = new Set();
  for (const clave of Object.keys(JEFES)) {
    assert.ok(PLAN[clave], clave);
    [1, 2, 3].forEach((f) => PLAN[clave][f].forEach((h) => assert.ok(NOMBRES_HABILIDADES.includes(h), `${clave}: ${h}`)));
    const estrella = PLAN[clave][3][0];
    assert.ok(![...Object.values(PLAN[clave][1]), ...PLAN[clave][2]].includes(estrella), `${clave}: la estrella solo en la fase 3`);
    estrellas.add(estrella);
  }
  assert.equal(estrellas.size, Object.keys(JEFES).length);
});

test('desde el segundo jefe llegan con escolta de élites de su equipo (el primero no)', async () => {
  const { escoltasDe } = await cargar('jefes.js');
  assert.equal(escoltasDe(0), 0);
  assert.ok(escoltasDe(1) >= 1);
  assert.equal(escoltasDe(40), 4);
  for (const [indice, esperados] of [[0, 0], [3, escoltasDe(3)]]) {
    const { m, mundo, jefe } = await mundoConJefe('cristiano', indice);
    avanzarSin(m, mundo, 0.1);
    const escolta = mundo.enemigos.filter((e) => e.escolta === jefe.id);
    assert.equal(escolta.length, esperados, `jefe nº ${indice + 1}`);
    escolta.forEach((e) => { assert.ok(e.elite); assert.equal(e.tipo, 'madrid'); });
  }
});

test('si tardas en ganarle, el jefe pierde la paciencia: más rápido y con más daño', async () => {
  const { FURIA } = await cargar('jefes.js');
  const { m, mundo, jefe } = await mundoConJefe('mourinho', 1);
  avanzarSin(m, mundo, 0.1);
  const vel = jefe.vel;
  const dano = jefe.dano;
  assert.ok(!jefe.furia);
  jefe.nacio -= FURIA.paciencia + 1;
  avanzarSin(m, mundo, 0.05);
  assert.ok(jefe.furia);
  assert.ok(jefe.vel > vel * 1.1);
  assert.ok(jefe.dano > dano);
  // El primer jefe de la partida tiene más paciencia
  const otro = await mundoConJefe('guardiola', 0);
  avanzarSin(otro.m, otro.mundo, 0.1);
  otro.jefe.nacio -= FURIA.paciencia + 1;
  avanzarSin(otro.m, otro.mundo, 0.05);
  assert.ok(!otro.jefe.furia);
});

test('las jugadas estrella funcionan: cada jefe en fase 3 la saca primero y ataca de verdad', async () => {
  const { JEFES } = await cargar('config.js');
  for (const clave of Object.keys(JEFES)) {
    const { m, mundo, jefe } = await mundoConJefe(clave, 2);
    avanzarSin(m, mundo, 0.1);
    jefe.vida = jefe.vidaMax * 0.2; // pasa a la fase 3
    let disparos = 0;
    let avisos = 0;
    let movido = false;
    for (let i = 0; i < 6 / PASO; i += 1) {
      mundo.jugador.vida = mundo.jugador.vidaMax;
      m.avanzar(mundo, PASO, { x: 0, y: 0 });
      mundo.eventos.length = 0;
      disparos = Math.max(disparos, mundo.disparosEnemigos.length);
      avisos = Math.max(avisos, mundo.avisosJefe.length);
      if (jefe.estado !== 'normal') movido = true;
    }
    assert.equal(jefe.fase, 3, clave);
    assert.ok(disparos > 0 || avisos > 0 || movido, `${clave} no ha hecho nada`);
  }
});
