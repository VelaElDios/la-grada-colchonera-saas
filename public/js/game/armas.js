// Armas automáticas: el jugador solo se mueve, las armas atacan solas.
import { ARMAS } from './config.js';
import { danar } from './combate.js';
import { normalizar } from './util.js';

const ALCANCE_BALON = 520;

/** Tiempo hasta el siguiente disparo: tiene en cuenta mejoras de recarga y la Furia Roja. */
const recarga = (j, base) => base * j.mult.cd * (j.furia > 0 ? 0.5 : 1);

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
    x: j.x, y: j.y, vx: 0, vy: 0, r: 6, dano: 1, perfora: 1, vida: 1.4, rot: 0, empuje: 120, golpeados: new Set(), ...props,
  });
}

/** Pequeño fogonazo y retroceso al chutar: se ve y se siente más el disparo. */
function destelloDeDisparo(mundo, [dx, dy]) {
  const j = mundo.jugador;
  if (mundo.ondas.length < 40) mundo.ondas.push({ x: j.x + dx * 18, y: j.y + dy * 18, radio: 16, vida: 0.1, total: 0.1 });
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
  const { largo, ancho, dano, ambos } = ARMAS.bufanda.niveles[nivel - 1];
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
  direcciones.forEach((a) => mundo.tajos.push({ x: j.x, y: j.y, ang: a, largo, ancho, vida: 0.2, total: 0.2 }));
  mundo.eventos.push({ tipo: 'latigazo' });
}

function girarBanderines(mundo, nivel, dt) {
  const j = mundo.jugador;
  const { n, radio, dano, vel } = ARMAS.banderines.niveles[nivel - 1];
  j.angBanderines = (j.angBanderines + vel * dt * (j.furia > 0 ? 1.5 : 1)) % (Math.PI * 2);
  j.banderines.length = 0;
  for (let i = 0; i < n; i += 1) {
    const a = j.angBanderines + (i * Math.PI * 2) / n;
    const bx = j.x + Math.cos(a) * radio;
    const by = j.y + Math.sin(a) * radio;
    j.banderines.push({ x: bx, y: by, ang: a });
    mundo.cuadricula.cerca(bx, by, 40, (e) => {
      if (e.muerto || e.cdBanderin > 0) return;
      if ((e.x - bx) ** 2 + (e.y - by) ** 2 > (e.r + 11) ** 2) return;
      e.cdBanderin = 0.45;
      danar(mundo, e, dano, normalizar(e.x - j.x, e.y - j.y), 170, 'cuerpo');
    });
  }
}

function cantar(mundo, nivel) {
  const j = mundo.jugador;
  const { radio, dano, empuje } = ARMAS.canticos.niveles[nivel - 1];
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    const dx = e.x - j.x;
    const dy = e.y - j.y;
    if (Math.hypot(dx, dy) <= radio + e.r) danar(mundo, e, dano, normalizar(dx, dy), empuje, 'cuerpo');
  }
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.45, total: 0.45 });
  mundo.sacudida = Math.max(mundo.sacudida, 0.12);
  mundo.eventos.push({ tipo: 'cantico' });
}

function pitar(mundo, nivel) {
  const j = mundo.jugador;
  const { radio, dano, lento } = ARMAS.silbato.niveles[nivel - 1];
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (e.muerto) continue;
    if (Math.hypot(e.x - j.x, e.y - j.y) > radio + e.r) continue;
    e.lento = Math.max(e.lento, e.jefe ? lento / 2 : lento);
    danar(mundo, e, dano, null, 0, 'cuerpo');
  }
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.5, total: 0.5, silbato: true });
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
    mundo.tarjetas.push({ x: e.x, y: e.y - e.r - 10, vida: 0.7, total: 0.7 });
    danar(mundo, e, dano + porcentaje * e.vidaMax, normalizar(e.x - j.x, e.y - j.y), 120, 'cuerpo');
  });
  if (candidatos.length) mundo.eventos.push({ tipo: 'golpe' });
}

function revisarConVar(mundo, nivel) {
  const j = mundo.jugador;
  const { n, dano, radio } = ARMAS.var.niveles[nivel - 1];
  const visibles = [];
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if (!e.muerto && Math.hypot(e.x - j.x, e.y - j.y) < 520) visibles.push(e);
  }
  if (!visibles.length) return;
  mundo.rng.barajar(visibles).slice(0, n).forEach((objetivo) => {
    mundo.rayos.push({ x: objetivo.x, y: objetivo.y, radio, vida: 0.35, total: 0.35 });
    for (let i = 0; i < mundo.enemigos.length; i += 1) {
      const e = mundo.enemigos[i];
      if (e.muerto) continue;
      if (Math.hypot(e.x - objetivo.x, e.y - objetivo.y) <= radio + e.r) danar(mundo, e, dano, null, 0, 'cuerpo');
    }
  });
  mundo.sacudida = Math.max(mundo.sacudida, 0.1);
  mundo.eventos.push({ tipo: 'cantico' });
}

/** Armas que se disparan cada cierto tiempo (todas menos los banderines, que giran siempre). */
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
};

/** Avanza los temporizadores de todas las armas del jugador y las dispara cuando toca. */
export function actualizarArmas(mundo, dt) {
  const j = mundo.jugador;
  for (const [clave, disparar] of Object.entries(DISPARADAS)) {
    const arma = j.armas[clave];
    if (arma.nivel <= 0) continue;
    arma.cd -= dt;
    if (arma.cd <= 0) {
      disparar(mundo, arma.nivel);
      arma.cd += recarga(j, ARMAS[clave].niveles[arma.nivel - 1].cd);
    }
  }
  if (j.armas.banderines.nivel > 0) girarBanderines(mundo, j.armas.banderines.nivel, dt);
  else j.banderines.length = 0;
}
