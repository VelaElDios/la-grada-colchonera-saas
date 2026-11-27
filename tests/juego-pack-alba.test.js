// Pruebas del DLC «Albacete Balompié»: jugadores, entrenadores (y sus ultis), equipaciones, logros, el club
// por packs (activar el DLC y fichar en él) y que el pack del Atleti, los rivales y los jefes siguen igual.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createTestServer } = require('./helpers');

const JUEGO = path.join(__dirname, '..', 'public', 'js', 'game');
const cargar = (nombre) => import(pathToFileURL(path.join(JUEGO, nombre)).href);
const PASO = 1 / 60;

function azarSemilla(s) {
  let a = s;
  return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; };
}

const ALBA = {
  portero: ['jfmolina', 'keylor', 'tomeu'],
  defensa: ['coco', 'geli', 'denia', 'vallejo'],
  medio: ['zalazar', 'catali', 'bjelica', 'pacheco'],
  delantero: ['morientes', 'lopezalfaro', 'zozulia'],
};

test('el DLC del Alba trae sus 14 jugadores, cada uno en su posición, con ficha y rareza', async () => {
  const {
    PERSONAJES, PACKS, SELECCIONES, RAREZAS, jugadoresDePack, packDe,
  } = await cargar('config.js');
  assert.equal(PACKS.alba.nombre, 'Albacete Balompié');
  assert.ok(PACKS.alba.dlc && !PACKS.atleti.dlc);
  const claves = jugadoresDePack('alba');
  assert.deepEqual([...claves].sort(), Object.values(ALBA).flat().sort());
  Object.entries(ALBA).forEach(([pos, ks]) => ks.forEach((k) => assert.equal(PERSONAJES[k].posicion, pos, k)));
  // Los cambios pedidos en la plantilla: Vallejo, Pacheco, Zozulia y López Alfaro (y no los que salieron)
  ['vallejo', 'pacheco', 'zozulia', 'lopezalfaro'].forEach((k) => assert.ok(PERSONAJES[k], k));
  ['bittolo', 'danirodri', 'aridane', 'dertycia'].forEach((k) => assert.equal(PERSONAJES[k], undefined, k));
  const rango = { comun: [8, 9], raro: [10, 11], epico: [12, 13], leyenda: [14, 16] };
  for (const k of claves) {
    const p = PERSONAJES[k];
    assert.equal(packDe(k), 'alba');
    assert.ok(RAREZAS[p.rareza], `${k}: rareza`);
    const [a, b] = rango[p.rareza];
    assert.ok(p.habilidades.length >= a && p.habilidades.length <= b, `${k}: ${p.habilidades.length} habilidades para ${p.rareza}`);
    assert.ok(SELECCIONES[p.nacionalidad], `${k}: falta la selección ${p.nacionalidad}`);
    assert.ok(p.epoca && p.descripcion.length > 40, `${k}: ficha`);
    assert.equal(p.aspecto.camiseta.c, p.posicion === 'portero' ? p.aspecto.camiseta.c : '#ffffff', `${k}: la primera del Alba es blanca`);
  }
  assert.deepEqual(['zalazar', 'catali'].map((k) => PERSONAJES[k].rareza), ['leyenda', 'leyenda']);
  // Hay un común por posición para el equipo inicial del DLC
  Object.keys(ALBA).forEach((pos) => assert.ok(claves.some((k) => PERSONAJES[k].posicion === pos && PERSONAJES[k].rareza === 'comun'), pos));
});

