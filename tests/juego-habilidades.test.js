// Pruebas de las habilidades nuevas, las combinaciones («metas»), los jefes nuevos y el pasillo libre del menú.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);
const PASO = 1 / 60;

/** Mundo sin apariciones y con el jugador casi inmortal; `arma` a nivel `nivel` y ninguna otra. */
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

async function rivales(mundo, n = 12) {
  const { crearEnemigo } = await cargar('oleadas.js');
  for (let i = 0; i < n; i++) {
    const e = crearEnemigo('city', 60 + (i % 4) * 14, -30 + Math.floor(i / 4) * 30, 1);
    e.vida = e.vidaMax = 900; // aguantan, para poder ver los efectos
    mundo.enemigos.push(e);
  }
}

const vidaTotal = (mundo) => mundo.enemigos.reduce((s, e) => s + e.vida, 0);

function correr(m, mundo, segundos, entrada = { x: 0, y: 0 }, cada = () => {}) {
  for (let i = 0; i < segundos * 60; i++) {
    if (mundo.estado === 'mejora') m.elegirMejora(mundo, mundo.opciones[0].id);
    m.avanzar(mundo, PASO, entrada);
    cada(i);
    mundo.eventos.length = 0;
  }
}

test('hay 24 armas con 5 niveles (12 de la fase anterior y 2 más: Champions y bengala)', async () => {
  const { ARMAS } = await cargar('config.js');
  assert.equal(Object.keys(ARMAS).length, 24);
  const nuevas = ['champions', 'bengala', 'cabezazo', 'entrada', 'barrera', 'despeje', 'vaselina', 'chilena', 'volea', 'penalti', 'regate', 'cano', 'pared', 'contragolpe'];
  for (const k of nuevas) {
    assert.equal(ARMAS[k].niveles.length, 5, k);
    assert.equal(ARMAS[k].mejoras.length, 4, k);
    assert.ok(['cuerpo', 'disparo', 'movil'].includes(ARMAS[k].tipo), k);
    ARMAS[k].niveles.forEach((n) => assert.ok(n.cd > 0, k));
  }
});

test('las armas cuerpo a cuerpo nuevas funcionan: cabezazo aturde, entrada arrolla, despeje empuja y el caño aturde en área', async () => {
  for (const arma of ['cabezazo', 'entrada', 'despeje', 'cano']) {
    const { m, mundo, j } = await mundoCon(arma);
    await rivales(mundo);
    const antes = vidaTotal(mundo);
    let aturdidos = 0;
    let dash = false;
    correr(m, mundo, 4, { x: 0, y: 0 }, () => {
      aturdidos = Math.max(aturdidos, mundo.enemigos.filter((e) => e.aturdido > 0).length);
      if (j.dash) dash = true;
    });
    assert.ok(vidaTotal(mundo) < antes || mundo.enemigos.length < 12, `${arma} debe hacer daño`);
    if (arma === 'cabezazo' || arma === 'cano') assert.ok(aturdidos > 0, `${arma} debe aturdir`);
    if (arma === 'entrada') assert.ok(dash, 'la entrada es un deslizamiento');
  }
});

test('un rival aturdido no se mueve ni hace daño; un jefe solo se ralentiza', async () => {
  const { m, mundo, j } = await mundoCon(null);
  const { crearEnemigo, crearJefe } = await cargar('oleadas.js');
  const { aturdir } = await cargar('combate.js');
  const e = crearEnemigo('city', 40, 0, 1);
  mundo.enemigos.push(e);
  aturdir(mundo, e, 1.5);
  j.vida = j.vidaMax = 100;
  const x0 = e.x;
  correr(m, mundo, 1);
  assert.equal(e.x, x0, 'aturdido: no avanza');
  assert.equal(j.vida, 100, 'aturdido: no pega');
  const jefe = crearJefe(0, 500, 0, 5);
  aturdir(mundo, jefe, 2);
  assert.ok(!jefe.aturdido && jefe.lento > 0);
});

test('la barrera te protege: no recibes daño y los balones rivales desaparecen', async () => {
  const { m, mundo, j } = await mundoCon('barrera', 2);
  const { danarJugador } = await cargar('jefes.js');
  j.vida = j.vidaMax = 100;
  correr(m, mundo, 0.1);
  assert.ok(j.escudo > 0, 'la barrera se levanta');
  assert.equal(danarJugador(mundo, 50), 0);
  assert.equal(j.vida, 100);
  mundo.disparosEnemigos.push({ x: 20, y: 0, vx: 0, vy: 0, r: 8, dano: 50, vida: 3, rot: 0, giro: 0 });
  correr(m, mundo, 0.1);
  assert.equal(j.vida, 100);
  assert.equal(mundo.disparosEnemigos.length, 0);
  j.armas.barrera.nivel = 0;
  correr(m, mundo, 4);
  assert.equal(j.escudo, 0, 'se acaba');
  assert.ok(danarJugador(mundo, 10) > 0, 'sin barrera sí duele');
});

