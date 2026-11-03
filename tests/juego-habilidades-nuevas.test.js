// Habilidades nuevas (carambola, presión alta, la ola, fuera de juego y ruleta), sus pasivas y sus combinaciones.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);
const PASO = 1 / 60;

async function mundoCon(arma, nivel = 3, semilla = 21) {
  const m = await cargar('mundo.js');
  const mundo = m.crearMundo({ semilla, personaje: 'koke' });
  const j = mundo.jugador;
  Object.keys(j.armas).forEach((k) => { j.armas[k] = { nivel: 0, cd: 0 }; });
  if (arma) j.armas[arma] = { nivel, cd: 0 };
  mundo.temporizadorAparicion = 1e9;
  mundo.temporizadorPremio = 1e9;
  j.vida = 1e9;
  j.vidaMax = 1e9;
  return { m, mundo, j };
}

async function rivales(mundo, puntos) {
  const { crearEnemigo } = await cargar('oleadas.js');
  return puntos.map(([x, y]) => {
    const e = crearEnemigo('city', x, y, 1);
    e.vida = e.vidaMax = 5000; // aguantan, para poder medir
    e.vel = 0;
    mundo.enemigos.push(e);
    return e;
  });
}

function jugar(m, mundo, segundos, cada) {
  for (let i = 0; i < segundos * 60; i += 1) {
    if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    mundo.jugador.x = 0;
    mundo.jugador.y = 0;
    cada?.(mundo);
    mundo.eventos.length = 0;
  }
}

test('gol de carambola: el balón rebota de rival en rival y cada rebote pega más', async () => {
  const { m, mundo } = await mundoCon('carambola', 4);
  const es = await rivales(mundo, [[150, 0], [230, 40], [300, -30], [360, 20]]);
  let rebotes = 0;
  let danoMax = 0;
  jugar(m, mundo, 2, (w) => w.proyectiles.forEach((p) => {
    if (!p.carambola) return;
    rebotes = Math.max(rebotes, p.rebotes);
    danoMax = Math.max(danoMax, p.dano);
  }));
  assert.ok(rebotes >= 2, `rebota (${rebotes})`);
  assert.ok(danoMax > 14, 'cada rebote suma un 10 % de daño');
  assert.ok(es.filter((e) => e.vida < e.vidaMax).length >= 3, 'toca a varios rivales distintos');
});

test('presión alta: salen tantos canteranos como dice el nivel, golpean y frenan, y vuelven', async () => {
  const { ARMAS } = await cargar('config.js');
  const { m, mundo } = await mundoCon('presion', 5);
  const es = await rivales(mundo, [[120, 0], [-130, 20], [0, 140], [40, -150]]);
  let lentos = 0;
  jugar(m, mundo, 4, (w) => { lentos = Math.max(lentos, w.enemigos.filter((e) => e.lento > 0).length); });
  assert.equal(mundo.jugadas.canteranos.length, ARMAS.presion.niveles[4].n);
  assert.ok(es.filter((e) => e.vida < e.vidaMax).length >= 3, 'presionan a varios rivales');
  assert.ok(lentos >= 1, 'los rivales presionados se frenan');
  // Sin el arma no quedan canteranos
  mundo.jugador.armas.presion.nivel = 0;
  jugar(m, mundo, 0.1);
  assert.equal(mundo.jugadas.canteranos.length, 0);
});

test('la ola barre el campo: daña una vez a cada rival y lo arrastra', async () => {
  const { m, mundo } = await mundoCon('ola', 3);
  const [e] = await rivales(mundo, [[160, 0]]);
  const vida0 = e.vida;
  let maxOlas = 0;
  jugar(m, mundo, 1.2, (w) => { maxOlas = Math.max(maxOlas, w.jugadas?.olas.length ?? 0); });
  assert.ok(maxOlas >= 1, 'sale una ola');
  assert.ok(e.vida < vida0, 'la ola golpea');
  assert.ok(Math.hypot(e.x, e.y) > 175, 'y arrastra al rival');
  // A nivel 4 salen dos olas a la vez (hacia delante y hacia atrás)
  const b = await mundoCon('ola', 4);
  await rivales(b.mundo, [[160, 0]]);
  let dos = 0;
  jugar(b.m, b.mundo, 0.5, (w) => { dos = Math.max(dos, w.jugadas?.olas.length ?? 0); });
  assert.ok(dos >= 2, 'dos olas a nivel 4');
});

test('fuera de juego: el rival que pisa la línea se queda clavado, recibe daño y se le marca', async () => {
  const { m, mundo } = await mundoCon('fueraDeJuego', 3);
  const [e] = await rivales(mundo, [[95, 0]]);
  e.vel = 120;
  let marcado = false;
  let aturdido = false;
  jugar(m, mundo, 1.5, (w) => {
    marcado = marcado || e.fuera > w.tiempo;
    aturdido = aturdido || e.aturdido > 0;
  });
  assert.ok(e.vida < e.vidaMax, 'recibe daño');
  assert.ok(marcado, 'se le pone el banderín de fuera de juego');
  assert.ok(aturdido, 'se queda clavado');
});