test('el pack del Atleti no pierde nada y los rivales y los jefes no cambian', async () => {
  const {
    PERSONAJES, ENTRENADORES, EQUIPOS, JEFES, ORDEN_JEFES, jugadoresDePack,
  } = await cargar('config.js');
  assert.equal(jugadoresDePack('atleti').length, 36);
  ['koke', 'griezmann', 'oblak', 'torres', 'aragones'].forEach((k) => assert.equal(PERSONAJES[k].pack, 'atleti', k));
  assert.equal(ENTRENADORES.cholo.pack, 'atleti');
  assert.equal(ENTRENADORES.aragones.pack, 'atleti');
  assert.equal(Object.keys(EQUIPOS).length, 16);
  assert.equal(Object.keys(JEFES).length, 10);
  assert.deepEqual(ORDEN_JEFES, ['guardiola', 'mourinho', 'cristiano', 'messi', 'vinicius', 'yamal', 'neymar', 'bale', 'benzema', 'suarez']);
  Object.values(EQUIPOS).forEach((e) => assert.equal(e.pack, undefined));
});

test('cada jugador del Alba se pinta y juega sin valores inválidos, con cada entrenador del DLC', async () => {
  const S = await cargar('sprites.js');
  const m = await cargar('mundo.js');
  const { jugadoresDePack } = await cargar('config.js');
  for (const personaje of jugadoresDePack('alba')) {
    const d = S.pixelesMuneco(S.aspectoDe('personaje', personaje), 0);
    assert.equal(d.length, S.ANCHO * S.ALTO * 4, personaje);
    for (const entrenador of ['floro', 'ferrando']) {
      const mundo = m.crearMundo({ semilla: 5, personaje, entrenador });
      assert.equal(mundo.jugador.personaje, personaje);
      assert.equal(mundo.jugador.entrenador, entrenador);
      mundo.jugador.vida = mundo.jugador.vidaMax = 1e9;
      for (let i = 0; i < 20 * 60; i++) {
        if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
        m.avanzar(mundo, PASO, { x: Math.cos(i / 300), y: Math.sin(i / 300) });
        mundo.eventos.length = 0;
        if (i % 60 === 0 && mundo.jugador.ulti.carga >= mundo.jugador.ulti.max) m.usarUlti(mundo);
      }
      const j = mundo.jugador;
      assert.ok(Number.isFinite(j.x) && Number.isFinite(j.mult.dano) && Number.isFinite(j.vidaMax), `${personaje} con ${entrenador}`);
    }
  }
  for (const k of ['floro', 'ferrando']) assert.equal(S.pixelesMuneco(S.aspectoDe('entrenador', k), 0).length, S.ANCHO * S.ALTO * 4);
});

