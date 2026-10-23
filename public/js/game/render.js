// Dibujo del juego en un <canvas> 2D. Solo lee el estado del mundo: no cambia nada de la simulación.
const ROJO = '#c8102e';
const ROJO_CLARO = '#ff4d63';
const BLANCO = '#ffffff';
const CESPED_A = '#143d2c';
const CESPED_B = '#17462f';
const ANCHO_FRANJA = 140;

/** Pinta el césped con franjas de corte verticales (se repite hasta el infinito). */
function dibujarCesped(ctx, cam, ancho, alto, escala) {
  ctx.fillStyle = CESPED_A;
  ctx.fillRect(0, 0, ancho, alto);
  const visibleX = ancho / escala;
  const izquierda = cam.x - visibleX / 2;
  const primera = Math.floor(izquierda / ANCHO_FRANJA);
  ctx.fillStyle = CESPED_B;
  for (let i = primera; i * ANCHO_FRANJA < izquierda + visibleX + ANCHO_FRANJA; i += 1) {
    if (i % 2 !== 0) continue;
    ctx.fillRect((i * ANCHO_FRANJA - cam.x) * escala + ancho / 2, 0, ANCHO_FRANJA * escala, alto);
  }
  // Líneas de campo: una cuadrícula tenue que da sensación de movimiento
  const paso = ANCHO_FRANJA * 4;
  ctx.strokeStyle = 'rgba(255,255,255,.07)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const visibleY = alto / escala;
  const arriba = cam.y - visibleY / 2;
  for (let y = Math.floor(arriba / paso) * paso; y < arriba + visibleY + paso; y += paso) {
    const py = (y - cam.y) * escala + alto / 2;
    ctx.moveTo(0, py);
    ctx.lineTo(ancho, py);
  }
  ctx.stroke();
}

