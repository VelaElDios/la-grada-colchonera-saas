// Armas automáticas: el jugador solo se mueve, las armas atacan solas.
import { ARMAS } from './config.js';
import {
  danar, aturdir, danoFijo, quemar, crearTexto, tocaCuerpo,
} from './combate.js';
import { normalizar } from './util.js';
import { golpeUltra } from './ultras.js';
import { nuevoPasoDeEfectos } from './efectos.js';

const ALCANCE_BALON = 520;
const TAU = Math.PI * 2;

/** «Visión de juego»: multiplica radios y alcances de las habilidades. */
const area = (mundo) => mundo.jugador.mult.area ?? 1;
/** Nivel del arma que está atacando ahora (para que los efectos crezcan con él). */
const nivelActual = (mundo) => mundo.jugador.armas[mundo.fuente]?.nivel ?? 1;

const ARBITRO = new Set(['silbato', 'tarjeta', 'var']);

/** Tiempo hasta el siguiente disparo: tiene en cuenta mejoras de recarga, combinaciones y la Furia Roja. */
const recarga = (j, base, clave) => Math.max(ARMAS[clave]?.cdMin ?? 0, base * j.mult.cd * (j.furia > 0 ? 0.5 : 1) * (ARBITRO.has(clave) ? 1 - (j.mult.cdArbitro ?? 0) : 1));

/** Programa algo que el jugador hace dentro de `t` segundos (remates escalonados, caída de vaselinas...). */
export function programarJugador(mundo, t, hacer) {
  mundo.acciones.push({ t, hacer });
}

/** Avanza las acciones programadas. */
export function actualizarAcciones(mundo, dt) {
  const lista = mundo.acciones;
  for (let i = 0; i < lista.length; i += 1) lista[i].t -= dt;
  for (let i = 0; i < lista.length; i += 1) {
    if (lista[i].t <= 0 && !lista[i].hecha) {
      lista[i].hecha = true;
      lista[i].hacer();
    }
  }
  let k = 0;
  for (let i = 0; i < lista.length; i += 1) if (!lista[i].hecha) lista[k++] = lista[i];
  lista.length = k;
}

/** Los `n` rivales más cercanos al jugador dentro de `alcance`. */
function masCercanos(mundo, n, alcance) {
  const j = mundo.jugador;
  const elegidos = []; // { e, d2 } ordenados por distancia
  const lim2 = alcance * alcance;
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    const d2 = (e.x - j.x) ** 2 + (e.y - j.y) ** 2;
    if (d2 > lim2) continue;
    let pos = elegidos.length;
    while (pos > 0 && elegidos[pos - 1].d2 > d2) pos -= 1;
    if (pos < n) {
      elegidos.splice(pos, 0, { e, d2 });
      if (elegidos.length > n) elegidos.pop();
    }
  }
  return elegidos.map((x) => x.e);
}

function nuevoProyectil(mundo, props) {
  const j = mundo.jugador;
  mundo.proyectiles.push({
    x: j.x, y: j.y, vx: 0, vy: 0, r: 6, dano: 1, perfora: 1, vida: 1.4, rot: 0, empuje: 120, golpeados: new Set(), fuente: mundo.fuente, nivel: nivelActual(mundo), ...props,
  });
  // Las combinaciones («Bombardeo», «Doblete») hacen que los balones atraviesen a más rivales
  const p = mundo.proyectiles[mundo.proyectiles.length - 1];
  if (!p.sinBono) p.perfora += j.mult.perfora ?? 0;
  // Poderes de oro: balones dorados que atraviesan más y balones con fuego que queman
  if (!p.tipoDano) {
    if (j.poder.oro > 0) {
      p.oro = true;
      p.perfora += j.poder.oroPerfora;
    }
    if (j.poder.fuego > 0) p.fuego = j.poder.fuego;
  }
}

/** Pequeño fogonazo y retroceso al chutar: se ve y se siente más el disparo. */
function destelloDeDisparo(mundo, [dx, dy]) {
  const j = mundo.jugador;
  if (mundo.ondas.length < 40) mundo.ondas.push({ x: j.x + dx * 18, y: j.y + dy * 18, radio: 16, vida: 0.1, total: 0.1, familia: 'disparo', nivel: nivelActual(mundo) });
  j.vx -= dx * 22; // pequeño retroceso
  j.vy -= dy * 22;
}

function dispararBalones(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano, perfora } = ARMAS.balon.niveles[nivel - 1];
  const objetivos = masCercanos(mundo, n, ALCANCE_BALON);
  const hayObjetivo = objetivos.length > 0;
  for (let k = 0; k < n; k += 1) {
    let dx;
    let dy;
    if (hayObjetivo) {
      const e = objetivos[k % objetivos.length];
      [dx, dy] = normalizar(e.x - j.x, e.y - j.y);
      // Si hay más balones que rivales, los sobrantes salen en abanico
      if (k >= objetivos.length) {
        const desvio = (k - objetivos.length + 1) * 0.2 * (k % 2 ? 1 : -1);
        const c = Math.cos(desvio);
        const s = Math.sin(desvio);
        [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
      }
    } else {
      [dx, dy] = [j.dirX, j.dirY];
    }
    nuevoProyectil(mundo, { vx: dx * 380, vy: dy * 380, dano, perfora });
  }
  destelloDeDisparo(mundo, objetivos.length ? normalizar(objetivos[0].x - j.x, objetivos[0].y - j.y) : [j.dirX, j.dirY]);
  mundo.eventos.push({ tipo: 'chute' });
}

