// Dibujo del juego en un <canvas> 2D con estética de píxeles (césped, muñecos «chibi» y rivales).
// Solo lee el estado del mundo: no cambia nada de la simulación.
import { obtenerSprite, dibujarSprite, aspectoDe } from './sprites.js';

const ROJO = '#c8102e';
const ROJO_CLARO = '#ff4d63';
const BLANCO = '#ffffff';
const TAM_CELDA = 4; // un «píxel» del césped mide 4 unidades del mundo
const TILE = 64; // el dibujo del césped se repite cada 64×64 celdas

// ---------------------------------------------------------------------------------------------
// Césped de píxeles: un dibujo pequeño que se repite. Una mitad es más clara (franjas de corte).
// ---------------------------------------------------------------------------------------------

const patrones = new WeakMap();

function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function crearPatronCesped(ctx) {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const cx = c.getContext('2d');
  const claros = ['#3f9a3d', '#44a341', '#3b9339'];
  const oscuros = ['#378a36', '#3c9239', '#33812f'];
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const franjaClara = x < TILE / 2;
      const paleta = franjaClara ? claros : oscuros;
      const h = hash(x, y);
      cx.fillStyle = paleta[h < 0.6 ? 0 : h < 0.85 ? 1 : 2];
      cx.fillRect(x, y, 1, 1);
    }
  }
  // Matas de hierba (una «v» de dos píxeles más oscuros) y alguna flor
  for (let i = 0; i < 70; i += 1) {
    const x = Math.floor(hash(i, 91) * (TILE - 2));
    const y = Math.floor(hash(i, 17) * (TILE - 2)) + 1;
    cx.fillStyle = x < TILE / 2 ? '#2b7a2c' : '#276f28';
    cx.fillRect(x, y, 1, 1);
    cx.fillRect(x + 1, y - 1, 1, 1);
    cx.fillRect(x + 2, y, 1, 1);
  }
  for (let i = 0; i < 4; i += 1) {
    const x = Math.floor(hash(i, 5) * TILE);
    const y = Math.floor(hash(i, 6) * TILE);
    cx.fillStyle = i % 2 ? '#fff6a8' : '#ffffff';
    cx.fillRect(x, y, 1, 1);
    cx.fillStyle = i % 2 ? '#f2b84b' : '#f7d6ea';
    cx.fillRect(x, y + 1, 1, 1);
  }
  return ctx.createPattern(c, 'repeat');
}

function dibujarCesped(ctx, cam, ancho, alto, escala) {
  let patron = patrones.get(ctx);
  if (!patron) {
    patron = crearPatronCesped(ctx);
    patrones.set(ctx, patron);
  }
  ctx.imageSmoothingEnabled = false;
  const s = TAM_CELDA * escala;
  patron.setTransform(new DOMMatrix().translate(ancho / 2 - cam.x * escala, alto / 2 - cam.y * escala).scale(s));
  ctx.fillStyle = patron;
  ctx.fillRect(0, 0, ancho, alto);

  // Líneas de campo de píxeles muy tenues cada cierto tramo
  const paso = 1024;
  const visibleX = ancho / escala;
  const visibleY = alto / escala;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  const grosor = Math.max(2, Math.round(TAM_CELDA * escala));
  for (let y = Math.floor((cam.y - visibleY / 2) / paso) * paso; y < cam.y + visibleY / 2 + paso; y += paso) {
    const py = Math.round((y - cam.y) * escala + alto / 2);
    ctx.fillRect(0, py, ancho, grosor);
  }
  for (let x = Math.floor((cam.x - visibleX / 2) / paso) * paso; x < cam.x + visibleX / 2 + paso; x += paso) {
    const px = Math.round((x - cam.x) * escala + ancho / 2);
    ctx.fillRect(px, 0, grosor, alto);
  }
}

// ---------------------------------------------------------------------------------------------
// Objetos del campo
// ---------------------------------------------------------------------------------------------

