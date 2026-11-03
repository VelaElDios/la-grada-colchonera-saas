// Pruebas de los fallos arreglados tras pasar a los muñecos chibi de 32×32: hitboxes (balones contra la cabeza,
// contacto por los pies, pies tan anchos como el muñeco, monumento sin pared invisible), jefes y rivales que se
// quedaban perdidos o atascados, y el envío del resultado de la partida con reintentos.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (nombre) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'game', nombre)).href);
const PASO = 1 / 60;

/** Mundo sin rivales que salgan solos, con el jugador inmortal y sin armas, en un sitio sin obstáculos. */
async function mundoVacio(semilla = 3) {
  const m = await cargar('mundo.js');
  const mundo = m.crearMundo({ semilla });
  mundo.temporizadorAparicion = 1e9;
  mundo.temporizadorPremio = 1e9;
  const j = mundo.jugador;
  j.vida = j.vidaMax = 1e9;
  Object.keys(j.armas).forEach((k) => { j.armas[k] = { nivel: 0, cd: 0 }; });
  return { m, mundo, j };
}

// Medidas del dibujo (render.js): el rival mide 3,1·r de alto y se dibuja de pie sobre (x, y + 0,46·alto)
const ALTO_RIVAL = 3.1;
const INC = 0.8; // CAMARA.inclinacion

test('hitbox: los balones le dan a la cabeza del muñeco chibi (antes la atravesaban) y no al aire de encima', async () => {
  const { tocaCuerpo } = await cargar('combate.js');
  const { CAMARA } = await cargar('config.js');
  assert.equal(CAMARA.inclinacion, INC);
  const e = { x: 0, y: 0, r: 12 };
  const alto = ALTO_RIVAL * e.r;
  // En pantalla (y del mundo · INC), la coronilla queda 0,96·alto por encima de los pies, que están en 0,46·alto
  const coronilla = (0.46 * alto * INC - 0.96 * alto) / INC; // en y del mundo
  const cara = coronilla * 0.75; // la frente
  assert.equal(tocaCuerpo(e, 0, cara, 5), true, 'un balón a la altura de la frente golpea');
  assert.ok((0 - 0) ** 2 + cara ** 2 > (e.r + 5) ** 2, 'con el círculo de antes (centro y radio r) no golpeaba');
  assert.equal(tocaCuerpo(e, 0, coronilla - 12, 5), false, 'por encima del pelo no hay nada');
  assert.equal(tocaCuerpo(e, e.r * 1.4 + 6, cara, 5), false, 'al lado de la cabeza tampoco');
  // Abajo: los zapatos (los pies están en 0,46·alto)
  assert.equal(tocaCuerpo(e, 0, 0.46 * alto - 2, 4), true, 'a la altura de los zapatos golpea');
  assert.equal(tocaCuerpo(e, 0, 0.46 * alto + 16, 4), false, 'por debajo de los pies no');

  // Y en la partida: un balón que cruza por delante de la cara de un rival le hace daño
  const { m, mundo } = await mundoVacio(5);
  const O = await cargar('oleadas.js');
  const j = mundo.jugador;
  const rival = O.crearEnemigo('madrid', j.x + 200, j.y + 200, 1);
  rival.vel = 0;
  rival.vida = rival.vidaMax = 1000;
  mundo.enemigos.push(rival);
  mundo.proyectiles.push({
    x: rival.x - 60, y: rival.y + cara, vx: 400, vy: 0, r: 5, dano: 10, perfora: 1, vida: 2, rot: 0, empuje: 0, golpeados: new Set(),
  });
  for (let i = 0; i < 30; i += 1) m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.ok(rival.vida < 1000, 'el balón le ha dado en la cabeza');
});

test('hitbox: el contacto con un jefe grande es por los pies, igual venga por arriba que por abajo', async () => {
  const { m, mundo, j } = await mundoVacio(6);
  const O = await cargar('oleadas.js');
  const prueba = (dy) => {
    mundo.enemigos.length = 0;
    j.invul = 0;
    j.vida = 1e9;
    mundo.stats.golpes = 0;
    const jefe = O.crearJefe(0, j.x, j.y + dy, 4, 'mourinho');
    jefe.vel = 0;
    jefe.cd = 1e9; // sin habilidades: solo el contacto
    jefe.nacio = mundo.tiempo; // sin escolta
    mundo.enemigos.push(jefe);
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    return mundo.stats.golpes;
  };
  const r = 28; // radio de Mourinho
  const alcance = r + mundo.jugador.r * 0.8;
  // Por debajo (delante en la vista 3/4), con los centros a punto de tocarse pero los pies lejos: antes golpeaba
  assert.equal(prueba(alcance - 3), 0, 'no te golpea desde lejos si viene por abajo');
  // Por arriba, con los pies tocándose (antes había que meterse casi dentro de él)
  const dyPies = (r - mundo.jugador.r) * (await cargar('config.js')).PIES.alto;
  assert.equal(prueba(-(alcance - 3) - dyPies + 6), 1, 'te golpea cuando los pies se tocan aunque venga por arriba');
});