function dispararCanonazo(mundo, nivel) {
  const j = mundo.jugador;
  const { dano, perfora, r } = ARMAS.canonazo.niveles[nivel - 1];
  const [objetivo] = masCercanos(mundo, 1, 650);
  const [dx, dy] = objetivo ? normalizar(objetivo.x - j.x, objetivo.y - j.y) : [j.dirX, j.dirY];
  nuevoProyectil(mundo, { vx: dx * 520, vy: dy * 520, r, dano, perfora, vida: 1.6, empuje: 380, grande: true });
  destelloDeDisparo(mundo, [dx, dy]);
  mundo.sacudida = Math.max(mundo.sacudida, 0.08);
  mundo.eventos.push({ tipo: 'cantico' });
}

function saqueDeEsquina(mundo, nivel) {
  const { n, dano, perfora } = ARMAS.corner.niveles[nivel - 1];
  const giro = mundo.rng.rango(0, Math.PI * 2);
  for (let k = 0; k < n; k += 1) {
    const a = giro + (k / n) * Math.PI * 2;
    nuevoProyectil(mundo, { vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, dano, perfora, vida: 1.25 });
  }
  mundo.eventos.push({ tipo: 'chute' });
}

function balonConEfecto(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano } = ARMAS.efecto.niveles[nivel - 1];
  const objetivos = masCercanos(mundo, n, 600);
  for (let k = 0; k < n; k += 1) {
    const objetivo = objetivos.length ? objetivos[k % objetivos.length] : null;
    const a = Math.atan2(j.dirY, j.dirX) + (k - (n - 1) / 2) * 0.7; // salen abiertos y luego giran
    nuevoProyectil(mundo, { vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, dano, perfora: 2, vida: 2.4, teledirigido: true, objetivo });
  }
  mundo.eventos.push({ tipo: 'chute' });
}

function golpearConBufanda(mundo, nivel) {
  const j = mundo.jugador;
  const { largo: largoBase, ancho, dano, ambos } = ARMAS.bufanda.niveles[nivel - 1];
  const largo = largoBase * area(mundo);
  const [objetivo] = masCercanos(mundo, 1, largo * 1.6);
  let ang;
  if (objetivo) {
    ang = Math.atan2(objetivo.y - j.y, objetivo.x - j.x);
  } else {
    ang = Math.atan2(j.dirY, j.dirX) + (j.ladoBufanda ? Math.PI : 0);
    j.ladoBufanda = !j.ladoBufanda;
  }
  const direcciones = ambos ? [ang, ang + Math.PI] : [ang];

  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    const dx = e.x - j.x;
    const dy = e.y - j.y;
    const dist = Math.hypot(dx, dy);
    if (dist > largo + e.r) continue;
    const angE = Math.atan2(dy, dx);
    const dentro = direcciones.some((a) => {
      let d = Math.abs(angE - a) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d <= ancho || dist < e.r + 18;
    });
    if (dentro) danar(mundo, e, dano, normalizar(dx, dy), 90, 'cuerpo');
  }
  direcciones.forEach((a) => mundo.tajos.push({ x: j.x, y: j.y, ang: a, largo, ancho, vida: 0.2, total: 0.2, familia: 'cuerpo', bufanda: true, nivel }));
  mundo.eventos.push({ tipo: 'latigazo' });
}

function girarBanderines(mundo, nivel, dt) {
  const j = mundo.jugador;
  const { n, radio: radioBase, dano, vel } = ARMAS.banderines.niveles[nivel - 1];
  const radio = radioBase * area(mundo);
  j.angBanderines = (j.angBanderines + vel * dt * (j.furia > 0 ? 1.5 : 1)) % (Math.PI * 2);
  j.banderines.length = 0;
  for (let i = 0; i < n; i += 1) {
    const a = j.angBanderines + (i * Math.PI * 2) / n;
    const bx = j.x + Math.cos(a) * radio;
    const by = j.y + Math.sin(a) * radio;
    j.banderines.push({ x: bx, y: by, ang: a });
    mundo.cuadricula.cerca(bx, by, 80, (e) => { // 80: llega a la cabeza de los jefes más grandes
      if (e.muerto || e.cdBanderin > 0) return;
      if (!tocaCuerpo(e, bx, by, 11)) return; // vuelan a la altura del cuerpo, como los balones
      e.cdBanderin = 0.45;
      danar(mundo, e, dano, normalizar(e.x - j.x, e.y - j.y), 170, 'cuerpo');
    });
  }
}

function cantar(mundo, nivel) {
  const j = mundo.jugador;
  const { dano, empuje } = ARMAS.canticos.niveles[nivel - 1];
  const radio = ARMAS.canticos.niveles[nivel - 1].radio * area(mundo);
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    const dx = e.x - j.x;
    const dy = e.y - j.y;
    if (Math.hypot(dx, dy) <= radio + e.r) danar(mundo, e, dano, normalizar(dx, dy), empuje, 'cuerpo');
  }
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.45, total: 0.45, familia: 'area', nivel, sonido: true });
  mundo.sacudida = Math.max(mundo.sacudida, 0.12);
  mundo.eventos.push({ tipo: 'cantico' });
}

function pitar(mundo, nivel) {
  const j = mundo.jugador;
  const { dano, lento } = ARMAS.silbato.niveles[nivel - 1];
  const radio = ARMAS.silbato.niveles[nivel - 1].radio * area(mundo);
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    if (Math.hypot(e.x - j.x, e.y - j.y) > radio + e.r) continue;
    e.lento = Math.max(e.lento, e.jefe ? lento / 2 : lento);
    danar(mundo, e, dano, null, 0, 'cuerpo');
  }
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.5, total: 0.5, silbato: true, familia: 'area', nivel });
  mundo.eventos.push({ tipo: 'latigazo' });
}