function sombra(ctx, x, y, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function dibujarGema(ctx, g, t) {
  const pulso = 1 + Math.sin(t * 6 + g.x) * 0.08;
  const u = (g.valor >= 8 ? 3.2 : g.valor >= 5 ? 2.6 : 2.1) * pulso;
  const color = g.valor >= 8 ? '#ffd166' : '#5cc8ff';
  ctx.fillStyle = '#10254a';
  ctx.fillRect(g.x - u * 1.7, g.y - u * 0.7, u * 3.4, u * 1.4);
  ctx.fillRect(g.x - u * 0.7, g.y - u * 1.7, u * 1.4, u * 3.4);
  ctx.fillStyle = color;
  ctx.fillRect(g.x - u * 1.2, g.y - u * 0.5, u * 2.4, u);
  ctx.fillRect(g.x - u * 0.5, g.y - u * 1.2, u, u * 2.4);
  ctx.fillRect(g.x - u * 0.8, g.y - u * 0.8, u * 1.6, u * 1.6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(g.x - u * 0.5, g.y - u * 0.7, u * 0.6, u * 0.6);
}

function dibujarCura(ctx, c, t) {
  const s = 8 + Math.sin(t * 5) * 0.8;
  sombra(ctx, c.x, c.y + 10, 9, 3);
  ctx.fillStyle = '#10254a';
  ctx.fillRect(c.x - s - 2, c.y - s - 2, s * 2 + 4, s * 2 + 4);
  ctx.fillStyle = BLANCO;
  ctx.fillRect(c.x - s, c.y - s, s * 2, s * 2);
  ctx.fillStyle = ROJO;
  ctx.fillRect(c.x - 2.5, c.y - 6, 5, 12);
  ctx.fillRect(c.x - 6, c.y - 2.5, 12, 5);
}

function dibujarBalon(ctx, x, y, r, oscuro = false) {
  const u = r / 3;
  ctx.fillStyle = '#10254a';
  ctx.fillRect(x - r - 1, y - r * 0.6, r * 2 + 2, r * 1.2);
  ctx.fillRect(x - r * 0.6, y - r - 1, r * 1.2, r * 2 + 2);
  ctx.fillStyle = oscuro ? '#ff5b3a' : BLANCO;
  ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2);
  ctx.fillRect(x - r * 0.6, y - r, r * 1.2, r * 2);
  ctx.fillStyle = oscuro ? '#7a1100' : '#222222';
  ctx.fillRect(x - u, y - u, u * 2, u * 2);
}

function dibujarProyectil(ctx, p) {
  if (p.grande) {
    // estela de píxeles
    const l = Math.hypot(p.vx, p.vy) || 1;
    for (let i = 1; i <= 3; i += 1) {
      ctx.globalAlpha = 0.35 / i;
      ctx.fillStyle = '#ffd166';
      const r = p.r * (1 - i * 0.18);
      ctx.fillRect(p.x - (p.vx / l) * i * 9 - r * 0.7, p.y - (p.vy / l) * i * 9 - r * 0.7, r * 1.4, r * 1.4);
    }
    ctx.globalAlpha = 1;
  }
  dibujarBalon(ctx, p.x, p.y, p.r, false);
}

function dibujarBanderin(ctx, b, t) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = '#10254a';
  ctx.fillRect(-2, -10, 4, 20);
  ctx.fillStyle = BLANCO;
  ctx.fillRect(-1, -9, 2, 18);
  const onda = Math.round(Math.sin(t * 12 + b.ang) * 1.5);
  ctx.fillStyle = ROJO;
  ctx.fillRect(1, -9, 6, 3);
  ctx.fillRect(1, -6 + onda, 10, 3);
  ctx.fillRect(1, -3 + onda, 6, 2);
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
  ctx.strokeStyle = o.enemiga ? '#ff3b3b' : o.ulti ? '#ffd166' : o.silbato ? '#8fd8ff' : ROJO_CLARO;
  ctx.lineWidth = (o.ulti ? 12 : 6) * (1 - k) + 2;
  ctx.beginPath();
  ctx.arc(o.x, o.y, o.radio * (0.2 + 0.8 * k), 0, Math.PI * 2);
  ctx.stroke();
  if (o.silbato || o.ulti) {
    ctx.globalAlpha = (1 - k) * 0.12;
    ctx.fillStyle = o.ulti ? '#ffd166' : '#8fd8ff';
    ctx.fill();
  }
  ctx.restore();
}

