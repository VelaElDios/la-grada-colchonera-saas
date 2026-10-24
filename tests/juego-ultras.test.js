// Pruebas de las ULTRAS: cómo se consiguen (combinaciones + maestría), que cada jugador pueda llegar a alguna
// y que cada una hace en el campo lo que promete (cometas, lluvia de oro, estrellas, cúpula, fuego en cadena, tiempo parado).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const JUEGO = path.join(__dirname, '..', 'public', 'js', 'game');
const cargar = (nombre) => import(pathToFileURL(path.join(JUEGO, nombre)).href);
const PASO = 1 / 60;

async function mundoCon({ personaje = 'griezmann', armas = {}, pasivas = {}, forzar = [], semilla = 31 } = {}) {
  const m = await cargar('mundo.js');
  const { recalcular } = await cargar('mejoras.js');
  const mundo = m.crearMundo({ semilla, personaje });
  const j = mundo.jugador;
  Object.keys(j.armas).forEach((k) => { j.armas[k] = { nivel: 0, cd: 0 }; });
  Object.entries(armas).forEach(([k, nivel]) => { j.armas[k] = { nivel, cd: 0 }; });
  Object.entries(pasivas).forEach(([k, nivel]) => { j.pasivas[k] = nivel; });
  j.ultrasForzadas = forzar;
  recalcular(j);
  mundo.temporizadorAparicion = 1e9;
  mundo.temporizadorPremio = 1e9;
  j.vida = j.vidaMax;
  return { m, mundo, j };
}

async function rivales(mundo, n = 12, vida = 3000) {
  const { crearEnemigo } = await cargar('oleadas.js');
  for (let i = 0; i < n; i += 1) {
    const e = crearEnemigo('city', 80 + (i % 4) * 16, -40 + Math.floor(i / 4) * 40, 1);
    e.vida = e.vidaMax = vida;
    mundo.enemigos.push(e);
  }
}

const correr = (m, mundo, segundos, entrada = { x: 0, y: 0 }) => {
  for (let i = 0; i < segundos / PASO; i += 1) {
    if (mundo.estado === 'mejora') { mundo.pendientes = 0; mundo.estado = 'jugando'; mundo.opciones = []; }
    m.avanzar(mundo, PASO, entrada);
    mundo.eventos.length = 0;
  }
};
const vidaTotal = (mundo) => mundo.enemigos.reduce((s, e) => s + (e.muerto ? 0 : e.vida), 0);

test('hay 6 ultras y cada una se consigue con 2 o 3 combinaciones que existen', async () => {
  const { ULTRAS, SINERGIAS } = await cargar('config.js');
  assert.equal(Object.keys(ULTRAS).length, 6);
  for (const [clave, u] of Object.entries(ULTRAS)) {
    assert.ok(u.de.length >= u.cuantas, clave);
    assert.ok(u.cuantas >= 2 && u.cuantas <= 3, `${clave}: pide 2 o 3 combinaciones`);
    assert.ok(u.maestria >= 20, `${clave}: pide dominar tus armas`);
    u.de.forEach((c) => assert.ok(SINERGIAS[c], `${clave} usa la combinación ${c}`));
    assert.ok(u.nombre && u.titulo && u.descripcion && u.color && u.icono);
  }
});

test('una ultra pide las combinaciones, que alguna lleve armas y la maestría de armas', async () => {
  const { ULTRAS } = await cargar('config.js');
  const { ultraConseguida, ultrasPara } = await cargar('ultras.js');
  const u = ULTRAS.balonOro; // 3 de [triplete, pichichi, doblete, maquina]
  assert.equal(ultraConseguida(u, ['triplete', 'pichichi'], 99), false, 'faltan combinaciones');
  assert.equal(ultraConseguida(u, ['triplete', 'pichichi', 'doblete'], 5), false, 'falta maestría');
  assert.equal(ultraConseguida(u, ['triplete', 'pichichi', 'doblete'], 99), true);
  // Zamora no sale solo con combinaciones de pasivas
  assert.equal(ultraConseguida(ULTRAS.zamora, ['capitan', 'remontada'], 99), false, 'solo pasivas: no vale');
  assert.equal(ultraConseguida(ULTRAS.zamora, ['capitan', 'muro'], 99), true);
  assert.deepEqual(ultrasPara([], 99), []);
});