function sacarTarjeta(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano, pct } = ARMAS.tarjeta.niveles[nivel - 1];
  // Los rivales con más vida dentro de la zona de juego
  const candidatos = [];
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (!e.muerto && Math.hypot(e.x - j.x, e.y - j.y) < 460) candidatos.push(e);
  }
  candidatos.sort((a, b) => b.vida - a.vida);
  candidatos.slice(0, n).forEach((e) => {
    const porcentaje = e.jefe ? pct / 5 : pct;
    mundo.tarjetas.push({ x: e.x, y: e.y - e.r - 10, vida: 0.7, total: 0.7, nivel });
    danar(mundo, e, dano + porcentaje * e.vidaMax, normalizar(e.x - j.x, e.y - j.y), 120, 'cuerpo');
  });
  if (candidatos.length) mundo.eventos.push({ tipo: 'golpe' });
}

function revisarConVar(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano } = ARMAS.var.niveles[nivel - 1];
  const radio = ARMAS.var.niveles[nivel - 1].radio * area(mundo);
  const visibles = [];
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (!e.muerto && Math.hypot(e.x - j.x, e.y - j.y) < 520) visibles.push(e);
  }
  if (!visibles.length) return;
  mundo.rng.barajar(visibles).slice(0, n).forEach((objetivo) => {
    mundo.rayos.push({ x: objetivo.x, y: objetivo.y, radio, vida: 0.35, total: 0.35, nivel, semilla: objetivo.id ?? 0 });
    for (let i = 0; i < mundo.enemigos.length; i += 1) {
      const e = mundo.enemigos[i];
      if (e.muerto) continue;
      if (Math.hypot(e.x - objetivo.x, e.y - objetivo.y) <= radio + e.r) danar(mundo, e, dano, null, 0, 'cuerpo');
    }
  });
  mundo.sacudida = Math.max(mundo.sacudida, 0.1);
  mundo.eventos.push({ tipo: 'cantico' });
}


/** Rival más cercano dentro de `alcance`, o null. */
const masCerca = (mundo, alcance) => masCercanos(mundo, 1, alcance)[0] ?? null;

/** Dirección hacia el rival más cercano (o hacia donde mira el jugador). */
function direccionDeAtaque(mundo, alcance) {
  const j = mundo.jugador;
  const e = masCerca(mundo, alcance);
  return e ? normalizar(e.x - j.x, e.y - j.y) : [j.dirX, j.dirY];
}

function cabecear(mundo, nivel) {
  const j = mundo.jugador;
  const { ancho, dano, aturde } = ARMAS.cabezazo.niveles[nivel - 1];
  const largo = ARMAS.cabezazo.niveles[nivel - 1].largo * area(mundo);
  const [dx, dy] = direccionDeAtaque(mundo, largo * 1.4);
  const ang = Math.atan2(dy, dx);
  let golpes = 0;
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    const ex = e.x - j.x;
    const ey = e.y - j.y;
    const dist = Math.hypot(ex, ey);
    if (dist > largo + e.r) continue;
    let d = Math.abs(Math.atan2(ey, ex) - ang) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d > ancho && dist > e.r + 20) continue;
    danar(mundo, e, dano, normalizar(ex, ey), 220, 'cuerpo');
    aturdir(mundo, e, aturde);
    golpes += 1;
  }
  mundo.tajos.push({ x: j.x, y: j.y, ang, largo, ancho: Math.min(ancho, 0.8), vida: 0.18, total: 0.18, familia: 'cuerpo', nivel });
  if (golpes) {
    mundo.sacudida = Math.max(mundo.sacudida, 0.1);
    mundo.eventos.push({ tipo: 'golpe' });
  }
}

function deslizarse(mundo, nivel) {
  const j = mundo.jugador;
  if (j.dash) return;
  const { largo, ancho, dano, empuje } = ARMAS.entrada.niveles[nivel - 1];
  const [dx, dy] = direccionDeAtaque(mundo, 340);
  const v = 720;
  j.dash = { t: largo / v, v, dx, dy, ancho: ancho * area(mundo), dano, empuje, tipoDano: 'cuerpo', golpeados: new Set(), color: '#ff4d63', fuente: 'entrada' };
  mundo.eventos.push({ tipo: 'latigazo' });
}

function levantarBarrera(mundo, nivel) {
  const j = mundo.jugador;
  const { dur } = ARMAS.barrera.niveles[nivel - 1];
  const radio = ARMAS.barrera.niveles[nivel - 1].radio * area(mundo);
  j.escudo = Math.max(j.escudo, dur);
  j.escudoMax = dur;
  j.escudoRadio = radio;
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.35, total: 0.35, familia: 'area', nivel });
  mundo.eventos.push({ tipo: 'cantico' });
}