test('los disparos nuevos funcionan: vaselina, chilena, volea y penalti', async () => {
  for (const arma of ['vaselina', 'chilena', 'volea', 'penalti']) {
    const { m, mundo } = await mundoCon(arma);
    await rivales(mundo);
    const antes = vidaTotal(mundo);
    let efecto = false;
    correr(m, mundo, 4, { x: 0, y: 0 }, () => {
      if (mundo.impactos.length || mundo.proyectiles.length) efecto = true;
    });
    assert.ok(efecto, `${arma} deja un efecto`);
    assert.ok(vidaTotal(mundo) < antes || mundo.enemigos.length < 12, `${arma} hace daño`);
  }
});

test('el penalti va al rival más duro y la chilena dispara en direcciones opuestas', async () => {
  const { m, mundo } = await mundoCon('penalti', 3);
  const { crearEnemigo } = await cargar('oleadas.js');
  const flojo = crearEnemigo('city', 80, 0, 1);
  const duro = crearEnemigo('city', 0, 90, 1);
  duro.vida = duro.vidaMax = 5000;
  mundo.enemigos.push(flojo, duro);
  m.avanzar(mundo, PASO);
  assert.ok(duro.vida < 5000 && flojo.vida === flojo.vidaMax);

  const c = await mundoCon('chilena', 1);
  await rivales(c.mundo, 1);
  c.m.avanzar(c.mundo, PASO);
  const [a, b] = c.mundo.proyectiles;
  assert.ok(a && b && Math.abs(a.vx + b.vx) < 1e-6 && Math.abs(a.vy + b.vy) < 1e-6);
});

test('regate y contragolpe dan movilidad: dash invulnerable y ráfaga de velocidad y daño', async () => {
  const r = await mundoCon('regate', 3);
  await rivales(r.mundo);
  r.mundo.enemigos.forEach((e) => { e.x += 60; });
  let dash = false;
  correr(r.m, r.mundo, 2, { x: 1, y: 0 }, () => { if (r.j.dash) { dash = true; assert.ok(r.j.invul > 0); } });
  assert.ok(dash && r.j.x > 100);

  const c = await mundoCon('contragolpe', 3);
  c.m.avanzar(c.mundo, PASO, { x: 1, y: 0 });
  assert.ok(c.j.contra && c.j.contra.t > 0);
  const { multiplicadorDano } = await cargar('combate.js');
  const con = multiplicadorDano(c.j, 'cuerpo');
  c.j.contra = null;
  assert.ok(con > multiplicadorDano(c.j, 'cuerpo'));
});

test('la pared va al rival y vuelve a tus pies', async () => {
  const { m, mundo, j } = await mundoCon('pared', 1);
  const { crearEnemigo } = await cargar('oleadas.js');
  const e = crearEnemigo('city', 200, 0, 1);
  e.vida = e.vidaMax = 1e6;
  mundo.enemigos.push(e);
  let hizoPared = false;
  let vuelta = false;
  correr(m, mundo, 3, { x: 0, y: 0 }, () => {
    const p = mundo.proyectiles.find((q) => q.pared);
    if (p) hizoPared = true;
    if (p && p.vuelta) vuelta = true;
  });
  assert.ok(hizoPared && vuelta, 'sale y regresa');
  assert.ok(e.vida < 1e6, 'golpea al rival');
  assert.ok(j.armas.pared.nivel === 1);
});