test('entrenadores del Alba: Floro lanza una onda con bonus de daño y Ferrando una furia con su velocidad', async () => {
  const { ENTRENADORES } = await cargar('config.js');
  const { LEMAS, consejo } = await cargar('menu-fx.js');
  const m = await cargar('mundo.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  assert.equal(ENTRENADORES.cholo.ulti.tipo, 'onda');
  assert.equal(ENTRENADORES.aragones.ulti.tipo, 'furia');
  assert.equal(ENTRENADORES.floro.ulti.tipo, 'onda');
  assert.equal(ENTRENADORES.ferrando.ulti.tipo, 'furia');
  for (const k of ['floro', 'ferrando']) {
    assert.equal(ENTRENADORES[k].pack, 'alba');
    assert.ok(ENTRENADORES[k].resumen && ENTRENADORES[k].ulti.nombre && ENTRENADORES[k].ulti.descripcion);
    assert.equal(consejo(4, k), LEMAS[k], `${k} tiene lema`);
  }

  const floro = m.crearMundo({ semilla: 6, entrenador: 'floro' });
  assert.equal(floro.jugador.bonoAnimo, ENTRENADORES.floro.ulti.bonoDano, 'el bonus de daño es el de Floro, no el del Cholo');
  for (let i = 0; i < 20; i++) floro.enemigos.push(crearEnemigo('madrid', 100 + i * 5, 50, 1));
  floro.jugador.ulti.carga = floro.jugador.ulti.max;
  assert.equal(m.usarUlti(floro), true);
  assert.ok(floro.enemigos.some((e) => e.muerto), 'la onda elimina rivales');
  assert.ok(floro.jugador.animo > 0 && floro.jugador.furia === 0);

  const ferrando = m.crearMundo({ semilla: 6, entrenador: 'ferrando' });
  ferrando.jugador.ulti.carga = ferrando.jugador.ulti.max;
  assert.equal(m.usarUlti(ferrando), true);
  assert.equal(ferrando.jugador.furia, ENTRENADORES.ferrando.ulti.duracion);
  assert.equal(ferrando.jugador.animo, 0);
  // Con la furia de Ferrando se corre un 20 % más (no el 25 % de Luis)
  const quieto = m.crearMundo({ semilla: 6, entrenador: 'ferrando' });
  const correr = (mundo) => { const x0 = mundo.jugador.x; m.avanzar(mundo, PASO, { x: 1, y: 0 }); return mundo.jugador.x - x0; };
  for (let i = 0; i < 60; i++) { correr(quieto); correr(ferrando); ferrando.jugador.furia = 5; }
  const conFuria = correr(ferrando);
  const sinFuria = correr(quieto);
  if (sinFuria > 0) assert.ok(conFuria / sinFuria > 1.1 && conFuria / sinFuria < 1.3, `proporción ${conFuria / sinFuria}`);
});

test('equipaciones y logros del Alba: cada equipación la da un logro y solo la visten los del Alba', async () => {
  const {
    EQUIPACIONES, LOGROS, equipacionesDe, equipacionDePack, logroDeEquipacion, logrosCreibles, logrosDeClub,
  } = await cargar('logros.js');
  const { PERSONAJES } = await cargar('config.js');
  const delAlba = Object.keys(EQUIPACIONES).filter((k) => EQUIPACIONES[k].pack === 'alba');
  assert.deepEqual(delAlba.sort(), ['albaQueso', 'albaSegunda', 'albaTercera']);
  delAlba.forEach((k) => {
    assert.ok(logroDeEquipacion(k), `${k} se desbloquea con un logro`);
    assert.ok(equipacionDePack(k, 'alba') && !equipacionDePack(k, 'atleti'), k);
  });
  assert.ok(equipacionDePack('primera', 'alba') && equipacionDePack('primera', 'atleti'), 'la primera vale para todos');
  assert.ok(equipacionDePack('segunda', 'atleti') && !equipacionDePack('segunda', 'alba'));
  ['quesoMecanico', 'septimo', 'gigantes', 'semifinal95'].forEach((k) => assert.ok(LOGROS[k]?.dato.length > 40, k));

  // El servidor solo cree lo que puede comprobar
  const r = { tiempo: 650, nivel: 30, jefes: 5, bajas: 900, personaje: 'zalazar', entrenador: 'floro' };
  assert.deepEqual(logrosCreibles(['quesoMecanico', 'septimo', 'gigantes'], r).sort(), ['gigantes', 'quesoMecanico', 'septimo']);
  assert.deepEqual(logrosCreibles(['quesoMecanico', 'gigantes'], { ...r, personaje: 'koke' }), [], 'con uno del Atleti no cuentan');
  assert.deepEqual(logrosCreibles(['septimo'], { ...r, entrenador: 'cholo' }), []);
  assert.ok(equipacionesDe(['quesoMecanico', 'septimo']).includes('albaSegunda'));

  // De club: 8 del Alba en la plantilla; y el Paseo de Leyendas sigue pidiendo solo las 8 del Atleti
  const ocho = Object.fromEntries(['jfmolina', 'keylor', 'tomeu', 'coco', 'geli', 'denia', 'vallejo', 'zalazar'].map((k) => [k, { partidas: 0 }]));
  assert.ok(logrosDeClub({ jugadores: ocho }, PERSONAJES).includes('semifinal95'));
  const leyendasAtleti = Object.keys(PERSONAJES).filter((k) => PERSONAJES[k].pack === 'atleti' && PERSONAJES[k].rareza === 'leyenda');
  const soloAtleti = Object.fromEntries(leyendasAtleti.map((k) => [k, { partidas: 0 }]));
  assert.ok(logrosDeClub({ jugadores: soloAtleti }, PERSONAJES).includes('leyendas'), 'no hace falta fichar a Zalazar ni a Catali');
});

test('club por packs: activar el DLC da su equipo inicial una sola vez y sus contratos son solo del Alba', async () => {
  const club = await cargar('club.js');
  const { PERSONAJES } = await cargar('config.js');
  for (let s = 1; s <= 30; s++) {
    const perfil = club.perfilNuevo(azarSemilla(s));
    assert.ok(Object.keys(perfil.jugadores).every((k) => PERSONAJES[k].pack === 'atleti'), 'se empieza solo con el Atleti');
    assert.equal(club.tienePack(perfil, 'atleti'), true);
    assert.equal(club.tienePack(perfil, 'alba'), false);
    const nuevos = club.activarPack(perfil, 'alba', azarSemilla(s + 100));
    assert.equal(nuevos.length, 4);
    assert.deepEqual(nuevos.map((k) => PERSONAJES[k].posicion).sort(), ['defensa', 'delantero', 'medio', 'portero']);
    nuevos.forEach((k) => assert.equal(club.rareza(k).id, 'comun', k));
    assert.equal(club.tienePack(perfil, 'alba'), true);
    assert.deepEqual(club.activarPack(perfil, 'alba', azarSemilla(s)), [], 'no se activa dos veces');
    assert.equal(Object.keys(perfil.jugadores).length, 8);
  }
  assert.deepEqual(club.activarPack({ jugadores: {} }, 'inventado', Math.random), []);

  const perfil = club.perfilNuevo(azarSemilla(4));
  club.activarPack(perfil, 'alba', azarSemilla(5));
  const azar = azarSemilla(9);
  for (let i = 0; i < 10; i++) {
    const k = club.sortearContrato(perfil, azar, 'alba');
    assert.equal(PERSONAJES[k].pack, 'alba', k);
    perfil.jugadores[k] = club.fichaNueva();
  }
  assert.equal(club.sortearContrato(perfil, azar, 'alba'), null, 'ya están los 14');
  assert.ok(club.sortearContrato(perfil, azar), 'sin pack se sigue fichando en el Atleti');
  const suma = club.probabilidadesContrato({ jugadores: {} }, 'alba').reduce((s, x) => s + x.probabilidad, 0);
  assert.ok(Math.abs(suma - 1) < 1e-9);
  assert.deepEqual(club.resumenPacks(perfil).alba, { tengo: 14, total: 14, activo: true });
});

test('contrato del Alba: solo salen los suyos y, sin mod, el contrato del Atleti se ve como el original', async () => {
  const club = await cargar('club-ui.js');
  assert.equal(club.htmlPacks, undefined, 'ya no hay selector de equipos: el DLC se activa en Ajustes → Mods');
  const base = {
    jugadores: { tomeu: {}, vallejo: {}, pacheco: {}, zozulia: {}, koke: {} }, jefesTotal: 3, fichas: 1, totalJugadores: 50,
  };
  const alba = club.htmlContratar({ ...base, packs: { alba: { activo: true } } }, () => '', 'alba');
  assert.match(alba, /Firmar un contrato: ¡fichaje al azar!/);
  assert.ok(alba.includes('Tienes <strong>4</strong> de <strong>14</strong> jugadores.'));
  assert.ok(alba.includes('lo que cada jugador fue <b>en el Alba</b>'));
  assert.doesNotMatch(alba, /Griezmann/, 'en el contrato del Alba solo salen los del Alba');
  const atleti = club.htmlContratar({ ...base, packs: { atleti: { activo: true } } }, () => '', 'atleti');
  assert.ok(atleti.includes('Tienes <strong>1</strong> de <strong>36</strong> jugadores.'), 'cuenta solo los del Atleti, como el original');
  assert.ok(atleti.includes('<b>en el Atleti</b>'));
  assert.doesNotMatch(atleti, /Alba|DLC|Zalazar/, 'sin mod no hay rastro del Alba');
  const preparando = club.htmlContratar({ ...base, packs: { alba: { activo: false } } }, () => '', 'alba');
  assert.match(preparando, /Ajustes → Mods/);
});

describe('API del DLC del Alba', () => {
  let srv;
  let reloj = 5_000_000;
  let semilla = 0.321;
  const azar = () => { semilla = (semilla * 9301 + 0.49297) % 1; return semilla; };
  before(async () => { srv = await createTestServer({ juegoOpciones: { ahora: () => reloj, azar } }); });
  after(() => srv.close());

  let n = 0;
  async function nuevoUsuario() {
    const email = `alba${n += 1}@grada.es`;
    await srv.seedUser({ email, password: 'aupa-atleti' });
    return (await srv.request('POST', '/auth/login', { body: { email, password: 'aupa-atleti' } })).cookie;
  }
  const get = (c, ruta) => srv.request('GET', `/juego${ruta}`, { cookie: c });
  const post = (c, ruta, body = {}) => srv.request('POST', `/juego${ruta}`, { cookie: c, body });

  test('activar el DLC exige sesión, da 4 jugadores del Alba una vez y luego se puede jugar con ellos', async () => {
    assert.equal((await srv.request('POST', '/juego/packs/alba/activar', { body: {} })).status, 401);
    const cookie = await nuevoUsuario();
    const antes = (await get(cookie, '/perfil')).body;
    assert.deepEqual(antes.packs.alba, { tengo: 0, total: 14, activo: false });
    assert.equal(antes.packs.atleti.activo, true);
    assert.equal((await post(cookie, '/packs/inventado/activar')).status, 400);
    assert.equal((await post(cookie, '/packs/atleti/activar')).status, 400, 'el Atleti no es un DLC');
    // Fichar en el Alba sin activarlo no se puede
    assert.equal((await post(cookie, '/contratar', { pack: 'alba' })).status, 409);

    const res = await post(cookie, '/packs/alba/activar');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.nuevos.length, 4);
    assert.deepEqual(res.body.perfil.packs.alba, { tengo: 4, total: 14, activo: true });
    assert.equal(Object.keys(res.body.perfil.jugadores).length, 8);
    const otraVez = await post(cookie, '/packs/alba/activar');
    assert.deepEqual(otraVez.body.nuevos, []);
    assert.equal(Object.keys(otraVez.body.perfil.jugadores).length, 8);

    // Partida con un jugador del Alba y un entrenador del Alba
    const ini = await post(cookie, '/partidas', { personaje: res.body.nuevos[0], entrenador: 'floro' });
    assert.equal(ini.status, 201, JSON.stringify(ini.body));
    reloj += 600 * 1000;
    const fin = await post(cookie, `/partidas/${ini.body.partidaId}/fin`, { tiempo: 600, nivel: 30, jefes: 6, bajas: 400, logros: ['quesoMecanico', 'septimo'] });
    assert.equal(fin.status, 200, JSON.stringify(fin.body));
    assert.ok(fin.body.perfil.logros.quesoMecanico && fin.body.perfil.logros.septimo);
    assert.ok(fin.body.perfil.equipaciones.includes('albaSegunda') && fin.body.perfil.equipaciones.includes('albaTercera'));

    // Con las fichas ganadas se ficha en el Alba (y sale uno del Alba)
    const contrato = await post(cookie, '/contratar', { pack: 'alba' });
    assert.equal(contrato.status, 200, JSON.stringify(contrato.body));
    const { PERSONAJES } = await cargar('config.js');
    assert.equal(PERSONAJES[contrato.body.fichado].pack, 'alba');
    assert.equal(contrato.body.perfil.packs.alba.tengo, 5);
    assert.equal((await post(cookie, '/contratar', { pack: 'inventado' })).status, 400);
  });
});