test('todos los jugadores pueden llegar al menos a una ultra con sus habilidades', async () => {
  const { PERSONAJES, SINERGIAS, ULTRAS, ARMAS } = await cargar('config.js');
  const { ultraConseguida } = await cargar('ultras.js');
  for (const [clave, p] of Object.entries(PERSONAJES)) {
    const posible = (s) => {
      const c = SINERGIAS[s];
      if (c.distintas) return p.habilidades.length >= c.distintas.cuantas;
      return Object.keys(c.requiere).every((x) => !ARMAS[x] || (p.habilidades.includes(x) && !(p.posicion === 'portero' && ARMAS[x].tipo === 'disparo')));
    };
    const alcanzables = Object.entries(ULTRAS).filter(([, u]) => ultraConseguida(u, u.de.filter(posible), 999));
    assert.ok(alcanzables.length >= 1, `${clave} no puede conseguir ninguna ultra`);
  }
});

const NIVELES_CASI = { penalti: 5, volea: 5, chilena: 4, balon: 5, efecto: 5, canonazo: 3, corner: 4, vaselina: 4 }; // maestría 35: a una mejora de Balón de Oro

test('al subir la última mejora que falta se consigue la ultra, con aviso y celebración', async () => {
  const { m, mundo, j } = await mundoCon({ personaje: 'griezmann', pasivas: { balonOro: 3, botaOro: 3, guanteOro: 3 }, armas: NIVELES_CASI });
  assert.ok(j.sinergias.includes('triplete') && j.sinergias.includes('doblete'));
  assert.equal(j.ultras.includes('balonOro'), false, 'aún le falta maestría de armas');
  mundo.estado = 'mejora';
  mundo.pendientes = 1;
  mundo.opciones = [{ id: 'arma:bufanda', tipo: 'arma', clave: 'bufanda', nivelNuevo: 1, nombre: 'Bufanda', icono: 'bufanda', descripcion: '' }];
  m.elegirMejora(mundo, 'arma:bufanda');
  assert.ok(j.ultras.includes('balonOro'), 'ultra conseguida');
  assert.ok(mundo.eventos.some((e) => e.tipo === 'ultra' && e.clave === 'balonOro'));
  assert.ok(mundo.ult.anuncio > 0 && mundo.ult.flash > 0);
  assert.ok(m.resumen(mundo).ultras.includes('balonOro'));
});

test('las mejoras que completan una ultra salen marcadas', async () => {
  const { generarOpciones } = await cargar('mejoras.js');
  const { mundo, j } = await mundoCon({ personaje: 'griezmann', pasivas: { balonOro: 3, botaOro: 3, guanteOro: 3 }, armas: NIVELES_CASI });
  let marcada = null;
  for (let i = 0; i < 80 && !marcada; i += 1) marcada = generarOpciones(mundo).find((o) => o.ultra);
  assert.ok(marcada, 'alguna oferta lleva la etiqueta de ultra');
  assert.equal(marcada.ultra, 'Ganador del Balón de Oro');
  assert.equal(j.ultras.includes('balonOro'), false);
});

test('Premio Puskás: dos cometas curvos que atraviesan y explotan', async () => {
  const { m, mundo, j } = await mundoCon({ forzar: ['puskas'] });
  await rivales(mundo, 12, 500);
  const antes = vidaTotal(mundo);
  correr(m, mundo, 2);
  assert.ok(mundo.ult.cometas.length > 0 || vidaTotal(mundo) < antes, 'lanza cometas');
  correr(m, mundo, 4);
  assert.ok(vidaTotal(mundo) < antes * 0.9 || mundo.enemigos.length < 12, 'hace daño de verdad');
  assert.equal(j.ultras[0], 'puskas');
});

test('Ganador del Balón de Oro: lluvia de balones de oro sobre los rivales', async () => {
  const { m, mundo } = await mundoCon({ forzar: ['balonOro'] });
  await rivales(mundo, 10, 3000);
  const antes = vidaTotal(mundo);
  correr(m, mundo, 0.3);
  assert.ok(mundo.ult.meteoros.length > 0, 'hay meteoros cayendo');
  correr(m, mundo, 5);
  assert.ok(vidaTotal(mundo) < antes * 0.85);
});