test('ruleta: aparta a los de alrededor y devuelve los balones rivales como disparos tuyos', async () => {
  const { m, mundo } = await mundoCon('ruleta', 3);
  const [cerca] = await rivales(mundo, [[50, 0], [400, 0]]);
  mundo.disparosEnemigos.push({ x: 120, y: 0, vx: -60, vy: 0, r: 8, dano: 5, vida: 3, rot: 0, giro: 0 });
  let devueltos = 0;
  let acierta = false;
  jugar(m, mundo, 1.5, (w) => w.proyectiles.forEach((p) => {
    if (!p.devuelto) return;
    devueltos += 1;
    acierta = acierta || p.golpeados.size > 0;
  }));
  assert.ok(cerca.vida < cerca.vidaMax && Math.hypot(cerca.x, cerca.y) > 50, 'aparta y daña al de al lado');
  assert.ok(devueltos >= 1, 'el balón rival sale de vuelta como disparo tuyo');
  assert.ok(acierta, 'y el balón devuelto acaba dando a un rival');
});

test('pasivas nuevas: Visión de juego agranda las habilidades y Partidos grandes pega más a jefes y élites', async () => {
  const { PASIVAS } = await cargar('config.js');
  const { recalcular } = await cargar('mejoras.js');
  const { j } = await mundoCon(null);
  j.pasivas.vision = 2;
  j.pasivas.grandes = 3;
  recalcular(j);
  assert.ok(Math.abs(j.mult.area - (1 + 2 * PASIVAS.vision.porNivel)) < 1e-9);
  assert.ok(Math.abs(j.mult.grandes - 3 * PASIVAS.grandes.porNivel) < 1e-9);
  const { danar } = await cargar('combate.js');
  const a = await mundoCon(null);
  const b = await mundoCon(null);
  b.j.pasivas.grandes = 5;
  recalcular(b.j);
  const [ea] = await rivales(a.mundo, [[300, 0]]);
  const [eb] = await rivales(b.mundo, [[300, 0]]);
  ea.elite = eb.elite = 'blindado';
  danar(a.mundo, ea, 100);
  danar(b.mundo, eb, 100);
  assert.ok(eb.vidaMax - eb.vida > ea.vidaMax - ea.vida, 'más daño a una élite con Partidos grandes');
});

test('combinaciones nuevas: existen, se activan con sus habilidades y cuentan para alguna ultra', async () => {
  const { SINERGIAS, ULTRAS } = await cargar('config.js');
  const { recalcular } = await cargar('mejoras.js');
  const nuevas = ['coraje', 'bloque', 'calderon', 'creer', 'final92'];
  for (const k of nuevas) {
    assert.ok(SINERGIAS[k], k);
    const { j } = await mundoCon(null);
    for (const [c, n] of Object.entries(SINERGIAS[k].requiere)) {
      if (j.armas[c]) j.armas[c] = { nivel: n, cd: 0 };
      else j.pasivas[c] = n;
    }
    recalcular(j);
    assert.ok(j.sinergias.includes(k), `${k} se activa`);
    assert.ok(Object.values(ULTRAS).some((u) => u.de.includes(k)), `${k} cuenta para una ultra`);
  }
});

test('las habilidades nuevas están repartidas: cada una la tienen varios jugadores y nadie pasa de 16', async () => {
  const { PERSONAJES } = await cargar('config.js');
  for (const k of ['carambola', 'presion', 'ola', 'fueraDeJuego', 'ruleta']) {
    const quien = Object.values(PERSONAJES).filter((p) => p.habilidades.includes(k));
    assert.ok(quien.length >= 3, `${k} la tienen ${quien.length}`);
  }
  for (const [k, p] of Object.entries(PERSONAJES)) assert.ok(p.habilidades.length >= 8 && p.habilidades.length <= 16, k);
});

test('experiencia: con el campo lleno de gemas, la nueva sale donde cae el rival (se trae la más lejana)', async () => {
  const { MUNDO } = await cargar('config.js');
  const { soltarGema } = await cargar('combate.js');
  const { mundo, j } = await mundoCon(null);
  mundo.gemas.length = 0;
  for (let i = 0; i < MUNDO.maxGemas; i += 1) mundo.gemas.push({ x: 5000 + i, y: 5000, valor: 1, atraida: false });
  const total0 = mundo.gemas.reduce((s, g) => s + g.valor, 0);
  soltarGema(mundo, j.x + 100, j.y, 7);
  assert.equal(mundo.gemas.length, MUNDO.maxGemas, 'no pasa del tope');
  assert.equal(mundo.gemas.reduce((s, g) => s + g.valor, 0), total0 + 7, 'no se pierde experiencia');
  assert.ok(mundo.gemas.some((g) => Math.hypot(g.x - (j.x + 100), g.y - j.y) < 10 && g.valor === 8), 'hay una gema junto al rival caído, con el valor sumado');
});
