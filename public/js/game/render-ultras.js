// Dibujo de las ULTRAS (solo pinta: la simulación está en ultras.js). Todo lleva brillos, estelas y colores
// propios para que se note a la primera que has conseguido un poder de leyenda.
import { ULTRAS } from './config.js';
import { posicionesEstrellas } from './ultras.js';

const TAU = Math.PI * 2;

function estrella(ctx, x, y, r, giro, relleno, borde) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = giro + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = relleno;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = borde;
  ctx.stroke();
}

function brillo(ctx, x, y, r, color, alfa) {
  ctx.globalAlpha = alfa * 0.35;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alfa * 0.7;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.35, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// --- Capa del suelo (se dibuja debajo de los muñecos) -------------------------------------

function marcasDeMeteoros(ctx, mundo) {
  for (const m of mundo.ult.meteoros) {
    const k = 1 - m.t / m.total;
    ctx.globalAlpha = 0.25 + 0.5 * k;
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, ULTRAS.balonOro.radio * (0.3 + 0.7 * k), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.12 * k;
    ctx.fillStyle = '#ffd24a';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function cupulaBase(ctx, mundo, t) {
  const d = ULTRAS.zamora;
  const j = mundo.jugador;
  const pulso = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.globalAlpha = 0.1 + 0.05 * pulso;
  ctx.fillStyle = '#8fe3ff';
  ctx.beginPath();
  ctx.arc(j.x, j.y, d.radio, 0, TAU);
  ctx.fill();
  // aro de ladrillos que gira despacio
  ctx.globalAlpha = 0.85;
  const n = 26;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU + t * 0.4;
    const x = j.x + Math.cos(a) * d.radio;
    const y = j.y + Math.sin(a) * d.radio;
    ctx.fillStyle = i % 2 ? '#e8fbff' : '#8fe3ff';
    ctx.fillRect(x - 5, y - 3, 10, 6);
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(j.x, j.y, d.radio - 5, 0, TAU);
  ctx.stroke();
  // muro infranqueable: onda de ladrillos que se aleja
  const z = mundo.ult.zamora;
  if (z.muro > 0) {
    const k = 1 - z.muro / 0.75;
    const rr = d.muroRadio * (0.15 + 0.85 * k);
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 54; i += 1) {
      const a = (i / 54) * TAU;
      ctx.fillStyle = i % 2 ? '#ffffff' : '#8fe3ff';
      ctx.fillRect(j.x + Math.cos(a) * rr - 7, j.y + Math.sin(a) * rr - 4, 14, 8);
    }
  }
  ctx.globalAlpha = 1;
}

/** Todo lo que va pegado al suelo. */
export function dibujarUltrasSuelo(ctx, mundo, t) {
  const j = mundo.jugador;
  if (j.ultras.length === 0 && mundo.ult.cometas.length === 0 && mundo.ult.meteoros.length === 0) return;
  ctx.save();
  marcasDeMeteoros(ctx, mundo);
  if (j.ultras.includes('zamora')) cupulaBase(ctx, mundo, t);
  if (j.ultras.includes('puskas')) { // aura rosa a los pies
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ff5ec8';
    ctx.beginPath();
    ctx.ellipse(j.x, j.y + j.r, 26 + 3 * Math.sin(t * 6), 11, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// --- Capa del aire (encima de todo) ----------------------------------------------------------

function cometas(ctx, mundo, t) {
  for (const c of mundo.ult.cometas) {
    const n = c.rastro.length;
    for (let i = 0; i < n; i += 1) {
      const p = c.rastro[i];
      const f = (i + 1) / n;
      ctx.globalAlpha = f * 0.7;
      ctx.fillStyle = f > 0.6 ? '#ff5ec8' : f > 0.3 ? '#b784ff' : '#5ee6ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, c.r * f * 0.9, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    brillo(ctx, c.x, c.y, c.r * 0.8, '#ff5ec8', 1);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r * 0.7, 0, TAU);
    ctx.fill();
    // chispas que orbitan el cometa
    for (let i = 0; i < 4; i += 1) {
      const a = t * 9 + (i * TAU) / 4;
      ctx.fillStyle = i % 2 ? '#ffd24a' : '#ffffff';
      ctx.fillRect(c.x + Math.cos(a) * c.r * 1.5 - 2, c.y + Math.sin(a) * c.r * 1.2 - 2, 4, 4);
    }
  }
}

function meteoros(ctx, mundo) {
  for (const m of mundo.ult.meteoros) {
    const k = m.t / m.total; // 1 arriba → 0 abajo
    const hx = m.x + 70 * k;
    const hy = m.y - 460 * k;
    const grad = ctx.createLinearGradient(hx + 50 * k, hy - 150 * k, hx, hy);
    grad.addColorStop(0, 'rgba(255,210,74,0)');
    grad.addColorStop(1, 'rgba(255,243,176,0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(hx + 55 * k, hy - 170 * k);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    brillo(ctx, hx, hy, 9, '#ffd24a', 1);
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(hx, hy, 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function estrellasOrbitando(ctx, mundo, t) {
  const st = mundo.ult.estrellas;
  const pos = posicionesEstrellas(mundo);
  const j = mundo.jugador;
  // aro tenue
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#6ea8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(j.x, j.y, ULTRAS.champions.radio, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (const p of pos) {
    for (let i = 4; i >= 1; i -= 1) { // estela
      const a = p.a - i * 0.13;
      const rr = Math.hypot(p.x - j.x, (p.y - j.y) / 0.92);
      ctx.globalAlpha = 0.5 - i * 0.1;
      estrella(ctx, j.x + Math.cos(a) * rr, j.y + Math.sin(a) * rr * 0.92, 11 - i, t * 3, '#6ea8ff', '#6ea8ff');
    }
    ctx.globalAlpha = 1;
    brillo(ctx, p.x, p.y, 10, '#6ea8ff', 0.8);
    estrella(ctx, p.x, p.y, 14, t * 3, '#ffd24a', '#ffffff');
  }
  if (st.nova > 0) { // supernova
    const k = 1 - st.nova / 0.7;
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(j.x, j.y, ULTRAS.champions.supernovaRadio * k, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function rastroMagico(ctx, mundo, t) {
  const j = mundo.jugador;
  const m = mundo.ult.magia;
  if (m.dur <= 0) return;
  // reloj que se vacía alrededor del jugador
  const f = m.dur / ULTRAS.mundial.dur;
  ctx.strokeStyle = '#d6b8ff';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(j.x, j.y, 46, -Math.PI / 2, -Math.PI / 2 + TAU * f);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(j.x + Math.cos(a) * 58 - 1.5, j.y + Math.sin(a) * 58 - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
  // partículas de tiempo detenido
  for (let i = 0; i < 6; i += 1) {
    const a = t * 0.8 + i * 1.7;
    ctx.fillStyle = '#b784ff';
    ctx.fillRect(j.x + Math.cos(a) * (80 + i * 22), j.y + Math.sin(a * 1.3) * (60 + i * 16) - 20, 3, 3);
  }
}

/** Todo lo que vuela o brilla por encima de los muñecos. */
export function dibujarUltrasAire(ctx, mundo, t) {
  const j = mundo.jugador;
  if (j.ultras.length === 0 && mundo.ult.cometas.length === 0 && mundo.ult.meteoros.length === 0) return;
  ctx.save();
  meteoros(ctx, mundo);
  cometas(ctx, mundo, t);
  if (j.ultras.includes('champions')) estrellasOrbitando(ctx, mundo, t);
  if (j.ultras.includes('mundial')) rastroMagico(ctx, mundo, t);
  ctx.restore();
}

// --- Capa de pantalla (no sigue a la cámara) -------------------------------------------------

export function dibujarUltrasPantalla(ctx, mundo, ancho, alto, t) {
  const u = mundo.ult;
  if (u.magia.dur > 0) { // el mundo pierde el color y se vuelve violeta
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = Math.min(0.75, u.magia.dur * 2);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(ancho / 2, alto / 2, Math.min(ancho, alto) * 0.3, ancho / 2, alto / 2, Math.max(ancho, alto) * 0.7);
    g.addColorStop(0, 'rgba(120,80,220,0)');
    g.addColorStop(1, 'rgba(120,80,220,0.38)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.restore();
  }
  if (u.flash > 0 && !mundo.efectosReducidos) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.45, u.flash * 0.9);
    ctx.fillStyle = u.colorFlash;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.restore();
  }
  if (u.anuncio > 0 && u.anuncioClave) {
    const d = ULTRAS[u.anuncioClave];
    const entrada = Math.min(1, (2.6 - u.anuncio) / 0.25);
    const salida = Math.min(1, u.anuncio / 0.5);
    const a = Math.min(entrada, salida);
    const y = alto * 0.26;
    ctx.save();
    ctx.globalAlpha = a * 0.85;
    const banda = ctx.createLinearGradient(0, 0, ancho, 0);
    banda.addColorStop(0, 'rgba(0,0,0,0)');
    banda.addColorStop(0.2, 'rgba(0,0,0,.72)');
    banda.addColorStop(0.8, 'rgba(0,0,0,.72)');
    banda.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = banda;
    ctx.fillRect(0, y - 56, ancho, 124);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = d.color;
    ctx.font = '800 15px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('★  ULTRA CONSEGUIDA  ★', ancho / 2, y - 24);
    const escala = 1 + 0.12 * Math.max(0, 1 - (2.6 - u.anuncio) * 4);
    ctx.font = `800 ${Math.round(Math.min(40, ancho / 14) * escala)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(d.nombre, ancho / 2, y + 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d.nombre, ancho / 2, y + 14);
    ctx.font = '600 15px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = d.color;
    ctx.fillText(d.titulo, ancho / 2, y + 42);
    // destellos
    for (let i = 0; i < 8; i += 1) {
      const px = ancho / 2 + Math.cos(t * 2 + i * 0.8) * (ancho * 0.22 + i * 12);
      ctx.fillStyle = i % 2 ? '#ffffff' : d.color;
      ctx.fillRect(px - 2, y - 40 + ((i * 29 + t * 60) % 90), 4, 4);
    }
    ctx.restore();
  }
}