function despejar(mundo, nivel) {
  const j = mundo.jugador;
  const { dano, empuje } = ARMAS.despeje.niveles[nivel - 1];
  const radio = ARMAS.despeje.niveles[nivel - 1].radio * area(mundo);
  const [dx, dy] = direccionDeAtaque(mundo, radio * 1.4);
  const ang = Math.atan2(dy, dx);
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    const ex = e.x - j.x;
    const ey = e.y - j.y;
    if (Math.hypot(ex, ey) > radio + e.r) continue;
    let d = Math.abs(Math.atan2(ey, ex) - ang) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d <= 1.0) danar(mundo, e, dano, normalizar(ex, ey), empuje, 'cuerpo');
  }
  // Los balones de los rivales que pillen delante, fuera
  for (let i = 0; i < mundo.disparosEnemigos.length; i += 1) {
    const b = mundo.disparosEnemigos[i];
    if (Math.hypot(b.x - j.x, b.y - j.y) > radio * 1.1) continue;
    let d = Math.abs(Math.atan2(b.y - j.y, b.x - j.x) - ang) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d <= 1.2) b.vida = 0;
  }
  mundo.tajos.push({ x: j.x, y: j.y, ang, largo: radio, ancho: 1.0, vida: 0.22, total: 0.22, familia: 'cuerpo', nivel });
  mundo.ondas.push({ x: j.x + dx * radio * 0.5, y: j.y + dy * radio * 0.5, radio: radio * 0.6, vida: 0.25, total: 0.25, familia: 'cuerpo', nivel });
  mundo.sacudida = Math.max(mundo.sacudida, 0.1);
  mundo.eventos.push({ tipo: 'chute' });
}

function lanzarVaselinas(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano } = ARMAS.vaselina.niveles[nivel - 1];
  const radio = ARMAS.vaselina.niveles[nivel - 1].radio * area(mundo);
  const visibles = [];
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (!e.muerto && Math.hypot(e.x - j.x, e.y - j.y) < 480) visibles.push(e);
  }
  if (!visibles.length) return;
  mundo.rng.barajar(visibles).slice(0, n).forEach((e, k) => {
    const x = e.x + e.kx * 0.1;
    const y = e.y + e.ky * 0.1;
    const t = 0.6 + k * 0.12;
    mundo.impactos.push({ tipo: 'marca', x, y, radio, vida: t, total: t, color: '#ffd166', vaselina: true, desde: { x: j.x, y: j.y } });
    programarJugador(mundo, t, () => {
      for (let i = 0; i < mundo.enemigos.length; i += 1) {
        const o = mundo.enemigos[i];
        if (o.muerto) continue;
        if (Math.hypot(o.x - x, o.y - y) <= radio + o.r) danar(mundo, o, dano, normalizar(o.x - x, o.y - y), 160, 'disparo');
      }
      mundo.ondas.push({ x, y, radio, vida: 0.3, total: 0.3, familia: 'disparo', nivel });
      mundo.eventos.push({ tipo: 'golpe' });
    });
  });
  mundo.eventos.push({ tipo: 'chute' });
}

function chilena(mundo, nivel) {
  const { dano, perfora, pares } = ARMAS.chilena.niveles[nivel - 1];
  const [dx, dy] = direccionDeAtaque(mundo, 520);
  const base = Math.atan2(dy, dx);
  for (let k = 0; k < pares; k += 1) {
    const a = base + (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.55);
    [a, a + Math.PI].forEach((ang) => nuevoProyectil(mundo, {
      vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430, r: 9, dano, perfora, vida: 1.3, empuje: 220, grande: true,
    }));
  }
  destelloDeDisparo(mundo, [dx, dy]);
  mundo.sacudida = Math.max(mundo.sacudida, 0.06);
  mundo.eventos.push({ tipo: 'cantico' });
}

function rematarDePrimera(mundo, nivel) {
  const { n, dano } = ARMAS.volea.niveles[nivel - 1];
  for (let k = 0; k < n; k += 1) {
    programarJugador(mundo, k * 0.09, () => {
      const j = mundo.jugador;
      const [dx, dy] = direccionDeAtaque(mundo, 520);
      const d = mundo.rng.rango(-0.08, 0.08);
      const c = Math.cos(d);
      const s = Math.sin(d);
      nuevoProyectil(mundo, { x: j.x, y: j.y, vx: (dx * c - dy * s) * 560, vy: (dx * s + dy * c) * 560, r: 5, dano, perfora: 1, vida: 1.0 });
      mundo.eventos.push({ tipo: 'chute' });
    });
  }
}

function lanzarPenalti(mundo, nivel) {
  const j = mundo.jugador;
  const { dano } = ARMAS.penalti.niveles[nivel - 1];
  let objetivo = null;
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto || Math.hypot(e.x - j.x, e.y - j.y) > 540) continue;
    if (!objetivo || e.vida > objetivo.vida) objetivo = e;
  }
  if (!objetivo) return;
  mundo.impactos.push({ tipo: 'linea', x: j.x, y: j.y, x2: objetivo.x, y2: objetivo.y, vida: 0.25, total: 0.25, color: '#fff1b8', nivel });
  mundo.impactos.push({ tipo: 'marca', x: objetivo.x, y: objetivo.y, radio: objetivo.r + 14, vida: 0.25, total: 0.25, color: '#ff5a6e' });
  danar(mundo, objetivo, dano, normalizar(objetivo.x - j.x, objetivo.y - j.y), 200, 'disparo');
  mundo.sacudida = Math.max(mundo.sacudida, 0.14);
  mundo.eventos.push({ tipo: 'cantico' });
}

function regatear(mundo, nivel) {
  const j = mundo.jugador;
  if (j.dash) return;
  const { impulso, invul, dano, empuje } = ARMAS.regate.niveles[nivel - 1];
  // Hacia donde corres; si estás quieto, hacia donde mirabas
  const moviendo = Math.hypot(j.vx, j.vy) > 20;
  const [dx, dy] = moviendo ? normalizar(j.vx, j.vy) : [j.dirX, j.dirY];
  j.dash = { t: 0.26, v: impulso * 1.1, dx, dy, ancho: 34, dano, empuje, tipoDano: 'movil', golpeados: new Set(), color: '#45eeb0', fuente: 'regate' };
  j.invul = Math.max(j.invul, invul);
  mundo.eventos.push({ tipo: 'latigazo' });
}