test('hitbox: los pies son tan anchos como los zapatos del muñeco y llegan hasta donde pisa', async () => {
  const S = await cargar('sprites.js');
  const { PIES, JUGADOR } = await cargar('config.js');
  const pix = S.pixelesMuneco(S.aspectoDe('personaje', 'koke'), 0);
  let x0 = S.ANCHO;
  let x1 = -1;
  for (let y = S.ALTO - 3; y < S.ALTO; y += 1) {
    for (let x = 0; x < S.ANCHO; x += 1) if (pix[(y * S.ANCHO + x) * 4 + 3] > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  }
  const r = JUGADOR.radio;
  const alto = 3.2 * r; // el jugador se dibuja con alto = 3,2·r
  const mitadZapatos = ((x1 - x0 + 1) / 2 / S.ANCHO) * alto;
  assert.ok(r * PIES.radio >= mitadZapatos - 1.5, `los pies (${(r * PIES.radio).toFixed(1)}) cubren los zapatos (${mitadZapatos.toFixed(1)}): de lado no se mete en las paredes`);
  const suelo = 0.46 * alto; // donde se apoya el muñeco (render.js)
  assert.ok(r * (PIES.alto + PIES.radio) >= suelo, 'el círculo de los pies llega hasta donde pisa');
  assert.ok(r * (PIES.alto - PIES.radio) < suelo - r * 0.5, 'y no se queda por debajo de los zapatos');
});

test('hitbox: el monumento choca solo con la pileta (antes, paredes invisibles a los lados y detrás del trofeo)', async () => {
  const T = await cargar('terreno.js');
  assert.equal(T.MACIZOS.has('monumento'), false, 'el trofeo es estrecho: se dibuja hacia arriba, como un árbol');
  let visto = 0;
  for (const semilla of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const t = T.crearTerreno(semilla);
    for (let cx = -12; cx <= 12; cx += 1) {
      for (let cy = -12; cy <= 12; cy += 1) {
        for (const o of T.celda(t, cx, cy).obstaculos) {
          if (o.tipo !== 'monumento') continue;
          visto += 1;
          assert.equal(o.h, 70, 'choca la pileta');
          // Lo que se levanta sobre la pileta: el trofeo más alto (el del Mundial) llega a unas 58 unidades
          assert.ok(o.alto >= 56 && o.alto <= 60, `el dibujo cubre el trofeo (${o.alto})`);
          const arriba = o.y - o.h / 2;
          assert.equal(T.tocaGrada(t, o.x - o.w * 0.35, arriba - 25, 8), false, 'al lado del trofeo, por encima de la pileta, se pasa');
          assert.equal(T.tocaGrada(t, o.x, arriba + 10, 8), true, 'la pileta sí choca');
        }
      }
    }
  }
  assert.ok(visto > 0, 'hay algún monumento');
});

test('un jefe que se queda muy lejos vuelve a por ti (antes se quedaba perdido a kilómetros para siempre)', async () => {
  const { m, mundo, j } = await mundoVacio(7);
  const O = await cargar('oleadas.js');
  const { MUNDO } = await cargar('config.js');
  const jefe = O.crearJefe(0, j.x + 200, j.y, 4, 'bale');
  jefe.nacio = mundo.tiempo;
  mundo.enemigos.push(jefe);
  jefe.x = j.x + 2500; // como si te hubieras escapado corriendo
  assert.ok(MUNDO.distanciaDescarteJefe < 2500);
  m.avanzar(mundo, PASO, { x: 0, y: 0 });
  const d = Math.hypot(jefe.x - j.x, jefe.y - j.y);
  assert.ok(d < MUNDO.distanciaAparicion + 60, `el jefe vuelve al borde de la pantalla (${d.toFixed(0)})`);
  assert.equal(jefe.estado, 'normal');
  // Los rivales normales siguen igual que antes: a partir de distanciaDescarte
  const rival = O.crearEnemigo('madrid', j.x - MUNDO.distanciaDescarte - 100, j.y, 1);
  mundo.enemigos.push(rival);
  m.avanzar(mundo, PASO, { x: 0, y: 0 });
  assert.ok(Math.hypot(rival.x - j.x, rival.y - j.y) < MUNDO.distanciaAparicion + 60);
});

test('un rival o un jefe atascado lejos de ti se recoloca en un sitio libre (no se queda ahí toda la partida)', async () => {
  const { m, mundo, j } = await mundoVacio(8);
  const O = await cargar('oleadas.js');
  const T = await cargar('terreno.js');
  const { MUNDO } = await cargar('config.js');
  // Un rival que no puede avanzar (como el que se mete en un entrante de una meseta) a 600 del jugador: cada
  // fotograma intenta ir hacia ti y algo lo devuelve a su sitio
  const sitio = { x: j.x + 600, y: j.y };
  const rival = O.crearEnemigo('madrid', sitio.x, sitio.y, 1);
  mundo.enemigos.push(rival);
  let movido = null;
  for (let i = 0; i < (MUNDO.atasco + 2) * 60 && !movido; i += 1) {
    rival.x = sitio.x;
    rival.y = sitio.y;
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    if (Math.hypot(rival.x - sitio.x, rival.y - sitio.y) > 50) movido = mundo.tiempo;
  }
  assert.ok(movido, 'se recoloca');
  assert.ok(movido >= MUNDO.atasco && movido < MUNDO.atasco + 2, `después de ${MUNDO.atasco} s sin avanzar (${movido.toFixed(1)})`);
  assert.ok(Math.hypot(rival.x - j.x, rival.y - j.y) < MUNDO.distanciaAparicion + 60, 'cerca de ti');
  assert.equal(T.tocaGrada(mundo.terreno, rival.x, rival.y + rival.pies, rival.rPies, true), false, 'y con los pies fuera de los obstáculos');
  // Uno que no avanza pero está a tu lado no se recoloca (es que te está pegando)
  const cerca = { x: j.x + 60, y: j.y };
  const pegado = O.crearEnemigo('madrid', cerca.x, cerca.y, 1);
  mundo.enemigos.push(pegado);
  for (let i = 0; i < (MUNDO.atasco + 2) * 60; i += 1) {
    pegado.x = cerca.x;
    pegado.y = cerca.y;
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    j.vida = 1e9;
    assert.ok(Math.hypot(pegado.x - cerca.x, pegado.y - cerca.y) < 30, 'el que está cerca sigue donde estaba');
  }
});

test('una partida larga (25 min) no deja jefes perdidos ni rivales atascados y pasa la validación del servidor', async () => {
  const m = await cargar('mundo.js');
  const C = await cargar('config.js');
  const mundo = m.crearMundo({ semilla: 3, personaje: 'koke', entrenador: 'cholo' });
  const j = mundo.jugador;
  for (const k of Object.keys(j.armas)) j.armas[k] = { nivel: k === 'balon' || k === 'bufanda' || k === 'canticos' ? 5 : 0, cd: 0 };
  (await cargar('mejoras.js')).recalcular(j);
  let ang = 0;
  let lejos = 0;
  for (let i = 0; i < 25 * 60 * 60; i += 1) {
    if (mundo.estado === 'mejora') { m.elegirMejora(mundo, mundo.opciones[i % mundo.opciones.length].id); continue; }
    if (mundo.estado === 'fin') { mundo.estado = 'jugando'; j.vida = j.vidaMax; }
    if (i % 90 === 0) ang += Math.sin(i * 12.9898) * 1.2;
    j.vida = Math.max(j.vida, j.vidaMax);
    m.avanzar(mundo, PASO, { x: Math.cos(ang), y: Math.sin(ang) });
    mundo.eventos.length = 0;
    if (j.ulti.carga >= j.ulti.max) m.usarUlti(mundo);
    if (i % 60 === 0) {
      for (const e of mundo.enemigos) {
        assert.ok(Number.isFinite(e.x + e.y + e.vida), 'sin posiciones ni vidas rotas');
        if (e.jefe && Math.hypot(e.x - j.x, e.y - j.y) > C.MUNDO.distanciaDescarteJefe + 50) lejos += 1;
      }
    }
  }
  assert.equal(lejos, 0, 'ningún jefe se queda más lejos que distanciaDescarteJefe');
  const t = Math.floor(mundo.tiempo);
  assert.ok(j.jefes <= 3 + t / 50, `jefes ${j.jefes}`);
  assert.ok(j.nivel <= 8 + t / 3, `nivel ${j.nivel}`);
  assert.ok(j.bajas <= C.bajasPosibles(t), `bajas ${j.bajas} de ${C.bajasPosibles(t)}`);
  assert.ok(j.jefes >= 8, `se ha podido vencer a los jefes que han salido (${j.jefes})`);
});

test('envío del resultado: reintenta si falla la red o el servidor, y no repite lo que el servidor rechaza', async () => {
  const { enviarConReintentos, esReintentable } = await cargar('envio.js');
  const error = (status) => Object.assign(new Error(`error ${status}`), { status });
  const esperas = [];
  const esperar = async (ms) => { esperas.push(ms); };
  // Falla la red una vez y luego entra
  let llamadas = 0;
  let r = await enviarConReintentos(async () => { llamadas += 1; if (llamadas === 1) throw error(0); return { ok: 1 }; }, { esperar });
  assert.deepEqual([r.ok, r.intentos, llamadas], [true, 2, 2]);
  assert.equal(esperas.length, 1);
  // Un 503 dos veces y a la tercera
  llamadas = 0;
  r = await enviarConReintentos(async () => { llamadas += 1; if (llamadas < 3) throw error(503); return 'vale'; }, { esperar });
  assert.deepEqual([r.ok, r.respuesta, llamadas], [true, 'vale', 3]);
  // Siempre sin red: se rinde tras los reintentos y lo dice
  llamadas = 0;
  r = await enviarConReintentos(async () => { llamadas += 1; throw error(0); }, { esperar });
  assert.deepEqual([r.ok, r.quizaGuardada, llamadas], [false, false, 3]);
  // Un 400 (resultado no creíble) no se repite
  llamadas = 0;
  r = await enviarConReintentos(async () => { llamadas += 1; throw error(400); }, { esperar });
  assert.deepEqual([r.ok, llamadas], [false, 1]);
  // Sin respuesta y luego «no hay partida en curso»: el primero llegó y se guardó
  llamadas = 0;
  r = await enviarConReintentos(async () => { llamadas += 1; throw error(llamadas === 1 ? 0 : 404); }, { esperar });
  assert.deepEqual([r.ok, r.quizaGuardada, llamadas], [false, true, 2]);
  // Un 404 a la primera es otra cosa (la partida no existe): no se reintenta ni se da por guardada
  llamadas = 0;
  r = await enviarConReintentos(async () => { llamadas += 1; throw error(404); }, { esperar });
  assert.deepEqual([r.ok, r.quizaGuardada, llamadas], [false, false, 1]);
  assert.equal(esReintentable(error(409)), true);
  assert.equal(esReintentable(error(422)), false);
  assert.equal(esReintentable(new TypeError('fallo raro')), true);
});

test('envío del resultado: el jugador ve por qué no se ha guardado y solo se ofrece «Reintentar» si es la red', async () => {
  const { motivoSinGuardar } = await cargar('envio.js');
  const error = (status, message = '') => Object.assign(new Error(message), { status });
  const red = motivoSinGuardar(error(0));
  assert.equal(red.reintentable, true);
  assert.match(red.texto, /conexión/);
  assert.equal(motivoSinGuardar(error(503)).reintentable, true);
  const rechazo = motivoSinGuardar(error(400, 'El resultado no es creíble'));
  assert.equal(rechazo.reintentable, false);
  assert.match(rechazo.texto, /no es creíble/, 'dice el motivo que da el servidor');
  assert.match(motivoSinGuardar(error(404)).texto, /otra pestaña/);
  assert.match(motivoSinGuardar(error(401)).texto, /sesión/);
});

test('juego.js: reintenta, avisa a la vista si no se guarda, «Empezar de nuevo» cierra la anterior y la partida se pide aunque el club no haya cargado', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'game', 'juego.js'), 'utf8');
  assert.match(fuente, /enviarConReintentos\(\(\) => servidor\.finalizar\(id, datos\)\)/);
  const empezar = fuente.slice(fuente.indexOf('async function empezar('), fuente.indexOf('function alternarPausa('));
  assert.match(empezar, /if \(fase === 'jugando' \|\| fase === 'pausa' \|\| fase === 'mejora'\) cerrarPartida\(\);/, 'la partida que se deja se cierra');
  assert.ok(empezar.indexOf('cerrarPartida()') < empezar.indexOf('servidor.iniciar('), 'antes de pedir la nueva');
  assert.doesNotMatch(empezar, /estadoClub !== 'listo'\) return/, 'antes no se pedía partida mientras cargaba el club');
  assert.match(empezar, /hud\.aviso\('Esta partida no se guardará'/, 'si no se pudo abrir, se dice a la vista');
  const enviar = fuente.slice(fuente.indexOf('async function enviarResultado('), fuente.indexOf('async function reintentarGuardado('));
  assert.match(enviar, /motivoSinGuardar\(r\.error\)/);
  assert.match(enviar, /pintarAvisoGuardado\(\)/, 'el aviso queda en el menú');
  assert.match(fuente, /data-accion="reintentarGuardado"/);
  assert.match(fuente, /data-campo="aviso-guardado"/);
  const cerrar = fuente.slice(fuente.indexOf('const alCerrarPagina = () =>'), fuente.indexOf("window.addEventListener('pagehide'"));
  assert.match(cerrar, /sinGuardar[\s\S]*finalizarAlCerrar/, 'al cerrar la página se manda la que no se pudo guardar');
  // Se envía una sola vez por partida
  assert.match(fuente, /if \(!p \|\| p\.enviada \|\| !servidor\) return null;\s*p\.enviada = true;/);
});

