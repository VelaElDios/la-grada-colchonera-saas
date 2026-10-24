// Dibujo del juego en un <canvas> 2D con estética de píxeles (césped, muñecos «chibi» y rivales).
// Solo lee el estado del mundo: no cambia nada de la simulación.
import { obtenerSprite, dibujarSprite, aspectoDe } from './sprites.js';
import { visibles as terrenoVisible } from './terreno.js';
import { CAMARA } from './config.js';

// ---------------------------------------------------------------------------------------------
// Cámara 3/4: el suelo se aplasta en vertical (como si lo vieras desde arriba y de lado) y los
// muñecos, objetos y textos se dibujan «de pie» sobre él. Lo que está más arriba se ve algo más pequeño.
// ---------------------------------------------------------------------------------------------
const INC = CAMARA.inclinacion;
let profCamY = 0; // y del mundo en el centro de la pantalla
let profMitad = 400; // mitad del alto visible, en unidades del mundo

/** Dibuja `fn` de pie sobre el punto (x, y) del suelo, con la escala de profundidad. */
function recto(ctx, x, y, fn, ancla = 0) {
  const d = Math.max(-1, Math.min(1, (y - profCamY) / profMitad));
  const f = 1 + CAMARA.profundidad * d;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f, f / INC);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

/** Estira o aplasta lo que dibuja `fn` tomando como punto fijo los pies (x, yPies) y lo inclina `giro` rad. */
function deformar(ctx, x, yPies, sx, sy, giro, fn) {
  ctx.save();
  ctx.translate(x, yPies);
  if (giro) ctx.rotate(giro);
  ctx.scale(sx, sy);
  ctx.translate(-x, -yPies);
  fn();
  ctx.restore();
}