function hacerUnCano(mundo, nivel) {
  const j = mundo.jugador;
  const { aturde, dano } = ARMAS.cano.niveles[nivel - 1];
  const radio = ARMAS.cano.niveles[nivel - 1].radio * area(mundo);
  let alguno = false;
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto || Math.hypot(e.x - j.x, e.y - j.y) > radio + e.r) continue;
    aturdir(mundo, e, aturde);
    danar(mundo, e, dano, null, 0, 'movil');
    alguno = true;
  }
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.4, total: 0.4, familia: 'movil', nivel });
  if (alguno) mundo.eventos.push({ tipo: 'cantico' });
}

function hacerLaPared(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano } = ARMAS.pared.niveles[nivel - 1];
  const objetivos = masCercanos(mundo, n, 440);
  if (!objetivos.length) return;
  for (let k = 0; k < n; k += 1) {
    const e = objetivos[k % objetivos.length];
    const [dx, dy] = normalizar(e.x - j.x, e.y - j.y);
    const desvio = k >= objetivos.length ? (k - objetivos.length + 1) * 0.3 * (k % 2 ? 1 : -1) : 0;
    const c = Math.cos(desvio);
    const s = Math.sin(desvio);
    const dist = Math.hypot(e.x - j.x, e.y - j.y);
    nuevoProyectil(mundo, {
      vx: (dx * c - dy * s) * 430, vy: (dx * s + dy * c) * 430, r: 9, dano, perfora: 99, sinBono: true, vida: 4, empuje: 90,
      pared: true, tIda: Math.min(0.9, dist / 430 + 0.15), tipoDano: 'movil',
    });
  }
  mundo.eventos.push({ tipo: 'chute' });
}

function arrancarContragolpe(mundo, nivel) {
  const j = mundo.jugador;
  const { dur, vel, dano } = ARMAS.contragolpe.niveles[nivel - 1];
  j.contra = { t: dur, vel, dano };
  mundo.ondas.push({ x: j.x, y: j.y, radio: 60, vida: 0.35, total: 0.35, familia: 'movil', nivel });
  mundo.eventos.push({ tipo: 'cantico' });
}

/** Himno de la Champions: una gran onda alrededor del jugador que daña, empuja y aturde. */
function cantarElHimno(mundo, nivel) {
  const j = mundo.jugador;
  const { dano, aturde } = ARMAS.champions.niveles[nivel - 1];
  const radio = ARMAS.champions.niveles[nivel - 1].radio * area(mundo);
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    const d = Math.hypot(e.x - j.x, e.y - j.y);
    if (d > radio + e.r) continue;
    danar(mundo, e, dano, normalizar(e.x - j.x, e.y - j.y), 300, 'cuerpo');
    aturdir(mundo, e, aturde);
  }
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.6, total: 0.6, color: '#4a86ff', silbato: true, nivel, estrellas: true });
  mundo.ondas.push({ x: j.x, y: j.y, radio: radio * 0.7, vida: 0.45, total: 0.45, color: '#ffffff', nivel });
  mundo.sacudida = Math.max(mundo.sacudida, 0.1);
  mundo.eventos.push({ tipo: 'cantico' });
}

/** Bengalas: caen sobre los rivales y dejan fuego en el suelo. */
function lanzarBengalas(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano, dur } = ARMAS.bengala.niveles[nivel - 1];
  const radio = ARMAS.bengala.niveles[nivel - 1].radio * area(mundo);
  const objetivos = masCercanos(mundo, n + 3, 420);
  for (let k = 0; k < n; k += 1) {
    const e = objetivos.length ? objetivos[(k * 2) % objetivos.length] : null;
    const a = mundo.rng.rango(0, Math.PI * 2);
    const x = e ? e.x : j.x + Math.cos(a) * 160;
    const y = e ? e.y : j.y + Math.sin(a) * 160;
    programarJugador(mundo, 0.25 + 0.12 * k, () => {
      if (mundo.fuegos.length < 14) mundo.fuegos.push({ x, y, radio, dano, t: dur, total: dur, tick: 0, fuente: 'bengala' });
      mundo.ondas.push({ x, y, radio: radio * 1.2, vida: 0.3, total: 0.3, familia: 'fuego', nivel });
    });
    mundo.impactos.push({ tipo: 'marca', x, y, radio: radio * 0.8, vida: 0.25 + 0.12 * k, total: 0.25 + 0.12 * k, color: '#ff7a1a', bengala: true, desde: { x: j.x, y: j.y } });
  }
  mundo.eventos.push({ tipo: 'chute' });
}

// ---------------------------------------------------------------------------------------------
// Habilidades nuevas: carambola, presión alta, la ola, fuera de juego y ruleta.
// Lo que dejan en el campo (olas, líneas, canteranos y giros) vive en `mundo.jugadas`.
// ---------------------------------------------------------------------------------------------

/** Lo que las habilidades nuevas tienen en el campo (se crea la primera vez que hace falta). */
export function jugadas(mundo) {
  if (!mundo.jugadas) mundo.jugadas = { olas: [], lineas: [], canteranos: [], giros: [], angPresion: 0 };
  return mundo.jugadas;
}

const VEL_CARAMBOLA = 470;
const ALCANCE_REBOTE = 300;