test('las combinaciones se activan al juntar las habilidades y dan su bonus', async () => {
  const { SINERGIAS } = await cargar('config.js');
  const { recalcular, sinergiasActivas } = await cargar('mejoras.js');
  const { mundo, j } = await mundoCon(null);
  assert.deepEqual(sinergiasActivas(j), []);
  const armadura0 = j.mult.armadura;
  const cuerpo0 = j.mult.cuerpo;
  Object.assign(j.armas, { barrera: { nivel: 2, cd: 0 }, cabezazo: { nivel: 2, cd: 0 }, despeje: { nivel: 2, cd: 0 } });
  recalcular(j);
  assert.deepEqual(j.sinergias, ['muro']);
  assert.ok(j.mult.armadura > armadura0 && j.mult.cuerpo > cuerpo0);
  // Con un nivel menos ya no vale
  j.armas.despeje.nivel = 1;
  recalcular(j);
  assert.deepEqual(j.sinergias, []);
  // También cuentan las pasivas y las de «armas distintas»
  Object.assign(j.pasivas, { tactica: 3, pulmones: 3, botas: 3 });
  recalcular(j);
  assert.ok(j.sinergias.includes('fisico'));
  Object.keys(j.armas).slice(0, 9).forEach((k) => { j.armas[k].nivel = Math.max(1, j.armas[k].nivel); });
  recalcular(j);
  assert.ok(j.sinergias.includes('plantilla'));
  // Todas las combinaciones están bien definidas
  for (const [k, s] of Object.entries(SINERGIAS)) {
    assert.ok(s.nombre && s.descripcion && s.icono && Object.keys(s.bonus).length, k);
    for (const c of Object.keys(s.requiere)) assert.ok(mundo.jugador.armas[c] || mundo.jugador.pasivas[c] !== undefined, `${k}: ${c} no existe`);
  }
});

test('al completar una combinación hay un evento y se recuerda; las opciones marcan cuáles la completan', async () => {
  const { m, mundo, j } = await mundoCon(null);
  const { generarOpciones } = await cargar('mejoras.js');
  Object.assign(j.armas, { barrera: { nivel: 2, cd: 0 }, cabezazo: { nivel: 2, cd: 0 }, despeje: { nivel: 1, cd: 0 } });
  let marcada = false;
  for (let i = 0; i < 30 && !marcada; i++) {
    mundo.opciones = generarOpciones(mundo);
    marcada = mundo.opciones.some((o) => o.clave === 'despeje' && o.sinergia === 'Muro rojiblanco');
  }
  assert.ok(marcada, 'la mejora que completa la combinación sale marcada');
  mundo.estado = 'mejora';
  mundo.pendientes = 1;
  mundo.opciones = [{ id: 'arma:despeje', tipo: 'arma', clave: 'despeje', nivelNuevo: 2 }];
  assert.ok(m.elegirMejora(mundo, 'arma:despeje'));
  assert.ok(mundo.eventos.some((e) => e.tipo === 'sinergia' && e.clave === 'muro'));
  assert.deepEqual(mundo.sinergiasLogradas, ['muro']);
  assert.deepEqual(m.resumen(mundo).sinergias, ['muro']);
});

test('los 6 jefes nuevos usan sus habilidades sin romper nada', async () => {
  const m = await cargar('mundo.js');
  const { crearJefe } = await cargar('oleadas.js');
  const { ORDEN_JEFES } = await cargar('config.js');
  for (const clave of ['vinicius', 'yamal', 'neymar', 'bale', 'benzema', 'suarez']) {
    for (const fase of [1, 3]) {
      const mundo = m.crearMundo({ semilla: 33 });
      const j = mundo.jugador;
      Object.keys(j.armas).forEach((k) => { j.armas[k].nivel = 0; });
      j.vida = j.vidaMax = 1e9;
      mundo.temporizadorAparicion = 1e9;
      mundo.temporizadorPremio = 1e9;
      const jefe = crearJefe(ORDEN_JEFES.indexOf(clave), 260, 0, 5, clave);
      assert.equal(jefe.jefe, clave);
      jefe.vida = jefe.vidaMax * (fase === 1 ? 1 : 0.2);
      mundo.enemigos.push(jefe);
      let acciones = 0;
      for (let i = 0; i < 22 * 60; i++) {
        m.avanzar(mundo, PASO, { x: Math.cos(i / 120) * 0.5, y: 0 });
        j.vida = 1e9;
        acciones = Math.max(acciones, mundo.disparosEnemigos.length + mundo.avisosJefe.length + mundo.enemigos.length - 1 + (jefe.estado !== 'normal' ? 1 : 0));
        mundo.eventos.length = 0;
        assert.ok(Number.isFinite(jefe.x) && Number.isFinite(jefe.y), `${clave}: posición inválida`);
      }
      assert.ok(acciones > 0, `${clave} fase ${fase} no hizo nada`);
    }
  }
});

