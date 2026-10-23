// Armas automáticas: el jugador solo se mueve, las armas atacan solas.
import { ARMAS } from './config.js';
import { danar } from './combate.js';
import { normalizar } from './util.js';

const ALCANCE_BALON = 520;

/** Los `n` enemigos más cercanos al jugador dentro de `alcance`. */
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
    mundo.proyectiles.push({
      x: j.x, y: j.y, vx: dx * 380, vy: dy * 380, r: 6, dano, perfora, vida: 1.4, rot: 0, golpeados: new Set(),
    });
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
    if (dentro) danar(mundo, e, dano, normalizar(dx, dy), 90);
  }
  direcciones.forEach((a) => mundo.tajos.push({ x: j.x, y: j.y, ang: a, largo, ancho, vida: 0.2, total: 0.2 }));
  mundo.eventos.push({ tipo: 'latigazo' });
}

function girarBanderines(mundo, nivel, dt) {
  const j = mundo.jugador;
  const { n, radio, dano, vel } = ARMAS.banderines.niveles[nivel - 1];
  j.angBanderines = (j.angBanderines + vel * dt) % (Math.PI * 2);
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
      danar(mundo, e, dano, normalizar(e.x - j.x, e.y - j.y), 170);
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
    if (Math.hypot(dx, dy) <= radio + e.r) danar(mundo, e, dano, normalizar(dx, dy), empuje);
  }
  mundo.ondas.push({ x: j.x, y: j.y, radio, vida: 0.45, total: 0.45 });
  mundo.sacudida = Math.max(mundo.sacudida, 0.12);
  mundo.eventos.push({ tipo: 'cantico' });
}

/** Avanza los temporizadores de todas las armas del jugador y las dispara cuando toca. */
export function actualizarArmas(mundo, dt) {
  const { armas } = mundo.jugador;

  if (armas.balon.nivel > 0) {
    armas.balon.cd -= dt;
    if (armas.balon.cd <= 0) {
      dispararBalones(mundo, armas.balon.nivel);
      armas.balon.cd += ARMAS.balon.niveles[armas.balon.nivel - 1].cd;
    }
  }
  if (armas.bufanda.nivel > 0) {
    armas.bufanda.cd -= dt;
    if (armas.bufanda.cd <= 0) {
      golpearConBufanda(mundo, armas.bufanda.nivel);
      armas.bufanda.cd += ARMAS.bufanda.niveles[armas.bufanda.nivel - 1].cd;
    }
  }
  if (armas.banderines.nivel > 0) {
    girarBanderines(mundo, armas.banderines.nivel, dt);
  } else {
    mundo.jugador.banderines.length = 0;
  }
  if (armas.canticos.nivel > 0) {
    armas.canticos.cd -= dt;
    if (armas.canticos.cd <= 0) {
      cantar(mundo, armas.canticos.nivel);
      armas.canticos.cd += ARMAS.canticos.niveles[armas.canticos.nivel - 1].cd;
    }
  }
}