/** Gol de carambola: balones que van al rival más cercano y, al tocarlo, rebotan hacia otro. */
function golDeCarambola(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano, rebotes } = ARMAS.carambola.niveles[nivel - 1];
  const objetivos = masCercanos(mundo, n, 480);
  if (!objetivos.length) return;
  for (let k = 0; k < n; k += 1) {
    const e = objetivos[k % objetivos.length];
    let [dx, dy] = normalizar(e.x - j.x, e.y - j.y);
    if (k >= objetivos.length) { // más balones que rivales: salen un poco abiertos
      const d = (k % 2 ? 1 : -1) * 0.35 * Math.ceil(k / 2);
      [dx, dy] = [dx * Math.cos(d) - dy * Math.sin(d), dx * Math.sin(d) + dy * Math.cos(d)];
    }
    nuevoProyectil(mundo, {
      vx: dx * VEL_CARAMBOLA, vy: dy * VEL_CARAMBOLA, r: 7, dano, perfora: rebotes + 1, vida: 1.2, empuje: 140, carambola: true, vistos: 0, rebotes: 0,
    });
  }
  destelloDeDisparo(mundo, normalizar(objetivos[0].x - j.x, objetivos[0].y - j.y));
  mundo.eventos.push({ tipo: 'chute' });
}

/**
 * Tras cada toque, la carambola busca al rival más cercano que aún no ha tocado y va a por él, cada vez
 * un 10 % más fuerte. Los toques los apunta mundo.js al mover los balones; aquí solo se cambia el rumbo.
 */
function rebotarCarambolas(mundo) {
  for (let i = 0; i < mundo.proyectiles.length; i += 1) {
    const p = mundo.proyectiles[i];
    if (!p.carambola || p.muerto || p.golpeados.size === p.vistos) continue;
    p.vistos = p.golpeados.size;
    let siguiente = null;
    let mejor = ALCANCE_REBOTE * ALCANCE_REBOTE;
    mundo.cuadricula.cerca(p.x, p.y, ALCANCE_REBOTE, (e) => {
      if (e.muerto || p.golpeados.has(e.id)) return;
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < mejor) { mejor = d2; siguiente = e; }
    });
    p.dano *= 1.1;
    p.rebotes += 1;
    if (siguiente) {
      const [dx, dy] = normalizar(siguiente.x - p.x, siguiente.y - p.y);
      p.vx = dx * VEL_CARAMBOLA;
      p.vy = dy * VEL_CARAMBOLA;
      p.vida = Math.max(p.vida, 0.8);
    }
    if (mundo.ondas.length < 40) mundo.ondas.push({ x: p.x, y: p.y, radio: 24, vida: 0.2, total: 0.2, familia: 'disparo', nivel: p.nivel, rebote: true });
  }
}

/**
 * Presión alta: los canteranos van en formación a tu alrededor; cuando les toca, sale cada uno a por un rival
 * distinto (el más cercano a ti), le hacen una entrada que golpea alrededor y frena, y vuelven a su sitio.
 */
function actualizarPresion(mundo, nivel, dt) {
  const j = mundo.jugador;
  const estado = jugadas(mundo);
  const lista = estado.canteranos;
  if (nivel <= 0) { lista.length = 0; return; }
  const def = ARMAS.presion.niveles[nivel - 1];
  const A = area(mundo);
  while (lista.length < def.n) lista.push({ x: j.x, y: j.y, estado: 'formacion', cd: 0.4 + 0.3 * lista.length, objetivo: null, t: 0, dirX: 1, golpe: 0 });
  lista.length = def.n;
  estado.angPresion = (estado.angPresion + 0.9 * dt) % TAU;
  const ocupados = new Set(lista.map((c) => c.objetivo).filter(Boolean));
  for (let i = 0; i < lista.length; i += 1) {
    const c = lista[i];
    const a = estado.angPresion + (i * TAU) / lista.length;
    const sx = j.x + Math.cos(a) * 46;
    const sy = j.y + Math.sin(a) * 34;
    c.golpe = Math.max(0, c.golpe - dt);
    if (c.estado === 'formacion') {
      const k = 1 - Math.exp(-12 * dt);
      c.dirX = sx - c.x || c.dirX;
      c.x += (sx - c.x) * k;
      c.y += (sy - c.y) * k;
      c.cd -= dt;
      if (c.cd > 0) continue;
      const objetivo = masCercanos(mundo, lista.length + 2, def.alcance * A).find((e) => !ocupados.has(e));
      if (!objetivo) { c.cd = 0.2; continue; }
      c.estado = 'presion';
      c.objetivo = objetivo;
      c.t = 0.75;
      ocupados.add(objetivo);
    } else if (c.estado === 'presion') {
      const e = c.objetivo;
      c.t -= dt;
      if (!e || e.muerto || c.t <= 0) { c.estado = 'vuelta'; c.objetivo = null; continue; }
      const [dx, dy] = normalizar(e.x - c.x, e.y - c.y);
      c.x += dx * 580 * dt;
      c.y += dy * 580 * dt;
      c.dirX = dx;
      if ((e.x - c.x) ** 2 + (e.y - c.y) ** 2 > (e.r + 14) ** 2) continue;
      // ¡Entrada! Golpea a los que haya alrededor del robo y los frena
      const radio = def.radio * A;
      mundo.cuadricula.cerca(c.x, c.y, radio + 30, (o) => {
        if (o.muerto || (o.x - c.x) ** 2 + (o.y - c.y) ** 2 > (radio + o.r) ** 2) return;
        danar(mundo, o, def.dano, normalizar(o.x - c.x, o.y - c.y), 200, 'cuerpo');
        o.lento = Math.max(o.lento, o.jefe ? 0.4 : 0.8);
      });
      if (mundo.ondas.length < 40) mundo.ondas.push({ x: c.x, y: c.y, radio, vida: 0.22, total: 0.22, familia: 'cuerpo', nivel });
      mundo.eventos.push({ tipo: 'golpe' });
      c.estado = 'vuelta';
      c.objetivo = null;
      c.golpe = 0.25;
    } else { // vuelta a su sitio
      const [dx, dy] = normalizar(sx - c.x, sy - c.y);
      c.x += dx * 470 * dt;
      c.y += dy * 470 * dt;
      c.dirX = dx;
      if ((sx - c.x) ** 2 + (sy - c.y) ** 2 < 16 * 16) {
        c.estado = 'formacion';
        c.cd = recarga(j, def.cd, 'presion');
      }
    }
  }
}