function sombra(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.75, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

function dibujarGema(ctx, g, t) {
  const pulso = 1 + Math.sin(t * 6 + g.x) * 0.08;
  const s = (g.valor >= 8 ? 8 : g.valor >= 5 ? 6.5 : 5) * pulso;
  ctx.fillStyle = g.valor >= 8 ? '#ffd166' : '#5cc8ff';
  ctx.beginPath();
  ctx.moveTo(g.x, g.y - s);
  ctx.lineTo(g.x + s * 0.8, g.y);
  ctx.lineTo(g.x, g.y + s);
  ctx.lineTo(g.x - s * 0.8, g.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function dibujarCura(ctx, c, t) {
  const s = 9 + Math.sin(t * 5) * 1;
  sombra(ctx, c.x, c.y, 9);
  ctx.fillStyle = BLANCO;
  ctx.beginPath();
  ctx.roundRect(c.x - s, c.y - s, s * 2, s * 2, 4);
  ctx.fill();
  ctx.fillStyle = ROJO;
  ctx.fillRect(c.x - 2.5, c.y - 6, 5, 12);
  ctx.fillRect(c.x - 6, c.y - 2.5, 12, 5);
}

function dibujarEnemigo(ctx, e, t) {
  const bote = Math.sin(t * 9 + e.fase) * 1.2;
  const y = e.y + bote;
  sombra(ctx, e.x, y, e.r);
  ctx.fillStyle = e.flash > 0 ? BLANCO : e.color;
  ctx.beginPath();
  ctx.arc(e.x, y, e.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = e.tipo === 'jefe' ? 4 : 2;
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.stroke();

  if (e.flash <= 0) {
    // Detalle de la camiseta: banda horizontal
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(e.x - e.r * 0.8, y - e.r * 0.15, e.r * 1.6, e.r * 0.3);
  }
  // Ojos que miran hacia el jugador (se pasan en `e.mx`, `e.my` si existen)
  const ojo = e.r * 0.28;
  ctx.fillStyle = BLANCO;
  ctx.beginPath();
  ctx.arc(e.x - ojo, y - e.r * 0.35, e.r * 0.2, 0, Math.PI * 2);
  ctx.arc(e.x + ojo, y - e.r * 0.35, e.r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10142d';
  ctx.beginPath();
  ctx.arc(e.x - ojo + (e.mx || 0) * 1.5, y - e.r * 0.35 + (e.my || 0) * 1.5, e.r * 0.1, 0, Math.PI * 2);
  ctx.arc(e.x + ojo + (e.mx || 0) * 1.5, y - e.r * 0.35 + (e.my || 0) * 1.5, e.r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  if (e.tipo === 'jefe' || (e.vida < e.vidaMax && e.tipo === 'central')) {
    const w = e.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(e.x - w / 2, y - e.r - 12, w, 5);
    ctx.fillStyle = ROJO_CLARO;
    ctx.fillRect(e.x - w / 2, y - e.r - 12, (w * Math.max(0, e.vida)) / e.vidaMax, 5);
  }
}

function dibujarJugador(ctx, j, t) {
  const parpadeo = j.invul > 0 && Math.floor(t * 20) % 2 === 0;
  sombra(ctx, j.x, j.y, j.r);
  ctx.save();
  ctx.translate(j.x, j.y);
  if (parpadeo) ctx.globalAlpha = 0.55;
  // Camiseta de rayas rojiblancas
  ctx.beginPath();
  ctx.arc(0, 0, j.r, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = j.flash > 0 ? '#ffd9de' : BLANCO;
  ctx.fillRect(-j.r, -j.r, j.r * 2, j.r * 2);
  ctx.fillStyle = ROJO;
  const franja = j.r / 2.6;
  for (let i = -3; i <= 3; i += 2) ctx.fillRect(i * franja - franja / 2, -j.r, franja, j.r * 2);
  ctx.restore();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1b2a5c';
  ctx.beginPath();
  ctx.arc(0, 0, j.r, 0, Math.PI * 2);
  ctx.stroke();
  // Cabeza (vista desde arriba) y flequillo que apunta hacia donde mira
  ctx.fillStyle = '#f2c6a0';
  ctx.beginPath();
  ctx.arc(j.dirX * 3, j.dirY * 3, j.r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a1d';
  ctx.beginPath();
  ctx.arc(j.dirX * 1.5, j.dirY * 1.5, j.r * 0.5, Math.atan2(j.dirY, j.dirX) + Math.PI * 0.55, Math.atan2(j.dirY, j.dirX) + Math.PI * 1.45);
  ctx.fill();
  ctx.restore();
}

function dibujarProyectil(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = BLANCO;
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    const px = Math.cos(a) * p.r * 0.55;
    const py = Math.sin(a) * p.r * 0.55;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dibujarBanderin(ctx, b, t) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.strokeStyle = BLANCO;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.lineTo(0, -9);
  ctx.stroke();
  ctx.fillStyle = ROJO;
  ctx.beginPath();
  const onda = Math.sin(t * 12 + b.ang) * 1.5;
  ctx.moveTo(0, -9);
  ctx.lineTo(11, -5 + onda);
  ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dibujarTajo(ctx, tj) {
  const k = tj.vida / tj.total;
  ctx.save();
  ctx.translate(tj.x, tj.y);
  ctx.rotate(tj.ang);
  ctx.globalAlpha = Math.min(1, k * 1.6);
  const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, tj.largo);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.7, 'rgba(255,255,255,.85)');
  grad.addColorStop(1, 'rgba(200,16,46,.9)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, tj.largo, -tj.ancho, tj.ancho);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dibujarOnda(ctx, o) {
  const k = 1 - o.vida / o.total;
  ctx.save();
  ctx.globalAlpha = (1 - k) * 0.9;
  ctx.strokeStyle = ROJO_CLARO;
  ctx.lineWidth = 6 * (1 - k) + 1;
  ctx.beginPath();
  ctx.arc(o.x, o.y, o.radio * (0.2 + 0.8 * k), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja un fotograma completo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} mundo
 * @param {{ ancho: number, alto: number, escala: number }} vista Tamaño del canvas (en píxeles CSS) y zoom
 */
export function dibujar(ctx, mundo, vista) {
  const { ancho, alto, escala } = vista;
  const j = mundo.jugador;
  const t = mundo.tiempo;

  let tremorX = 0;
  let tremorY = 0;
  if (mundo.sacudida > 0) {
    tremorX = (Math.random() - 0.5) * mundo.sacudida * 26;
    tremorY = (Math.random() - 0.5) * mundo.sacudida * 26;
  }
  const cam = { x: j.x + tremorX, y: j.y + tremorY };

  dibujarCesped(ctx, cam, ancho, alto, escala);

  ctx.save();
  ctx.translate(ancho / 2, alto / 2);
  ctx.scale(escala, escala);
  ctx.translate(-cam.x, -cam.y);

  // Solo se dibuja lo que cae dentro de la pantalla
  const mx = ancho / escala / 2 + 60;
  const my = alto / escala / 2 + 60;
  const visible = (o) => Math.abs(o.x - cam.x) < mx && Math.abs(o.y - cam.y) < my;

  mundo.gemas.forEach((g) => visible(g) && dibujarGema(ctx, g, t));
  mundo.curas.forEach((c) => visible(c) && dibujarCura(ctx, c, t));
  mundo.ondas.forEach((o) => dibujarOnda(ctx, o));

  // Los enemigos más abajo en pantalla se dibujan delante
  const enemigos = mundo.enemigos.filter(visible).sort((a, b) => a.y - b.y);
  for (const e of enemigos) {
    const dx = j.x - e.x;
    const dy = j.y - e.y;
    const l = Math.hypot(dx, dy) || 1;
    e.mx = dx / l;
    e.my = dy / l;
    dibujarEnemigo(ctx, e, t);
  }

  if (mundo.estado !== 'fin') dibujarJugador(ctx, j, t);
  mundo.tajos.forEach(dibujarTajo.bind(null, ctx));
  j.banderines.forEach((b) => dibujarBanderin(ctx, b, t));
  mundo.proyectiles.forEach((p) => dibujarProyectil(ctx, p));

  mundo.particulas.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.vida / p.total);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  });
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
  mundo.textos.forEach((tx) => {
    ctx.globalAlpha = Math.min(1, (tx.vida / tx.total) * 1.5);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(tx.texto, tx.x, tx.y);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.texto, tx.x, tx.y);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}
