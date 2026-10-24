// Pruebas de /api/juego: club, contratos, entrenamiento, partidas y ranking (peticiones HTTP reales, datos en memoria).
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer } = require('./helpers');

describe('API /api/juego', () => {
  let srv;
  let reloj = 1_000_000;
  let semilla = 0.123;
  const azar = () => { semilla = (semilla * 9301 + 0.49297) % 1; return semilla; };

  before(async () => {
    srv = await createTestServer({ juegoOpciones: { ahora: () => reloj, azar } });
  });
  after(() => srv.close());

  let contador = 0;
  /** Crea un usuario y devuelve su cookie de sesión. */
  async function nuevoUsuario(alias = `fan${contador += 1}`) {
    const email = `${alias}@grada.es`;
    await srv.seedUser({ email, password: 'aupa-atleti' });
    const cookie = (await srv.request('POST', '/auth/login', { body: { email, password: 'aupa-atleti' } })).cookie;
    return { cookie, email };
  }
  const get = (c, ruta) => srv.request('GET', `/juego${ruta}`, { cookie: c });
  const post = (c, ruta, body = {}) => srv.request('POST', `/juego${ruta}`, { cookie: c, body });

  /** Juega una partida completa que dura `tiempo` s y vence a `jefes` jefes. */
  async function jugar(c, personaje, { jefes = 0, tiempo = 300, nivel = 20, bajas = 0 } = {}) {
    const ini = await post(c, '/partidas', { personaje, entrenador: 'cholo' });
    assert.equal(ini.status, 201, JSON.stringify(ini.body));
    reloj += tiempo * 1000;
    return post(c, `/partidas/${ini.body.partidaId}/fin`, { tiempo, nivel, jefes, bajas });
  }

  test('todas las rutas exigen sesión (401)', async () => {
    assert.equal((await srv.request('GET', '/juego/perfil')).status, 401);
    assert.equal((await srv.request('POST', '/juego/contratar', { body: {} })).status, 401);
    assert.equal((await srv.request('GET', '/juego/ranking')).status, 401);
  });

  test('el primer perfil trae 1 portero, 1 defensa, 1 medio y 1 delantero de los de pocas habilidades', async () => {
    const { cookie } = await nuevoUsuario();
    const res = await get(cookie, '/perfil');
    assert.equal(res.status, 200);
    const claves = Object.keys(res.body.jugadores);
    assert.equal(claves.length, 4);
    assert.equal(res.body.fichas, 0);
    const { PERSONAJES } = await import('../public/js/game/config.js');
    assert.deepEqual(claves.map((k) => PERSONAJES[k].posicion).sort(), ['defensa', 'delantero', 'medio', 'portero']);
    claves.forEach((k) => assert.ok(PERSONAJES[k].habilidades.length <= 10, `${k} es demasiado bueno para empezar`));
  });

  test('el perfil se conserva entre peticiones (y entre sesiones)', async () => {
    const { cookie, email } = await nuevoUsuario();
    const a = (await get(cookie, '/perfil')).body;
    const cookie2 = (await srv.request('POST', '/auth/login', { body: { email, password: 'aupa-atleti' } })).cookie;
    const b = (await get(cookie2, '/perfil')).body;
    assert.deepEqual(Object.keys(a.jugadores), Object.keys(b.jugadores));
  });

  test('no se puede jugar con alguien que no se tiene ni con un entrenador inventado', async () => {
    const { cookie } = await nuevoUsuario();
    assert.equal((await post(cookie, '/partidas', { personaje: 'griezmann', entrenador: 'cholo' })).status, 400);
    const propio = Object.keys((await get(cookie, '/perfil')).body.jugadores)[0];
    assert.equal((await post(cookie, '/partidas', { personaje: propio, entrenador: 'nadie' })).status, 400);
  });

  test('los jefes dan puntos (1 por cada 3 con ese jugador) y fichas (1 por cada 3 en total)', async () => {
    const { cookie } = await nuevoUsuario();
    const [a, b] = Object.keys((await get(cookie, '/perfil')).body.jugadores);

    let r = await jugar(cookie, a, { jefes: 2 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.recompensas.puntosNuevos, 0);
    assert.equal(r.body.perfil.fichas, 0);

    r = await jugar(cookie, b, { jefes: 3 }); // otro jugador: 3 jefes → 1 punto para él; en total 5 → 1 ficha (cada 3)
    assert.equal(r.body.recompensas.puntosNuevos, 1);
    assert.equal(r.body.recompensas.fichasNuevas, 1);
    assert.equal(r.body.perfil.fichas, 1);
    assert.equal(r.body.perfil.jugadores[b].puntosLibres, 1);
    assert.equal(r.body.perfil.jugadores[a].puntosLibres, 0);
  });

  test('entrenar gasta puntos y solo se puede con puntos libres', async () => {
    const { cookie } = await nuevoUsuario();
    const [a] = Object.keys((await get(cookie, '/perfil')).body.jugadores);
    assert.equal((await post(cookie, '/entrenar', { personaje: a, estadistica: 'vida' })).status, 409);

    await jugar(cookie, a, { jefes: 6, tiempo: 600 }); // 2 puntos
    let res = await post(cookie, '/entrenar', { personaje: a, estadistica: 'vida' });
    assert.equal(res.status, 200);
    assert.equal(res.body.jugadores[a].stats.vida, 1);
    res = await post(cookie, '/entrenar', { personaje: a, estadistica: 'suerte' });
    assert.equal(res.body.jugadores[a].puntosLibres, 0);
    assert.equal((await post(cookie, '/entrenar', { personaje: a, estadistica: 'suerte' })).status, 409);
    assert.equal((await post(cookie, '/entrenar', { personaje: a, estadistica: 'magia' })).status, 400);
    assert.equal((await post(cookie, '/entrenar', { personaje: 'noexiste', estadistica: 'vida' })).status, 400);
  });

  test('contratar sin ficha falla; con ficha da un jugador nuevo, sin repetir nunca', async () => {
    const { cookie } = await nuevoUsuario();
    const [a] = Object.keys((await get(cookie, '/perfil')).body.jugadores);
    assert.equal((await post(cookie, '/contratar')).status, 409);

    const { PERSONAJES } = await import('../public/js/game/config.js');
    const total = Object.keys(PERSONAJES).length;
    const vistos = new Set(Object.keys((await get(cookie, '/perfil')).body.jugadores));
    // Una partida de 600 s con 100 jefes sería increíble: se reparten en varias partidas largas
    for (let i = 0; i < total - 4; i += 1) {
      await jugar(cookie, a, { jefes: 5, tiempo: 600 });
      const res = await post(cookie, '/contratar');
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.ok(!vistos.has(res.body.fichado), `${res.body.fichado} salió repetido`);
      vistos.add(res.body.fichado);
    }
    assert.equal(vistos.size, total);
    await jugar(cookie, a, { jefes: 5, tiempo: 600 });
    assert.equal((await post(cookie, '/contratar')).status, 409); // ya están todos
  });

  test('un resultado inventado se rechaza: sin partida, tiempo imposible o jefes increíbles', async () => {
    const { cookie } = await nuevoUsuario();
    const [a] = Object.keys((await get(cookie, '/perfil')).body.jugadores);
    assert.equal((await post(cookie, '/partidas/inventada/fin', { tiempo: 10, nivel: 2, jefes: 0, bajas: 1 })).status, 404);

    let ini = await post(cookie, '/partidas', { personaje: a, entrenador: 'cholo' });
    reloj += 60_000;
    let res = await post(cookie, `/partidas/${ini.body.partidaId}/fin`, { tiempo: 3000, nivel: 5, jefes: 0, bajas: 1 });
    assert.equal(res.status, 400); // dice haber jugado 50 min en 1
    res = await post(cookie, `/partidas/${ini.body.partidaId}/fin`, { tiempo: 60, nivel: 5, jefes: 40, bajas: 1 });
    assert.equal(res.status, 400); // 40 jefes en un minuto
    res = await post(cookie, `/partidas/${ini.body.partidaId}/fin`, { tiempo: 'mucho', nivel: 5, jefes: 0, bajas: 1 });
    assert.equal(res.status, 400);
    res = await post(cookie, `/partidas/${ini.body.partidaId}/fin`, { tiempo: 60, nivel: 5, jefes: 0, bajas: 10 });
    assert.equal(res.status, 200);
    // y no se puede cobrar dos veces la misma partida
    res = await post(cookie, `/partidas/${ini.body.partidaId}/fin`, { tiempo: 60, nivel: 5, jefes: 0, bajas: 10 });
    assert.equal(res.status, 404);
  });

  test('el ranking ordena por tiempo, guarda quién y a qué nivel, y solo cuenta la mejor partida de cada uno', async () => {
    const ana = await nuevoUsuario('ana');
    const luis = await nuevoUsuario('luis');
    const [pa] = Object.keys((await get(ana.cookie, '/perfil')).body.jugadores);
    const [pl] = Object.keys((await get(luis.cookie, '/perfil')).body.jugadores);

    await jugar(ana.cookie, pa, { tiempo: 400, nivel: 30 });
    await jugar(luis.cookie, pl, { tiempo: 900, nivel: 60 });
    await jugar(ana.cookie, pa, { tiempo: 200, nivel: 12 }); // peor: no cambia su récord

    const res = await get(ana.cookie, '/ranking');
    assert.equal(res.status, 200);
    const filas = res.body.filas.filter((f) => ['ana', 'luis'].includes(f.alias));
    assert.deepEqual(filas.map((f) => [f.alias, f.tiempo, f.nivel]), [['luis', 900, 60], ['ana', 400, 30]]);
    assert.equal(filas[1].esTuyo, true);
    assert.equal(filas[1].personaje, pa);
    assert.equal(res.body.tuMejor.tiempo, 400);
    assert.ok(!JSON.stringify(res.body).includes('@'), 'el ranking no debe publicar correos');
  });

  test('dos contratos a la vez con una sola ficha: solo uno se concede', async () => {
    const { cookie } = await nuevoUsuario();
    const [a] = Object.keys((await get(cookie, '/perfil')).body.jugadores);
    await jugar(cookie, a, { jefes: 5, tiempo: 600 });
    const [r1, r2] = await Promise.all([post(cookie, '/contratar'), post(cookie, '/contratar')]);
    assert.deepEqual([r1.status, r2.status].sort(), [200, 409]);
  });
  test('las bajas dan puntos de entrenamiento al jugador (cada vez más caros)', async () => {
    const { cookie } = await nuevoUsuario();
    const [a] = Object.keys((await get(cookie, '/perfil')).body.jugadores);
    let r = await jugar(cookie, a, { tiempo: 600, bajas: 100 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.perfil.jugadores[a].puntosLibres, 0); // aún no llega al primer punto
    r = await jugar(cookie, a, { tiempo: 600, bajas: 100 });
    assert.equal(r.body.perfil.jugadores[a].puntosLibres, 1);
    assert.equal(r.body.perfil.jugadores[a].bajas, 200);
  });

  test('el modo pruebas (/desbloquear) es solo para administradores', async () => {
    const normal = await nuevoUsuario();
    assert.equal((await post(normal.cookie, '/desbloquear')).status, 403);

    await srv.seedUser({ email: 'jefa@grada.es', password: 'aupa-atleti', role: 'admin' });
    const cookie = (await srv.request('POST', '/auth/login', { body: { email: 'jefa@grada.es', password: 'aupa-atleti' } })).cookie;
    const r = await post(cookie, '/desbloquear');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const perfil = (await get(cookie, '/perfil')).body;
    assert.ok(Object.keys(perfil.jugadores).length >= 30, 'tiene a casi todos los jugadores');
    assert.ok(Object.values(perfil.jugadores).every((j) => j.puntosLibres > 10));
  });

  test('mote y avatar: se validan, no se repiten y salen en /auth/me y en el ranking', async () => {
    const put = (c, body) => srv.request('PUT', '/juego/identidad', { cookie: c, body });
    const { cookie } = await nuevoUsuario('mote1');
    const otro = await nuevoUsuario('mote2');
    const [mio] = Object.keys((await get(cookie, '/perfil')).body.jugadores);

    assert.equal((await put(cookie, { apodo: 'x' })).status, 400, 'muy corto');
    assert.equal((await put(cookie, { apodo: 'yo@correo.es' })).status, 400, 'nada de correos');
    assert.equal((await put(cookie, { avatar: 'p:messi' })).status, 400, 'jugador que no existe o no tienes');
    assert.equal((await put(cookie, { avatar: 'e:mourinho' })).status, 400);

    let r = await put(cookie, { apodo: '  El   Niño ', avatar: `p:${mio}` });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.apodo, 'El Niño');
    assert.equal(r.body.avatar, `p:${mio}`);
    assert.equal(r.body.apodoClave, undefined, 'no se publica la clave interna');
    const yo = await srv.request('GET', '/auth/me', { cookie });
    assert.equal(yo.body.apodo, 'El Niño');

    assert.equal((await put(otro.cookie, { apodo: 'el nino' })).status, 409, 'el mismo mote sin tildes ni mayúsculas');
    assert.equal((await put(otro.cookie, { avatar: 'e:cholo' })).status, 200, 'los entrenadores valen para todos');

    // El ranking usa el mote y el avatar (también si se cambian después del récord)
    await jugar(cookie, mio, { tiempo: 5000 });
    r = await put(cookie, { apodo: 'Niño Torres' });
    assert.equal(r.status, 200);
    const fila = (await get(cookie, '/ranking')).body.filas.find((f) => f.esTuyo);
    assert.equal(fila.alias, 'Niño Torres');
    assert.equal(fila.avatar, `p:${mio}`);
  });
});