/** La ola: un frente de aficionados que sale de ti (y, a nivel alto, también hacia atrás) y arrastra a los rivales. */
function hacerLaOla(mundo, nivel) {
  const j = mundo.jugador;
  const { largo, dano, empuje, olas } = ARMAS.ola.niveles[nivel - 1];
  const [dx, dy] = direccionDeAtaque(mundo, 500);
  const sentidos = olas >= 2 ? [1, -1] : [1];
  sentidos.forEach((s) => jugadas(mundo).olas.push({
    x0: j.x, y0: j.y, x: j.x, y: j.y, dx: dx * s, dy: dy * s, d: 24, max: 560, vel: 470, largo: largo * area(mundo), dano, empuje, golpeados: new Set(), nivel,
  }));
  mundo.sacudida = Math.max(mundo.sacudida, 0.08);
  mundo.eventos.push({ tipo: 'cantico' });
}

function moverOlas(mundo, dt) {
  const lista = jugadas(mundo).olas;
  mundo.fuente = 'ola';
  for (let i = 0; i < lista.length; i += 1) {
    const o = lista[i];
    o.d += o.vel * dt;
    o.x = o.x0 + o.dx * o.d;
    o.y = o.y0 + o.dy * o.d;
    const medio = o.largo / 2;
    mundo.cuadricula.cerca(o.x, o.y, medio + 30, (e) => {
      if (e.muerto || o.golpeados.has(e.id)) return;
      const rx = e.x - o.x;
      const ry = e.y - o.y;
      if (Math.abs(rx * o.dx + ry * o.dy) > 22 + e.r || Math.abs(ry * o.dx - rx * o.dy) > medio + e.r) return;
      o.golpeados.add(e.id);
      danar(mundo, e, o.dano, [o.dx, o.dy], o.empuje, 'cuerpo');
    });
  }
  mundo.fuente = undefined;
  let k = 0;
  for (let i = 0; i < lista.length; i += 1) if (lista[i].d < lista[i].max) lista[k++] = lista[i];
  lista.length = k;
}

/** Fuera de juego: una línea delante de ti, hacia el rival más cercano; quien la pisa se queda clavado. */
function tirarLaLinea(mundo, nivel) {
  const j = mundo.jugador;
  const { largo, dano, aturde, dur } = ARMAS.fueraDeJuego.niveles[nivel - 1];
  const [dx, dy] = direccionDeAtaque(mundo, 420);
  const lineas = jugadas(mundo).lineas;
  if (lineas.length >= 3) lineas.shift();
  lineas.push({
    x: j.x + dx * 95, y: j.y + dy * 95, nx: dx, ny: dy, largo: largo * area(mundo), dano, aturde, t: dur, total: dur, golpeados: new Set(), cazados: 0, bandera: 0, nivel,
  });
  mundo.eventos.push({ tipo: 'latigazo' });
}

function vigilarLineas(mundo, dt) {
  const lista = jugadas(mundo).lineas;
  mundo.fuente = 'fueraDeJuego';
  for (let i = 0; i < lista.length; i += 1) {
    const l = lista[i];
    l.t -= dt;
    l.bandera = Math.max(0, l.bandera - dt);
    const medio = l.largo / 2;
    mundo.cuadricula.cerca(l.x, l.y, medio + 30, (e) => {
      if (e.muerto || l.golpeados.has(e.id)) return;
      const rx = e.x - l.x;
      const ry = e.y - l.y;
      if (Math.abs(rx * l.nx + ry * l.ny) > e.r + 8 || Math.abs(ry * l.nx - rx * l.ny) > medio) return;
      l.golpeados.add(e.id);
      l.cazados += 1;
      l.bandera = 0.7; // el linier levanta la bandera
      e.fuera = mundo.tiempo + 1.2; // banderín sobre su cabeza (solo se dibuja)
      aturdir(mundo, e, l.aturde);
      danar(mundo, e, l.dano, null, 0, 'cuerpo');
      if (l.cazados === 1) {
        crearTexto(mundo, e.x, e.y - e.r - 16, '¡Fuera de juego!', '#ffe14d');
        mundo.eventos.push({ tipo: 'latigazo' });
      }
    });
  }
  mundo.fuente = undefined;
  let k = 0;
  for (let i = 0; i < lista.length; i += 1) if (lista[i].t > 0) lista[k++] = lista[i];
  lista.length = k;
}