test('los jefes nuevos tienen su estilo: zigzag, bicicletas, cañones, precisión y mordisco', async () => {
  const m = await cargar('mundo.js');
  const { crearJefe } = await cargar('oleadas.js');
  const observar = (clave, fase, segundos, ver) => {
    const mundo = m.crearMundo({ semilla: 34 });
    const j = mundo.jugador;
    Object.keys(j.armas).forEach((k) => { j.armas[k].nivel = 0; });
    j.vida = j.vidaMax = 1e9;
    mundo.temporizadorAparicion = 1e9;
    mundo.temporizadorPremio = 1e9;
    const jefe = crearJefe(0, 300, 0, 5, clave);
    jefe.vida = jefe.vidaMax * [1, 0.5, 0.2][fase - 1];
    mundo.enemigos.push(jefe);
    const visto = {};
    for (let i = 0; i < segundos * 60; i++) {
      m.avanzar(mundo, PASO, { x: 0, y: 0 });
      j.x = 0; j.y = 0;
      ver(mundo, jefe, visto);
      mundo.eventos.length = 0;
    }
    return visto;
  };
  const vini = observar('vinicius', 2, 16, (w, e, v) => { if (e.estado === 'embestida') { const a = Math.atan2(e.dirY, e.dirX); v.dirs = (v.dirs ?? new Set()).add(a.toFixed(1)); } });
  assert.ok(vini.dirs && vini.dirs.size >= 2, 'Vinicius cambia de dirección en sus embestidas');
  const ney = observar('neymar', 1, 8, (w, e, v) => { if (w.avisosJefe.some((a) => a.tipo === 'impacto')) v.lluvia = true; });
  assert.ok(ney.lluvia, 'Neymar marca impactos en el suelo');
  const bale = observar('bale', 1, 8, (w, e, v) => { if (w.disparosEnemigos.some((d) => d.r > 12)) v.canon = true; if (e.estado === 'embestida') v.arrancada = true; });
  assert.ok(bale.canon && bale.arrancada, 'Bale dispara cañonazos enormes y arranca');
  const ben = observar('benzema', 1, 8, (w, e, v) => { v.vistos = v.vistos ?? new Set(); w.disparosEnemigos.forEach((d) => v.vistos.add(d)); });
  assert.ok(ben.vistos.size >= 3, 'Benzema dispara sus rápidos');
  const sua = observar('suarez', 1, 10, (w, e, v) => { if (w.ondas.some((o) => o.enemiga)) v.pulso = true; });
  assert.ok(sua.pulso, 'Suárez muerde y suelta pulso');
});

test('el terreno del menú deja un pasillo libre: el muñeco nunca se queda pillado', async () => {
  const T = await cargar('terreno.js');
  const { TERRENO } = await cargar('config.js');
  const m = await cargar('mundo.js');
  let hay = false;
  for (const semilla of [1, 2, 3, 42, 99, 1234]) {
    const libre = T.crearTerreno(semilla, { pasillo: 190 });
    const normal = T.crearTerreno(semilla);
    for (let cx = 0; cx <= 16; cx++) {
      for (const cy of [-1, 0]) {
        T.celda(libre, cx, cy).obstaculos.forEach((o) => assert.ok(Math.abs(o.y) - o.h / 2 >= 190, `obstáculo en el pasillo (semilla ${semilla}, celda ${cx},${cy})`));
        if (T.celda(normal, cx, cy).obstaculos.some((o) => Math.abs(o.y) - o.h / 2 < 190)) hay = true;
      }
    }
  }
  assert.ok(hay, 'sin pasillo, sí había obstáculos en esa franja (la prueba tiene sentido)');
  // Recto por el pasillo de un mundo de menú, sin chocar con nada
  const mundo = m.crearMundo({ semilla: 7, pasilloMenu: true });
  const j = mundo.jugador;
  for (let x = 0; x < 9000; x += 20) {
    j.x = x; j.y = 0;
    assert.equal(T.resolver(mundo.terreno, j), false, `choca en x=${x}`);
  }
  assert.ok(TERRENO.celda > 0);
});

test('los jugadores nuevos dibujan su sprite (peinados nuevos incluidos)', async () => {
  const { PERSONAJES, JEFES } = await cargar('config.js');
  const peinados = new Set();
  Object.values(PERSONAJES).forEach((p) => peinados.add(p.aspecto.pelo.e));
  Object.values(JEFES).forEach((p) => peinados.add(p.aspecto.pelo.e));
  ['rapado', 'cresta'].forEach((p) => assert.ok(peinados.has(p), `se usa el peinado ${p}`));
  const fs = require('node:fs');
  const sprites = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'game', 'sprites.js'), 'utf8');
  [...peinados].filter((p) => p !== 'corto').forEach((p) => assert.ok(sprites.includes(`case '${p}'`), `sprites.js no dibuja el peinado ${p}`));
  const iconos = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'game', 'iconos.js'), 'utf8');
  const { ARMAS, SINERGIAS } = await cargar('config.js');
  [...Object.values(ARMAS), ...Object.values(SINERGIAS)].forEach((x) => assert.ok(new RegExp(`\\b${x.icono}:`).test(iconos), `falta el icono ${x.icono}`));
});