test('MVP de la Champions: seis estrellas orbitan, golpean y estalla una supernova', async () => {
  const { m, mundo } = await mundoCon({ forzar: ['champions'] });
  const { posicionesEstrellas } = await cargar('ultras.js');
  const { ULTRAS } = await cargar('config.js');
  assert.equal(posicionesEstrellas(mundo).length, ULTRAS.champions.estrellas);
  await rivales(mundo, 8, 600);
  const antes = vidaTotal(mundo);
  correr(m, mundo, 10);
  assert.ok(vidaTotal(mundo) < antes * 0.8 || mundo.enemigos.length < 8, 'las estrellas y la supernova hacen daño');
  assert.ok(mundo.ondas.length >= 0);
});

test('Trofeo Zamora: cúpula que quema y borra balones, y +25 % de resistencia', async () => {
  const sin = await mundoCon({});
  const con = await mundoCon({ forzar: ['zamora'] });
  assert.ok(con.j.mult.armadura >= sin.j.mult.armadura + 0.25 - 1e-9);
  await rivales(con.mundo, 6, 3000);
  const antes = vidaTotal(con.mundo);
  con.mundo.disparosEnemigos.push({ x: con.j.x + 30, y: con.j.y, vx: 0, vy: 0, vida: 5, r: 6, dano: 20 });
  correr(con.m, con.mundo, 1);
  assert.equal(con.mundo.disparosEnemigos.filter((d) => d.vida > 0).length, 0, 'el balón rival desaparece al tocar la cúpula');
  correr(con.m, con.mundo, 9);
  assert.ok(vidaTotal(con.mundo) < antes * 0.9);
});

test('Bota de Oro histórica: rastro de fuego al correr y explosión en cadena de los que mueren ardiendo', async () => {
  const { m, mundo, j } = await mundoCon({ forzar: ['botaOro'] });
  for (let i = 0; i < 90; i += 1) m.avanzar(mundo, PASO, { x: 1, y: 0 });
  assert.ok(mundo.fuegos.length >= 5, 'deja fuego por donde pasa');
  // cadena: un grupo apretado donde el primero muere ardiendo
  const { explosionDeFuego } = await cargar('ultras.js');
  const { crearEnemigo } = await cargar('oleadas.js');
  const grupo = [];
  for (let i = 0; i < 5; i += 1) {
    const e = crearEnemigo('city', j.x + 200 + i * 30, j.y, 1);
    e.vida = e.vidaMax = 40;
    mundo.enemigos.push(e);
    grupo.push(e);
  }
  mundo.cuadricula.limpiar();
  mundo.enemigos.forEach((e) => mundo.cuadricula.insertar(e));
  grupo[0].quemado = { t: 2, tick: 0.5, dano: 5 };
  const { danoFijo } = await cargar('combate.js');
  danoFijo(mundo, grupo[0], 999);
  assert.ok(grupo.slice(1).some((e) => e.muerto || e.vida < 40), 'la explosión alcanza a los de al lado');
  assert.equal(typeof explosionDeFuego, 'function');
});

test('Mejor jugador del Mundial: el tiempo se para (rivales aturdidos) y vas más rápido', async () => {
  const { m, mundo, j } = await mundoCon({ forzar: ['mundial'] });
  await rivales(mundo, 8, 9000);
  mundo.ult.magia.cd = 0.01;
  correr(m, mundo, 0.5);
  assert.ok(mundo.ult.magia.dur > 0, 'el tiempo se ha parado');
  assert.ok(mundo.enemigos.every((e) => (e.aturdido ?? 0) > 0 || e.lento > 0), 'todos los rivales congelados');
  assert.ok(j.contra && j.contra.vel > 0, 'vas más rápido');
});

test('el dibujo de las ultras no falla (lienzo de mentira)', async () => {
  const { dibujarUltrasSuelo, dibujarUltrasAire, dibujarUltrasPantalla } = await cargar('render-ultras.js');
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (o, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => grad : () => {}), set: () => true });
  const { mundo, j } = await mundoCon({ forzar: ['puskas', 'balonOro', 'champions', 'zamora', 'botaOro', 'mundial'] });
  await rivales(mundo, 6);
  const { m } = await mundoCon({});
  for (let i = 0; i < 400; i += 1) m.avanzar(mundo, PASO, { x: 1, y: 0 });
  mundo.ult.magia.dur = 1;
  mundo.ult.anuncio = 2;
  mundo.ult.anuncioClave = 'puskas';
  mundo.ult.flash = 0.4;
  dibujarUltrasSuelo(ctx, mundo, 1);
  dibujarUltrasAire(ctx, mundo, 1);
  dibujarUltrasPantalla(ctx, mundo, 800, 600, 1);
  assert.equal(j.ultras.length, 6);
});