/** Ruleta: giras, apartas a los de alrededor y los balones rivales cercanos salen de vuelta como disparos tuyos. */
function hacerLaRuleta(mundo, nivel) {
  const j = mundo.jugador;
  const { dano, devuelto } = ARMAS.ruleta.niveles[nivel - 1];
  const radio = ARMAS.ruleta.niveles[nivel - 1].radio * area(mundo);
  let accion = false;
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto || (e.x - j.x) ** 2 + (e.y - j.y) ** 2 > (radio + e.r) ** 2) continue;
    // Salen despedidos «de lado», como si los barriera el giro
    const [dx, dy] = normalizar(e.x - j.x, e.y - j.y);
    danar(mundo, e, dano, [dx * 0.8 - dy * 0.6, dy * 0.8 + dx * 0.6], 320, 'movil');
    accion = true;
  }
  const alcance = radio * 1.8;
  for (let i = 0; i < mundo.disparosEnemigos.length; i += 1) {
    const b = mundo.disparosEnemigos[i];
    if (b.vida <= 0 || (b.x - j.x) ** 2 + (b.y - j.y) ** 2 > alcance * alcance) continue;
    b.vida = 0;
    let objetivo = null;
    let mejor = 560 * 560;
    for (let k = 0; k < mundo.enemigos.length; k += 1) {
      const e = mundo.enemigos[k];
      const d2 = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
      if (!e.muerto && d2 < mejor) { mejor = d2; objetivo = e; }
    }
    const [dx, dy] = objetivo ? normalizar(objetivo.x - b.x, objetivo.y - b.y) : normalizar(b.x - j.x, b.y - j.y);
    nuevoProyectil(mundo, {
      x: b.x, y: b.y, vx: dx * 560, vy: dy * 560, r: Math.max(7, Math.min(12, b.r ?? 7)), dano: devuelto, perfora: 3, vida: 1.2, empuje: 220, tipoDano: 'movil', devuelto: true,
    });
    accion = true;
  }
  jugadas(mundo).giros.push({ t: 0.42, total: 0.42, radio, nivel });
  if (mundo.ondas.length < 40) mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.3, total: 0.3, familia: 'movil', nivel });
  if (accion) mundo.eventos.push({ tipo: 'latigazo' });
}

function girarRuletas(mundo, dt) {
  const lista = jugadas(mundo).giros;
  let k = 0;
  for (let i = 0; i < lista.length; i += 1) {
    lista[i].t -= dt;
    if (lista[i].t > 0) lista[k++] = lista[i];
  }
  lista.length = k;
}

/** Fuegos del suelo (bengalas): queman cada 0,4 s a quien los pisa. */
export function actualizarFuegos(mundo, dt) {
  for (let i = 0; i < mundo.fuegos.length; i += 1) {
    const f = mundo.fuegos[i];
    f.t -= dt;
    f.tick -= dt;
    if (f.tick > 0) continue;
    f.tick = 0.4;
    mundo.fuente = f.fuente ?? 'bengala';
    mundo.cuadricula.cerca(f.x, f.y, f.radio + 20, (e) => {
      if (e.muerto || (e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (f.radio + e.r) ** 2) return;
      if (f.pct) golpeUltra(mundo, e, f.dano, f.pct, null, 0, 'cuerpo');
      else danar(mundo, e, f.dano, null, 0, 'cuerpo');
      quemar(mundo, e, f.dano * 0.6, 1.5);
    });
  }
  mundo.fuente = undefined;
}

/** Quemaduras (Botas en llamas y bengalas): un golpe de fuego cada medio segundo mientras dure. */
export function actualizarQuemaduras(mundo, dt) {
  mundo.fuente = 'fuego';
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    const q = e.quemado;
    if (!q || e.muerto) continue;
    q.t -= dt;
    q.tick -= dt;
    if (q.tick <= 0) {
      q.tick += 0.5;
      danoFijo(mundo, e, q.dano);
    }
    if (q.t <= 0) e.quemado = null;
  }
  mundo.fuente = undefined;
}

/** Armas que se disparan cada cierto tiempo (todas menos los banderines y la presión, que van siempre). */
const DISPARADAS = {
  balon: dispararBalones,
  canonazo: dispararCanonazo,
  corner: saqueDeEsquina,
  efecto: balonConEfecto,
  bufanda: golpearConBufanda,
  canticos: cantar,
  silbato: pitar,
  tarjeta: sacarTarjeta,
  var: revisarConVar,
  cabezazo: cabecear,
  entrada: deslizarse,
  barrera: levantarBarrera,
  despeje: despejar,
  vaselina: lanzarVaselinas,
  chilena,
  volea: rematarDePrimera,
  penalti: lanzarPenalti,
  regate: regatear,
  cano: hacerUnCano,
  pared: hacerLaPared,
  contragolpe: arrancarContragolpe,
  champions: cantarElHimno,
  bengala: lanzarBengalas,
  carambola: golDeCarambola,
  ola: hacerLaOla,
  fueraDeJuego: tirarLaLinea,
  ruleta: hacerLaRuleta,
};

/** Avanza los temporizadores de todas las armas del jugador y las dispara cuando toca. */
export function actualizarArmas(mundo, dt) {
  const j = mundo.jugador;
  nuevoPasoDeEfectos(mundo);
  rebotarCarambolas(mundo); // los toques del paso anterior cambian el rumbo de las carambolas
  for (const [clave, disparar] of Object.entries(DISPARADAS)) {
    const arma = j.armas[clave];
    if (arma.nivel <= 0) continue;
    arma.cd -= dt;
    if (arma.cd <= 0) {
      mundo.fuente = clave; // para las estadísticas: el daño que salga de aquí es de esta arma
      disparar(mundo, arma.nivel);
      arma.cd += recarga(j, ARMAS[clave].niveles[arma.nivel - 1].cd, clave);
    }
  }
  mundo.fuente = 'banderines';
  if (j.armas.banderines.nivel > 0) girarBanderines(mundo, j.armas.banderines.nivel, dt);
  else j.banderines.length = 0;
  mundo.fuente = 'presion';
  actualizarPresion(mundo, j.armas.presion.nivel, dt);
  moverOlas(mundo, dt);
  vigilarLineas(mundo, dt);
  girarRuletas(mundo, dt);
  mundo.fuente = undefined;
}