test('hitbox: los pulsos y los saltos de los jefes golpean donde se ve el aviso del suelo (se mide con los pies)', async () => {
  const O = await cargar('oleadas.js');
  /** Mourinho suelta un pulso; el jugador se queda con los pies a `dy` del centro del aviso. ¿Le da? */
  const pulso = async (dyPiesAviso) => {
    const { m, mundo, j } = await mundoVacio(9);
    const jefe = O.crearJefe(0, j.x, j.y - 120, 4, 'mourinho');
    jefe.vel = 0;
    jefe.cd = 0.05;
    jefe.nacio = mundo.tiempo;
    mundo.enemigos.push(jefe);
    let aviso = null;
    for (let i = 0; i < 300 && !aviso; i += 1) {
      m.avanzar(mundo, PASO, { x: 0, y: 0 });
      aviso = mundo.avisosJefe.find((a) => a.tipo === 'pulso');
    }
    assert.ok(aviso, 'Mourinho avisa del pulso');
    assert.equal(aviso.y, jefe.y + jefe.pies, 'el aviso está a sus pies, en el suelo');
    const golpes = mundo.stats.golpes;
    for (let i = 0; i < 90; i += 1) {
      j.x = aviso.x;
      j.y = aviso.y + dyPiesAviso - j.pies;
      j.invul = 0;
      m.avanzar(mundo, PASO, { x: 0, y: 0 });
    }
    return { golpeado: mundo.stats.golpes > golpes, radio: aviso.radio, j };
  };
  const { radio, j } = await pulso(0);
  const borde = radio + j.rPies;
  assert.equal((await pulso(borde + 4)).golpeado, false, 'con los pies fuera por abajo no te da (antes sí)');
  assert.equal((await pulso(-(borde + 4))).golpeado, false, 'ni fuera por arriba');
  assert.equal((await pulso(-(borde - 8))).golpeado, true, 'dentro por arriba sí (antes no)');
  assert.equal((await pulso(borde - 8)).golpeado, true, 'y dentro por abajo');

  // Salto de Cristiano: cae con los pies en el centro del aviso, que está donde pisabas
  const { m, mundo, j: yo } = await mundoVacio(10);
  const cr = O.crearJefe(0, yo.x + 250, yo.y, 4, 'cristiano');
  cr.nacio = mundo.tiempo;
  mundo.enemigos.push(cr);
  let impacto = null;
  for (let i = 0; i < 60 * 12 && !impacto; i += 1) {
    yo.x = 0; yo.y = 0;
    m.avanzar(mundo, PASO, { x: 0, y: 0 });
    if (cr.estado === 'salto') impacto = mundo.avisosJefe.find((a) => a.tipo === 'impacto');
  }
  assert.ok(impacto, 'Cristiano salta');
  assert.equal(impacto.y, yo.y + yo.pies, 'el aviso está en tus pies');
  assert.equal(cr.ty + cr.pies, impacto.y, 'y él cae con los pies justo ahí');
});

test('final de la partida: enseña que las bajas y los jefes se han guardado (antes, sin puntos nuevos, no se veía)', async () => {
  const { htmlRecompensas } = await cargar('club-ui.js');
  const html = htmlRecompensas({
    recompensas: { bajas: 412, jefes: 1, personaje: 'koke', puntosNuevos: 0, fichasNuevas: 0, logrosNuevos: [] },
    record: false,
    perfil: { jugadores: { koke: { siguientePunto: { faltan: 88, coste: 500, hechas: 412 } } } },
  }, 'Koke');
  assert.match(html, /Guardado: <b>412<\/b> rivales eliminados y <b>1<\/b> jefe para Koke \(faltan 88 para su próximo punto\)/);
  // Una respuesta de un servidor antiguo (sin bajas) sigue funcionando
  assert.match(htmlRecompensas({ recompensas: { jefes: 0, puntosNuevos: 1, fichasNuevas: 0 }, record: false }, 'Koke'), /\+1<\/b> punto/);
});