/** Mueve la cámara con suavidad hacia el jugador, mirando un poco hacia donde corre. */
export function actualizarCamara(mundo, dt) {
  const j = mundo.jugador;
  const k = CAMARA.adelanto / 190;
  const tx = j.x + (j.vx || 0) * k;
  const ty = j.y + (j.vy || 0) * k;
  if (!mundo.camara) mundo.camara = { x: j.x, y: j.y };
  const a = 1 - Math.exp(-CAMARA.suavizado * Math.max(0, Math.min(0.1, dt)));
  mundo.camara.x += (tx - mundo.camara.x) * a;
  mundo.camara.y += (ty - mundo.camara.y) * a;
}

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
  patron.setTransform(new DOMMatrix().translate(ancho / 2 - cam.x * escala, alto / 2 - cam.y * escala * INC).scale(s, s * INC));
  ctx.fillStyle = patron;
  ctx.fillRect(0, 0, ancho, alto);

  // Líneas de campo de píxeles muy tenues cada cierto tramo
  const paso = 1024;
  const visibleX = ancho / escala;
  const visibleY = alto / (escala * INC);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  const grosor = Math.max(2, Math.round(TAM_CELDA * escala));
  for (let y = Math.floor((cam.y - visibleY / 2) / paso) * paso; y < cam.y + visibleY / 2 + paso; y += paso) {
    const py = Math.round((y - cam.y) * escala * INC + alto / 2);
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

/** Estela de cuadraditos detrás de un balón, tanto más larga cuanto más rápido va. */
function estela(ctx, p, color, n) {
  const v = Math.hypot(p.vx, p.vy) || 1;
  const largo = Math.min(14, 5 + v / 90);
  for (let i = 1; i <= n; i += 1) {
    ctx.globalAlpha = 0.4 / i;
    ctx.fillStyle = color;
    const r = p.r * (1 - i * 0.16);
    ctx.fillRect(p.x - (p.vx / v) * i * largo - r * 0.7, p.y - (p.vy / v) * i * largo - r * 0.7, r * 1.4, r * 1.4);
  }
  ctx.globalAlpha = 1;
}

function dibujarProyectil(ctx, p) {
  sombra(ctx, p.x, p.y + p.r * 1.6, p.r * 0.9, p.r * 0.3);
  recto(ctx, p.x, p.y, () => {
    estela(ctx, p, p.grande ? '#ffd166' : '#ffffff', p.grande ? 4 : 3);
    dibujarBalon(ctx, p.x, p.y, p.r, false);
  });
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
  } else if (a.tipo === 'impacto') {
    ctx.globalAlpha = 0.16 + 0.3 * k;
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radio * (0.3 + 0.7 * k), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
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
  sombra(ctx, d.x, d.y + d.r * 1.6, d.r * 0.9, d.r * 0.3);
  recto(ctx, d.x, d.y, () => {
    estela(ctx, d, '#ff5b3a', 3);
    dibujarBalon(ctx, d.x, d.y, d.r, true);
  });
}


// ---------------------------------------------------------------------------------------------
// Terreno: zonas de barro y de lluvia, y gradas (se dibujan una vez y se reutilizan)
// ---------------------------------------------------------------------------------------------

const cacheTerreno = new Map();
const lienzoPx = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

function guardar(clave, lienzo) {
  if (cacheTerreno.size > 160) cacheTerreno.delete(cacheTerreno.keys().next().value);
  cacheTerreno.set(clave, lienzo);
  return lienzo;
}

function spriteZona(z) {
  const clave = `z:${z.id}:${z.tipo}`;
  const hecho = cacheTerreno.get(clave);
  if (hecho) return hecho;
  const px = Math.ceil((z.r * 2) / TAM_CELDA) + 2;
  const c = lienzoPx(px, px);
  const cx = c.getContext('2d');
  const mid = px / 2;
  const barro = z.tipo === 'barro';
  const semilla = Math.floor(z.x + z.y);
  const paleta = barro ? ['#6e4b2a', '#5f4023', '#7a5532', '#523619'] : ['#3a78a8', '#4688b8', '#3270a0', '#4d92c4'];
  for (let y = 0; y < px; y += 1) {
    for (let x = 0; x < px; x += 1) {
      const dx = x + 0.5 - mid;
      const dy = y + 0.5 - mid;
      const d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      // borde irregular: el radio varía con el ángulo y con un poco de ruido
      const limite = (mid - 1) * (0.88 + 0.08 * Math.sin(ang * 5 + semilla) + 0.04 * Math.sin(ang * 11 - semilla)) - hash(x + semilla, y) * 1.5;
      if (d > limite) continue;
      const h = hash(x * 3 + semilla, y * 7);
      cx.globalAlpha = barro ? 0.92 : 0.55;
      cx.fillStyle = d > limite - 1.6 ? (barro ? '#8a6439' : '#79b4dc') : paleta[Math.floor(h * paleta.length)];
      cx.fillRect(x, y, 1, 1);
    }
  }
  // Detalles: burbujas y brillos en el barro, reflejos en los charcos
  cx.globalAlpha = 1;
  for (let i = 0; i < Math.floor(px * 0.7); i += 1) {
    const x = Math.floor(hash(i, semilla) * px);
    const y = Math.floor(hash(semilla, i * 5) * px);
    if (Math.hypot(x - mid, y - mid) > mid * 0.78) continue;
    cx.fillStyle = barro ? (i % 2 ? '#3d2812' : '#9b7345') : '#cfe9ff';
    cx.fillRect(x, y, barro ? 2 : 1, 1);
  }
  return guardar(clave, c);
}

function dibujarZona(ctx, z, t) {
  const c = spriteZona(z);
  const lado = c.width * TAM_CELDA;
  ctx.drawImage(c, z.x - lado / 2, z.y - lado / 2, lado, lado);
  if (z.tipo === 'lluvia') {
    // Gotas que caen y ondas en los charcos
    const base = Math.floor(z.x);
    ctx.fillStyle = 'rgba(200,230,255,.75)';
    for (let i = 0; i < 16; i += 1) {
      const gx = z.x + (hash(i, base) * 2 - 1) * z.r * 0.85;
      const recorrido = (t * 220 + hash(i, base + 3) * 300) % 300;
      const gy = z.y + (hash(i, base + 9) * 2 - 1) * z.r * 0.6 - 150 + recorrido;
      if (Math.hypot(gx - z.x, gy - z.y) < z.r * 0.92) ctx.fillRect(Math.round(gx), Math.round(gy), 2, 7);
    }
    ctx.strokeStyle = 'rgba(220,240,255,.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const fase = (t * 0.9 + hash(i, base + 1)) % 1;
      const ox = (hash(i, base + 21) * 2 - 1) * z.r * 0.6;
      const oy = (hash(i, base + 31) * 2 - 1) * z.r * 0.6;
      ctx.globalAlpha = 1 - fase;
      ctx.beginPath();
      ctx.ellipse(z.x + ox, z.y + oy, 4 + fase * 16, 2 + fase * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function spriteGrada(g) {
  const clave = `g:${g.id}`;
  const hecho = cacheTerreno.get(clave);
  if (hecho) return hecho;
  const pw = Math.max(8, Math.round(g.w / TAM_CELDA));
  const ph = Math.max(8, Math.round(g.h / TAM_CELDA));
  const c = lienzoPx(pw, ph);
  const cx = c.getContext('2d');
  const CONTORNO = '#14102a';
  cx.fillStyle = CONTORNO;
  cx.fillRect(0, 0, pw, ph);
  // Tejadillo claro arriba y muro con bufandas rojiblancas abajo
  cx.fillStyle = '#c9ced9';
  cx.fillRect(1, 1, pw - 2, 2);
  cx.fillStyle = '#8f95aa';
  cx.fillRect(1, 3, pw - 2, 1);
  cx.fillStyle = '#4a4f6b';
  cx.fillRect(1, ph - 5, pw - 2, 4);
  for (let x = 1; x < pw - 1; x += 1) {
    cx.fillStyle = Math.floor(x / 2) % 2 ? '#ffffff' : '#c8102e';
    cx.fillRect(x, ph - 4, 1, 2);
  }
  // Filas de aficionados: cabeza (1 px) y camiseta (2 px) en bloques de 3 px
  const camisetas = ['#c8102e', '#ffffff', '#a50f28', '#e8e8f0', '#c8102e', '#1b2a5c'];
  const pieles = ['#f2c6a0', '#e0ac84', '#c68642', '#8d5524'];
  for (let y = 4; y + 3 <= ph - 5; y += 4) {
    cx.fillStyle = '#272c4a';
    cx.fillRect(1, y + 3, pw - 2, 1); // escalón
    for (let x = 1; x + 3 <= pw - 1; x += 3) {
      const a = hash(x + g.semilla, y);
      if (a < 0.12) continue; // asiento vacío
      cx.fillStyle = pieles[Math.floor(hash(x, y + g.semilla) * pieles.length)];
      cx.fillRect(x + 1, y, 1, 1);
      cx.fillStyle = camisetas[Math.floor(a * camisetas.length)];
      cx.fillRect(x, y + 1, 3, 2);
    }
  }
  return guardar(clave, c);
}

function dibujarGrada(ctx, g) {
  const c = spriteGrada(g);
  sombra(ctx, g.x, g.y + g.h / 2 - 2, g.w * 0.5, 7);
  ctx.drawImage(c, g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
}

// Premios del campo
const COLOR_PREMIO = { cura: '#4ade80', xp: '#5cc8ff', energia: '#ffd166', iman: '#ff7b8b' };

function dibujarPremio(ctx, p, t) {
  sombra(ctx, p.x, p.y + 14, 11, 3.5);
  recto(ctx, p.x, p.y + 14, () => dibujarPremioRecto(ctx, p, t));
}

function dibujarPremioRecto(ctx, p, t) {
  const bote = Math.sin(t * 4 + p.x) * 3;
  const y = p.y + bote;
  ctx.globalAlpha = 0.22 + 0.1 * Math.sin(t * 6 + p.y);
  ctx.fillStyle = COLOR_PREMIO[p.tipo];
  ctx.beginPath();
  ctx.arc(p.x, y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (p.tipo === 'cura') {
    dibujarCura(ctx, { x: p.x, y }, t);
  } else if (p.tipo === 'xp') {
    ctx.fillStyle = '#5a3d00';
    ctx.fillRect(p.x - 11, y - 11, 22, 22);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(p.x - 9, y - 9, 18, 18);
    ctx.fillRect(p.x - 12, y - 4, 24, 8);
    ctx.fillRect(p.x - 4, y - 12, 8, 24);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(p.x - 6, y - 7, 6, 5);
    ctx.fillStyle = '#b57a00';
    ctx.fillRect(p.x - 3, y + 1, 6, 6);
  } else if (p.tipo === 'energia') {
    ctx.fillStyle = '#4a2c00';
    ctx.fillRect(p.x - 9, y - 14, 18, 28);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(p.x - 3, y - 13, 10, 8);
    ctx.fillRect(p.x - 6, y - 6, 12, 6);
    ctx.fillRect(p.x - 7, y - 1, 10, 7);
    ctx.fillRect(p.x - 4, y + 5, 8, 8);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(p.x - 1, y - 12, 4, 4);
  } else {
    ctx.fillStyle = '#10254a';
    ctx.fillRect(p.x - 12, y - 12, 24, 24);
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(p.x - 10, y - 10, 7, 20);
    ctx.fillRect(p.x + 3, y - 10, 7, 20);
    ctx.fillRect(p.x - 10, y + 3, 20, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x - 10, y - 10, 7, 5);
    ctx.fillRect(p.x + 3, y - 10, 7, 5);
  }
}

/** Flechas en el borde de la pantalla que señalan los premios que quedan fuera de vista. */
function dibujarFlechasPremios(ctx, mundo, cam, ancho, alto, escala, t) {
  const m = 26;
  mundo.premios.forEach((p) => {
    const sx = ancho / 2 + (p.x - cam.x) * escala;
    const sy = alto / 2 + (p.y - cam.y) * escala * INC;
    if (sx > 0 && sx < ancho && sy > 0 && sy < alto) return;
    const dx = sx - ancho / 2;
    const dy = sy - alto / 2;
    const k = Math.min((ancho / 2 - m) / Math.abs(dx || 1e-6), (alto / 2 - m) / Math.abs(dy || 1e-6));
    const x = ancho / 2 + dx * k;
    const y = alto / 2 + dy * k;
    const ang = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(ang);
    ctx.globalAlpha = 0.65 + 0.3 * Math.sin(t * 6);
    ctx.fillStyle = '#10142d';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-9, -11);
    ctx.lineTo(-9, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLOR_PREMIO[p.tipo];
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

let mojado = 0; // 0..1: cuánto se nota la lluvia en pantalla (se suaviza al entrar y salir)
let embarrado = 0;

/** Efectos de pantalla de la zona que pisas: gotas por toda la pantalla y tono marrón en el barro. */
function dibujarAmbiente(ctx, j, ancho, alto, t) {
  mojado += ((j.zona === 'lluvia' ? 1 : 0) - mojado) * 0.08;
  embarrado += ((j.zona === 'barro' ? 1 : 0) - embarrado) * 0.08;
  if (mojado > 0.02) {
    ctx.fillStyle = `rgba(30,70,120,${0.16 * mojado})`;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.strokeStyle = `rgba(200,230,255,${0.5 * mojado})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 70; i += 1) {
      const x = (hash(i, 11) * (ancho + 80) - t * 90) % (ancho + 80);
      const y = (hash(i, 12) * (alto + 60) + t * 760) % (alto + 60) - 30;
      const px = x < 0 ? x + ancho + 80 : x;
      ctx.moveTo(Math.round(px), Math.round(y));
      ctx.lineTo(Math.round(px - 3), Math.round(y + 14));
    }
    ctx.stroke();
  }
  if (embarrado > 0.02) {
    ctx.fillStyle = `rgba(90,56,22,${0.14 * embarrado})`;
    ctx.fillRect(0, 0, ancho, alto);
  }
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
  const frame = quieto ? 0 : Math.floor(t * 8 + e.anim) % 2;
  const bote = quieto ? 0 : Math.abs(Math.sin(t * 9 + e.anim)) * 1.5;
  const altura = (e.altura || 0) * 70;
  sombra(ctx, e.x, e.y + alto * 0.46, alto * 0.26 * (1 - altura / 160), alto * 0.07);

  if (e.lento > 0) {
    ctx.fillStyle = 'rgba(143,216,255,.35)';
    ctx.fillRect(e.x - alto * 0.3, e.y + alto * 0.38, alto * 0.6, alto * 0.1);
  }
  // Aviso de embestida (Messi, el autobús de Mourinho): línea roja en el suelo hacia donde va a salir
  if (quieto) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + e.dirX * (e.largoAviso || 340), e.y + e.dirY * (e.largoAviso || 340));
    ctx.stroke();
    ctx.restore();
  }
  recto(ctx, e.x, e.y + alto * 0.46, () => dibujarEnemigoRecto(ctx, e, t, sprite, alto, frame, bote, altura, quieto));
}

function dibujarEnemigoRecto(ctx, e, t, sprite, alto, frame, bote, altura, quieto) {
  // Al recibir un golpe se aplasta un instante; al correr se inclina hacia delante
  const golpe = Math.min(1, (e.flash || 0) / 0.1);
  const corre = quieto ? 0 : Math.sin(t * 9 + e.anim) * 0.04;
  const inclina = quieto ? 0 : (e.mx || 0) * -0.05 + corre;
  const pies = e.y + alto * 0.46 - altura;
  deformar(ctx, e.x, pies, 1 + 0.18 * golpe, 1 - 0.16 * golpe, inclina, () => {
    dibujarSprite(ctx, sprite, e.x, e.y - bote - altura, alto, frame, (e.mx || 0) < 0, e.flash > 0);
  });

  // Rival normal que va a embestir: se agacha y aparece un «!»
  if (e.aviso > 0) {
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(e.x - 2, e.y - alto / 2 - 16, 4, 9);
    ctx.fillRect(e.x - 2, e.y - alto / 2 - 5, 4, 4);
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
  recto(ctx, j.x, j.y + alto * 0.46, () => {
    if (parpadeo) ctx.globalAlpha = 0.55;
    const vel = Math.hypot(j.vx || 0, j.vy || 0);
    const rapido = Math.min(1, vel / 190);
    const bote = j.moviendo ? Math.abs(Math.sin(t * 10)) * (1.5 + 2 * rapido) : Math.sin(t * 2.5) * 0.6;
    // Se inclina hacia donde corre, se estira al acelerar y se aplasta al recibir un golpe
    const giro = Math.max(-1, Math.min(1, (j.vx || 0) / 190)) * 0.14;
    const golpe = Math.min(1, (j.flash || 0) / 0.12);
    const sy = 1 + 0.06 * rapido - 0.14 * golpe;
    const sx = 1 - 0.04 * rapido + 0.16 * golpe;
    deformar(ctx, j.x, j.y + alto * 0.46, sx, sy, giro, () => {
      dibujarSprite(ctx, sprite, j.x, j.y - bote, alto, frame, j.dirX < 0, j.flash > 0);
    });
    ctx.globalAlpha = 1;
  });
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
  if (!mundo.camara) mundo.camara = { x: j.x, y: j.y };
  const cam = { x: mundo.camara.x + tremorX, y: mundo.camara.y + tremorY };
  profCamY = cam.y;
  profMitad = alto / escala / INC / 2;

  dibujarCesped(ctx, cam, ancho, alto, escala);

  ctx.save();
  ctx.translate(ancho / 2, alto / 2);
  ctx.scale(escala, escala * INC);
  ctx.translate(-cam.x, -cam.y);
  ctx.imageSmoothingEnabled = false;

  // Solo se dibuja lo que cae dentro de la pantalla
  const mx = ancho / escala / 2 + 80;
  const my = alto / (escala * INC) / 2 + 80;
  const visible = (o) => Math.abs(o.x - cam.x) < mx && Math.abs(o.y - cam.y) < my;

  const area = terrenoVisible(mundo.terreno, cam.x - mx, cam.y - my, cam.x + mx, cam.y + my);
  area.zonas.forEach((z) => dibujarZona(ctx, z, t));
  area.gradas.forEach((g) => dibujarGrada(ctx, g));

  mundo.avisosJefe.forEach((a) => dibujarAvisoJefe(ctx, a));
  mundo.premios.forEach((p) => visible(p) && dibujarPremio(ctx, p, t));
  mundo.gemas.forEach((g) => visible(g) && recto(ctx, g.x, g.y, () => dibujarGema(ctx, g, t)));
  mundo.curas.forEach((c) => visible(c) && recto(ctx, c.x, c.y, () => dibujarCura(ctx, c, t)));
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
  j.banderines.forEach((b) => recto(ctx, b.x, b.y, () => dibujarBanderin(ctx, b, t)));
  mundo.proyectiles.forEach((p) => dibujarProyectil(ctx, p));
  mundo.disparosEnemigos.forEach((d) => dibujarDisparoEnemigo(ctx, d));
  mundo.rayos.forEach((r) => dibujarRayo(ctx, r));
  mundo.tarjetas.forEach((tr) => recto(ctx, tr.x, tr.y, () => dibujarTarjeta(ctx, tr)));

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
    const edad = 1 - tx.vida / tx.total;
    const pop = 1 + 0.7 * Math.max(0, 1 - edad * 7); // nace grande y se encoge de golpe
    recto(ctx, tx.x, tx.y, () => {
      ctx.save();
      ctx.translate(tx.x, tx.y);
      ctx.scale(pop, pop);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.strokeText(tx.texto, 0, 0);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.texto, 0, 0);
      ctx.restore();
    });
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  dibujarAmbiente(ctx, j, ancho, alto, t);
  dibujarFlechasPremios(ctx, mundo, cam, ancho, alto, escala, t);
}