function dibujarRayo(ctx, r) {
  const k = r.vida / r.total;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2);
  ctx.fillStyle = '#fff7b0';
  ctx.fillRect(r.x - 4, r.y - 420, 8, 420);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(r.x - 2, r.y - 420, 4, 420);
  ctx.globalAlpha = k * 0.5;
  ctx.fillStyle = '#ffe96b';
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dibujarTarjeta(ctx, t) {
  ctx.globalAlpha = Math.min(1, (t.vida / t.total) * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(t.x - 7, t.y - 10, 14, 20);
  ctx.fillStyle = '#e11d2e';
  ctx.fillRect(t.x - 5, t.y - 8, 10, 16);
  ctx.globalAlpha = 1;
}

function dibujarAvisoJefe(ctx, a) {
  const k = 1 - a.vida / a.total;
  ctx.save();
  if (a.tipo === 'pulso') {
    ctx.globalAlpha = 0.18 + 0.25 * k;
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radio * (0.35 + 0.65 * k), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radio, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radio * (0.6 + 0.4 * k), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function dibujarDisparoEnemigo(ctx, d) {
  dibujarBalon(ctx, d.x, d.y, d.r, true);
}

// ---------------------------------------------------------------------------------------------
// Personajes
// ---------------------------------------------------------------------------------------------

function dibujarEnemigo(ctx, e, t) {
  const alto = e.jefe ? e.r * 3.3 : e.r * 3.1;
  const sprite = e.jefe
    ? obtenerSprite(`j:${e.jefe}`, aspectoDe('jefe', e.jefe))
    : obtenerSprite(`r:${e.tipo}:${e.piel}:${e.pelo}`, aspectoDe('rival', e.tipo, e.piel, e.pelo));
  const quieto = e.jefe && e.estado === 'preparar';
  const frame = quieto ? 0 : Math.floor(t * 8 + e.fase) % 2;
  const bote = quieto ? 0 : Math.abs(Math.sin(t * 9 + e.fase)) * 1.5;
  sombra(ctx, e.x, e.y + alto * 0.46, alto * 0.26, alto * 0.07);

  if (e.lento > 0) {
    ctx.fillStyle = 'rgba(143,216,255,.35)';
    ctx.fillRect(e.x - alto * 0.3, e.y + alto * 0.38, alto * 0.6, alto * 0.1);
  }
  dibujarSprite(ctx, sprite, e.x, e.y - bote, alto, frame, (e.mx || 0) < 0, e.flash > 0);

  // Aviso de embestida de Messi: línea roja hacia donde va a salir
  if (quieto) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + e.dirX * 340, e.y + e.dirY * 340);
    ctx.stroke();
    ctx.restore();
  }

  if (e.jefe || (e.vida < e.vidaMax && e.r >= 19)) {
    const w = Math.max(40, e.r * 2.4);
    const y = e.y - alto / 2 - 10;
    ctx.fillStyle = '#10142d';
    ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 7);
    ctx.fillStyle = e.jefe ? '#ffd166' : ROJO_CLARO;
    ctx.fillRect(e.x - w / 2, y, (w * Math.max(0, e.vida)) / e.vidaMax, 5);
  }
}

function dibujarJugador(ctx, j, t) {
  const alto = j.r * 3.2;
  const sprite = obtenerSprite(`p:${j.personaje}`, aspectoDe('personaje', j.personaje));
  const frame = j.moviendo ? Math.floor(t * 10) % 2 : 0;
  const parpadeo = j.invul > 0 && Math.floor(t * 20) % 2 === 0;

  // Aura de las ultis activas
  if (j.furia > 0 || j.animo > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 12);
    ctx.fillStyle = j.furia > 0 ? '#ff4d63' : '#ffd166';
    ctx.beginPath();
    ctx.ellipse(j.x, j.y + alto * 0.44, alto * 0.5, alto * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  sombra(ctx, j.x, j.y + alto * 0.46, alto * 0.27, alto * 0.07);
  if (parpadeo) ctx.globalAlpha = 0.55;
  const bote = j.moviendo ? Math.abs(Math.sin(t * 10)) * 1.5 : 0;
  dibujarSprite(ctx, sprite, j.x, j.y - bote, alto, frame, j.dirX < 0, j.flash > 0);
  ctx.globalAlpha = 1;
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
  ctx.imageSmoothingEnabled = false;

  // Solo se dibuja lo que cae dentro de la pantalla
  const mx = ancho / escala / 2 + 80;
  const my = alto / escala / 2 + 80;
  const visible = (o) => Math.abs(o.x - cam.x) < mx && Math.abs(o.y - cam.y) < my;

  mundo.avisosJefe.forEach((a) => dibujarAvisoJefe(ctx, a));
  mundo.gemas.forEach((g) => visible(g) && dibujarGema(ctx, g, t));
  mundo.curas.forEach((c) => visible(c) && dibujarCura(ctx, c, t));
  mundo.ondas.forEach((o) => dibujarOnda(ctx, o));

  // Los rivales más abajo en pantalla se dibujan delante
  const enemigos = mundo.enemigos.filter(visible).sort((a, b) => a.y - b.y);
  for (const e of enemigos) {
    const dx = j.x - e.x;
    const l = Math.hypot(dx, j.y - e.y) || 1;
    e.mx = dx / l;
    dibujarEnemigo(ctx, e, t);
  }

  if (mundo.estado !== 'fin') dibujarJugador(ctx, j, t);
  mundo.tajos.forEach(dibujarTajo.bind(null, ctx));
  j.banderines.forEach((b) => dibujarBanderin(ctx, b, t));
  mundo.proyectiles.forEach((p) => dibujarProyectil(ctx, p));
  mundo.disparosEnemigos.forEach((d) => dibujarDisparoEnemigo(ctx, d));
  mundo.rayos.forEach((r) => dibujarRayo(ctx, r));
  mundo.tarjetas.forEach((tr) => dibujarTarjeta(ctx, tr));

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
