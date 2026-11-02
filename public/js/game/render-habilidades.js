// Dibujo de las habilidades: balones con estela y brillo, golpes, ondas, partículas, números de daño y lo que dejan
// en el campo las habilidades nuevas (la ola, la línea del fuera de juego, los canteranos y la ruleta).
// Solo pinta: no cambia la simulación. Los colores van por familia (ver efectos.js): disparo dorado, cuerpo a
// cuerpo rojo, área azul y movilidad verde; y casi todo crece con el nivel del arma.
import { CAMARA, PIELES, PELOS } from './config.js';
import { FAMILIAS } from './efectos.js';
import { obtenerSprite, dibujarSprite } from './sprites.js';

const TAU = Math.PI * 2;
/** En el mundo, algo «de pie» de alto h ocupa h / inclinación (la cámara aplasta el suelo). */
const DE_PIE = 1 / CAMARA.inclinacion;
const ROJO = '#c8102e';
const BLANCO = '#ffffff';
const CONTORNO = '#10142d';

const colorFamilia = (familia) => (FAMILIAS[familia] ?? FAMILIAS.cuerpo).color;

function rgba(hex, a) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- Brillos: texturas radiales pintadas una sola vez por color y reutilizadas ------------------

const texturas = new Map();
function texturaBrillo(color) {
  let c = texturas.get(color);
  if (c || typeof document === 'undefined') return c ?? null;
  c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(color, 1));
  gr.addColorStop(0.3, rgba(color, 0.55));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  texturas.set(color, c);
  return c;
}

/** Halo de luz que suma color (se nota sobre todo de noche). */
export function brillo(ctx, x, y, r, color, alfa) {
  const tx = texturaBrillo(color);
  if (!tx || alfa <= 0) return;
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alfa);
  ctx.drawImage(tx, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = op;
}

// --- Balones ------------------------------------------------------------------------------------

/** Balón de píxeles con el parche girando (se nota que rueda). */
export function dibujarBalon(ctx, x, y, r, oscuro = false, oro = false, giro = 0) {
  const u = r / 3;
  ctx.fillStyle = oro ? '#5a3d00' : CONTORNO;
  ctx.fillRect(x - r - 1, y - r * 0.6, r * 2 + 2, r * 1.2);
  ctx.fillRect(x - r * 0.6, y - r - 1, r * 1.2, r * 2 + 2);
  ctx.fillStyle = oro ? '#ffd24a' : oscuro ? '#ff5b3a' : BLANCO;
  ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2);
  ctx.fillRect(x - r * 0.6, y - r, r * 1.2, r * 2);
  // Parche central y uno que va dando la vuelta
  ctx.fillStyle = oro ? '#b8860b' : oscuro ? '#7a1100' : '#222222';
  const px = Math.round(Math.cos(giro) * u * 1.3);
  ctx.fillRect(x - u + px * 0.4, y - u, u * 2, u * 2);
  if (r >= 6) {
    const a = giro * 1.3;
    ctx.fillRect(x + Math.cos(a) * u * 2 - u * 0.5, y + Math.sin(a) * u * 1.6 - u * 0.5, u, u);
  }
  // Brillo de luz arriba a la izquierda (no en los blancos: no se notaría)
  if (oro || oscuro) {
    ctx.fillStyle = oro ? '#fff3b0' : '#ffb199';
    ctx.fillRect(x - r * 0.55, y - r * 0.55, Math.max(1, u * 0.9), Math.max(1, u * 0.9));
  }
}

// Rastro de cada balón (solo para dibujar): puntos por donde ha pasado, el más nuevo primero
const rastros = new WeakMap();

function apuntarRastro(p, largo) {
  let r = rastros.get(p);
  if (!r) { r = []; rastros.set(p, r); }
  if (r.length < 2 || (r[0] - p.x) ** 2 + (r[1] - p.y) ** 2 > 9) {
    r.unshift(p.x, p.y);
    if (r.length > largo * 2) r.length = largo * 2;
  }
  return r;
}

/** Estela en tres tramos (de más ancha y opaca a más fina y transparente). */
function estela(ctx, p, puntos, color, claro, ancho) {
  const n = puntos.length / 2;
  if (n < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const tramos = [[0, Math.ceil(n * 0.4)], [Math.ceil(n * 0.4) - 1, Math.ceil(n * 0.75)], [Math.ceil(n * 0.75) - 1, n]];
  tramos.forEach(([a, b], i) => {
    if (b - a < 2) return;
    ctx.globalAlpha = [0.5, 0.3, 0.14][i];
    ctx.strokeStyle = color;
    ctx.lineWidth = ancho * [1, 0.72, 0.45][i];
    ctx.beginPath();
    ctx.moveTo(i === 0 ? p.x : puntos[a * 2], i === 0 ? p.y : puntos[a * 2 + 1]);
    for (let k = a + 1; k < b; k += 1) ctx.lineTo(puntos[k * 2], puntos[k * 2 + 1]);
    ctx.stroke();
  });
  // Núcleo claro solo en el primer tramo
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = claro;
  ctx.lineWidth = ancho * 0.35;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  for (let k = 1; k < Math.min(n, 4); k += 1) ctx.lineTo(puntos[k * 2], puntos[k * 2 + 1]);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Familia visual de un balón del jugador. */
function estiloBalon(p) {
  if (p.fuego) return FAMILIAS.fuego;
  if (p.oro) return { color: '#ffd24a', chispa: '#fff3b0', brillo: '#fff7d6' };
  if (p.pared || p.devuelto) return FAMILIAS.movil;
  return FAMILIAS.disparo;
}

const ultimoRebote = new WeakMap();

/** Balón del jugador: sombra, estela (más larga cuanto más nivel), halo, el balón y sus extras (fuego, rebotes). */
export function dibujarProyectil(ctx, p, t, reducidos, recto, sombra) {
  const nivel = p.nivel ?? 1;
  const est = estiloBalon(p);
  const fuerte = p.grande || p.oro || p.fuego || nivel >= 4;
  sombra(ctx, p.x, p.y + p.r * 1.6, p.r * 0.9, p.r * 0.3);
  const puntos = apuntarRastro(p, reducidos ? 3 : 4 + nivel * 2 + (p.grande ? 4 : 0));
  estela(ctx, p, puntos, est.color, est.brillo, p.r * (p.grande ? 2.1 : 1.6) * (0.85 + 0.06 * nivel));
  if (!reducidos && (fuerte || nivel >= 3)) brillo(ctx, p.x, p.y, p.r * (2.2 + 0.25 * nivel + (p.grande ? 1 : 0)), est.color, 0.28 + 0.06 * nivel);
  recto(ctx, p.x, p.y, () => {
    dibujarBalon(ctx, p.x, p.y, p.r, false, p.oro, p.rot);
    if (p.fuego) { // llamas que salen hacia atrás
      const v = Math.hypot(p.vx, p.vy) || 1;
      const bx = -p.vx / v;
      const by = -p.vy / v;
      for (let i = 0; i < 3; i += 1) {
        const h = p.r * (0.9 + 0.5 * Math.abs(Math.sin(t * 20 + i * 2)));
        ctx.fillStyle = i === 1 ? '#ffd24a' : '#ff7a1a';
        ctx.fillRect(p.x + bx * p.r * (0.8 + i * 0.5) - p.r * 0.3, p.y + by * p.r * (0.8 + i * 0.5) - h * 0.5 - p.r * 0.4, p.r * 0.6, h);
      }
    }
  });
  // La carambola enseña cada rebote con un chispazo
  if (p.carambola && p.rebotes > 0) {
    if (ultimoRebote.get(p)?.n !== p.rebotes) ultimoRebote.set(p, { n: p.rebotes, t });
    const k = 1 - Math.min(1, (t - ultimoRebote.get(p).t) / 0.25);
    if (k > 0) {
      ctx.globalAlpha = k;
      ctx.strokeStyle = '#fff1b8';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU + p.rebotes;
        const r0 = p.r + 3 + (1 - k) * 10;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0);
        ctx.lineTo(p.x + Math.cos(a) * (r0 + 6), p.y + Math.sin(a) * (r0 + 6));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  // A nivel máximo, destellos alrededor
  if (nivel >= 5 && !reducidos) {
    ctx.fillStyle = est.brillo;
    const a = t * 9 + p.x * 0.05;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(p.x + Math.cos(a) * p.r * 1.8 - 1.5, p.y + Math.sin(a) * p.r * 1.8 - 1.5, 3, 3);
    ctx.fillRect(p.x + Math.cos(a + 2.4) * p.r * 1.5 - 1, p.y + Math.sin(a + 2.4) * p.r * 1.5 - 1, 2, 2);
    ctx.globalAlpha = 1;
  }
}

/** Balón de un rival: rojo, con estela roja (se distingue de un vistazo de los tuyos). */
export function dibujarDisparoEnemigo(ctx, d, recto, sombra) {
  sombra(ctx, d.x, d.y + d.r * 1.6, d.r * 0.9, d.r * 0.3);
  estela(ctx, d, apuntarRastro(d, 5), '#ff3b3b', '#ffb199', d.r * 1.5);
  recto(ctx, d.x, d.y, () => dibujarBalon(ctx, d.x, d.y, d.r, true, false, d.rot ?? 0));
}

// --- Golpes cuerpo a cuerpo (bufanda, cabezazo, despeje) -----------------------------------------

/** Barrido en forma de media luna; la bufanda va a franjas rojas y blancas. Más grueso cuanto más nivel. */
export function dibujarTajo(ctx, tj) {
  const k = tj.vida / tj.total; // 1 → 0
  const avance = 1 - k;
  const nivel = tj.nivel ?? 1;
  const color = tj.color ?? colorFamilia(tj.familia ?? 'cuerpo');
  const barrido = Math.min(1, avance * 2.2); // el golpe se abre deprisa
  const a0 = -tj.ancho;
  const a1 = -tj.ancho + 2 * tj.ancho * barrido;
  ctx.save();
  ctx.translate(tj.x, tj.y);
  ctx.rotate(tj.ang);
  // Abanico suave del área golpeada
  ctx.globalAlpha = 0.18 * k;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, tj.largo, a0, a1);
  ctx.closePath();
  ctx.fill();
  const grosor = 7 + nivel * 2.2;
  const radio = tj.largo - grosor / 2;
  ctx.lineCap = 'butt';
  if (tj.bufanda) {
    const trozos = 10 + nivel * 2;
    for (let i = 0; i < trozos; i += 1) {
      const b0 = a0 + ((a1 - a0) * i) / trozos;
      const b1 = a0 + ((a1 - a0) * (i + 1)) / trozos;
      ctx.globalAlpha = Math.min(1, k * 1.8) * (0.45 + (0.55 * (i + 1)) / trozos);
      ctx.strokeStyle = i % 2 ? BLANCO : ROJO;
      ctx.lineWidth = grosor * (0.55 + (0.45 * (i + 1)) / trozos);
      ctx.beginPath();
      ctx.arc(0, 0, radio, b0, b1 + 0.01);
      ctx.stroke();
    }
    // Flecos al final de la bufanda
    ctx.globalAlpha = Math.min(1, k * 1.8);
    ctx.fillStyle = BLANCO;
    for (let i = 0; i < 3; i += 1) {
      const a = a1 - 0.02 * i;
      ctx.fillRect(Math.cos(a) * (radio + grosor / 2), Math.sin(a) * (radio + grosor / 2) - 1 + i * 3 - 3, 5, 2);
    }
  } else {
    ctx.globalAlpha = Math.min(1, k * 1.8);
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.beginPath();
    ctx.arc(0, 0, radio, a0, a1);
    ctx.stroke();
  }
  // Filo blanco
  ctx.globalAlpha = Math.min(1, k * 2);
  ctx.strokeStyle = BLANCO;
  ctx.lineWidth = 2 + nivel * 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, tj.largo, a0, a1);
  ctx.stroke();
  ctx.restore();
}

// --- Ondas (cánticos, silbato, himno, caño, explosiones...) -------------------------------------

export function dibujarOnda(ctx, o, t) {
  const k = 1 - o.vida / o.total; // 0 → 1
  const crece = 1 - (1 - k) ** 2;
  const nivel = o.nivel ?? 1;
  const color = o.color ?? (o.enemiga ? '#ff3b3b' : o.ulti ? '#ffd166' : o.silbato && !o.familia ? '#8fd8ff' : colorFamilia(o.familia ?? 'cuerpo'));
  const r = o.radio * (0.2 + 0.8 * crece);
  const alfa = 1 - k;
  ctx.globalAlpha = alfa * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = (o.ulti ? 12 : 3.5 + nivel * 1.1) * alfa + 1.5;
  ctx.beginPath();
  ctx.arc(o.x, o.y, r, 0, TAU);
  ctx.stroke();
  if (o.silbato || o.ulti || o.familia === 'area') { // las de área dejan ver la zona
    ctx.globalAlpha = alfa * (o.ulti ? 0.14 : 0.1);
    ctx.fillStyle = color;
    ctx.fill();
  }
  if (r > 20) { // aro interior blanco: da volumen
    ctx.globalAlpha = alfa * 0.45;
    ctx.strokeStyle = BLANCO;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * 0.93, 0, TAU);
    ctx.stroke();
  }
  if (o.sonido) { // el cántico: varias ondas de sonido
    ctx.strokeStyle = color;
    for (let i = 1; i <= 2; i += 1) {
      ctx.globalAlpha = alfa * (0.5 - i * 0.15);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * (1 - i * 0.22), 0, TAU);
      ctx.stroke();
    }
  }
  if (o.estrellas) { // el himno de la Champions: estrellas sobre el aro
    ctx.globalAlpha = alfa;
    ctx.fillStyle = BLANCO;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU + t * 1.5;
      estrellita(ctx, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, 4 + nivel, a);
    }
  }
  if (o.rebote) { // chispazo del rebote de la carambola
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = '#fff1b8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + 0.6;
      ctx.beginPath();
      ctx.moveTo(o.x + Math.cos(a) * r * 0.5, o.y + Math.sin(a) * r * 0.5);
      ctx.lineTo(o.x + Math.cos(a) * r * 1.2, o.y + Math.sin(a) * r * 1.2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function estrellita(ctx, x, y, r, giro = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = giro + (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// --- Marcas en el suelo y lo que va por el aire (vaselinas, bengalas, penaltis) -------------------

export function dibujarImpacto(ctx, im) {
  const k = im.vida / im.total;
  ctx.save();
  ctx.strokeStyle = im.color ?? BLANCO;
  if (im.tipo === 'linea') { // el penalti: un trallazo de luz
    ctx.lineCap = 'round';
    const a = Math.min(1, k * 1.5);
    ctx.globalAlpha = a * 0.3;
    ctx.lineWidth = 12 + 2 * (im.nivel ?? 1);
    ctx.strokeStyle = FAMILIAS.disparo.color;
    ctx.beginPath();
    ctx.moveTo(im.x, im.y);
    ctx.lineTo(im.x2, im.y2);
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.lineWidth = 4;
    ctx.strokeStyle = im.color ?? BLANCO;
    ctx.stroke();
  } else {
    // Un círculo que se cierra sobre el objetivo
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -k * 30;
    ctx.beginPath();
    ctx.arc(im.x, im.y, im.radio, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.25 * (1 - k);
    ctx.fillStyle = im.color ?? BLANCO;
    ctx.beginPath();
    ctx.arc(im.x, im.y, im.radio * (1 - k), 0, TAU);
    ctx.fill();
    // Cruz de mira en el centro
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(im.x - 6, im.y);
    ctx.lineTo(im.x + 6, im.y);
    ctx.moveTo(im.x, im.y - 5);
    ctx.lineTo(im.x, im.y + 5);
    ctx.stroke();
  }
  ctx.restore();
}

/** La vaselina vuela en parábola hasta la marca; la bengala, igual, echando chispas. */
export function dibujarImpactoAire(ctx, im, t, recto) {
  if (!im.desde || im.tipo !== 'marca') return;
  const k = 1 - im.vida / im.total; // 0 → 1
  const x = im.desde.x + (im.x - im.desde.x) * k;
  const yS = im.desde.y + (im.y - im.desde.y) * k;
  const alto = 4 * 110 * k * (1 - k);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(x, yS + 6, 6 - k * 2, 2.5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  const y = yS - alto * DE_PIE;
  if (im.vaselina) {
    brillo(ctx, x, y, 16, FAMILIAS.disparo.color, 0.35);
    recto(ctx, x, y, () => dibujarBalon(ctx, x, y, 7, false, false, t * 12));
  } else if (im.bengala) {
    brillo(ctx, x, y, 22, FAMILIAS.fuego.color, 0.6);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = '#ff7a1a';
    for (let i = 1; i <= 4; i += 1) { // chispas que deja detrás
      const kk = Math.max(0, k - i * 0.05);
      const xx = im.desde.x + (im.x - im.desde.x) * kk;
      const yy = im.desde.y + (im.y - im.desde.y) * kk - 4 * 110 * kk * (1 - kk) * DE_PIE;
      ctx.globalAlpha = 0.8 - i * 0.17;
      ctx.fillRect(xx - 1.5 + Math.sin(t * 40 + i) * 2, yy - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}

/** Rayo del VAR: zigzag que parpadea, halo amarillo y el círculo azul de la zona revisada. */
export function dibujarRayo(ctx, r, t) {
  const k = r.vida / r.total;
  const nivel = r.nivel ?? 1;
  ctx.globalAlpha = k * 0.4;
  ctx.fillStyle = colorFamilia('area');
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.radio, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = Math.min(1, k * 2);
  ctx.strokeStyle = colorFamilia('area');
  ctx.lineWidth = 3;
  ctx.stroke();
  // Zigzag: cambia de forma unas veces por segundo
  const fase = Math.floor(t * 24);
  const puntos = [];
  for (let i = 0; i <= 7; i += 1) {
    const h = ((r.semilla * 7919 + i * 104729 + fase * 15485863) % 1000) / 1000;
    puntos.push([r.x + (i === 0 || i === 7 ? 0 : (h - 0.5) * 34), r.y - 420 + (420 * i) / 7]);
  }
  ctx.lineJoin = 'miter';
  [[10 + nivel * 2, '#ffe96b', 0.45], [4 + nivel * 0.5, '#fff7b0', 0.9], [2, BLANCO, 1]].forEach(([ancho, color, a]) => {
    ctx.globalAlpha = Math.min(1, k * 2) * a;
    ctx.strokeStyle = color;
    ctx.lineWidth = ancho;
    ctx.beginPath();
    puntos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  brillo(ctx, r.x, r.y, r.radio * 0.9, '#ffe96b', k * 0.6);
}

/** Tarjeta roja que sube girando, con brillo. */
export function dibujarTarjeta(ctx, tr) {
  const k = tr.vida / tr.total;
  const giro = Math.cos((1 - k) * Math.PI * 3);
  const s = 1 + 0.12 * ((tr.nivel ?? 1) - 1);
  brillo(ctx, tr.x, tr.y, 22 * s, '#ff3b3b', Math.min(1, k * 2) * 0.5);
  ctx.globalAlpha = Math.min(1, k * 2);
  const w = 7 * s * Math.max(0.2, Math.abs(giro));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(tr.x - w - 1.5, tr.y - 10 * s - 1.5, (w + 1.5) * 2, 20 * s + 3);
  ctx.fillStyle = giro > 0 ? '#e11d2e' : '#b0101f';
  ctx.fillRect(tr.x - w, tr.y - 10 * s, w * 2, 20 * s);
  ctx.globalAlpha = 1;
}

/** Banderín girando con su estela roja. */
export function dibujarBanderin(ctx, b, t, j, recto) {
  const r = Math.hypot(b.x - j.x, b.y - j.y);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = colorFamilia('cuerpo');
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(j.x, j.y, r, b.ang - 0.7, b.ang - 0.05);
  ctx.stroke();
  ctx.globalAlpha = 1;
  recto(ctx, b.x, b.y, () => banderin(ctx, b, t));
}

function banderin(ctx, b, t) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = CONTORNO;
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

/** Fuego en el suelo dejado por las bengalas (con un halo cálido). */
export function dibujarFuego(ctx, f, t, reducidos) {
  const k = Math.min(1, f.t / 0.6);
  if (!reducidos) brillo(ctx, f.x, f.y, f.radio * 1.3, FAMILIAS.fuego.color, 0.35 * k);
  ctx.globalAlpha = 0.28 * k;
  ctx.fillStyle = '#ff5a1a';
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.radio, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.85 * k;
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * TAU + t * 0.5;
    const d = f.radio * (0.25 + (0.55 * ((i * 37) % 10)) / 10);
    const h = 8 + 8 * Math.abs(Math.sin(t * 9 + i * 1.7));
    const x = f.x + Math.cos(a) * d;
    const y = f.y + Math.sin(a) * d * 0.8;
    ctx.fillStyle = '#ff7a1a';
    ctx.fillRect(x - 3, y - h, 6, h);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(x - 1.5, y - h * 0.6, 3, h * 0.6);
  }
  ctx.globalAlpha = 1;
}

/** La barrera: cúpula azul con un aro de franjas que gira; parpadea al acabarse. */
export function dibujarEscudo(ctx, j, t) {
  const final = j.escudo < 0.6 ? 0.5 + 0.5 * Math.sin(t * 30) : 1;
  const r = j.escudoRadio;
  ctx.save();
  ctx.globalAlpha = 0.2 * final;
  ctx.fillStyle = colorFamilia('area');
  ctx.beginPath();
  ctx.arc(j.x, j.y, r, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 5;
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU + t * 0.8;
    ctx.globalAlpha = 0.85 * final;
    ctx.strokeStyle = i % 2 ? BLANCO : colorFamilia('area');
    ctx.beginPath();
    ctx.arc(j.x, j.y, r, a, a + TAU / 12 - 0.04);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.35 * final;
  ctx.strokeStyle = BLANCO;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(j.x, j.y, r * (0.55 + 0.4 * ((t * 1.5) % 1)), 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// --- Partículas y números de daño ----------------------------------------------------------------

export function dibujarParticulas(ctx, lista) {
  // Primero los cuadraditos (restos), luego chispas y destellos sumando luz
  for (let i = 0; i < lista.length; i += 1) {
    const p = lista[i];
    if (p.forma !== 'cuadro' || p.vida <= 0) continue;
    const k = p.vida / p.total;
    const r = p.r * (0.45 + 0.55 * k);
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r);
  }
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < lista.length; i += 1) {
    const p = lista[i];
    if (p.vida <= 0 || p.forma === 'cuadro') continue;
    const k = p.vida / p.total;
    ctx.globalAlpha = Math.min(1, k * 1.5);
    if (p.forma === 'chispa') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.r * (0.5 + 0.5 * k);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      ctx.stroke();
    } else { // brillo: estrella de cuatro puntas que crece y se apaga
      ctx.fillStyle = p.color;
      const r = p.r * (1.3 - 0.5 * k);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r * 0.22, p.y - r * 0.22);
      ctx.lineTo(p.x + r, p.y);
      ctx.lineTo(p.x + r * 0.22, p.y + r * 0.22);
      ctx.lineTo(p.x, p.y + r);
      ctx.lineTo(p.x - r * 0.22, p.y + r * 0.22);
      ctx.lineTo(p.x - r, p.y);
      ctx.lineTo(p.x - r * 0.22, p.y - r * 0.22);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = 1;
}

const FUENTE = '"Plus Jakarta Sans", system-ui, sans-serif';

/**
 * Números de daño: grandes y con borde oscuro para leerse sobre el césped; el tamaño crece con el daño y los
 * críticos salen dorados, con borde granate, una estrella detrás y un «salto» más grande. Los avisos («+vida»,
 * «¡Fuera de juego!») van en blanco con su color de borde.
 */
export function dibujarTextos(ctx, textos, recto, reducidos) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (let i = 0; i < textos.length; i += 1) {
    const tx = textos[i];
    const k = tx.vida / tx.total;
    if (k <= 0) continue;
    const edad = 1 - k;
    const salto = reducidos ? 1 : 1 + (tx.critico ? 0.9 : 0.55) * Math.max(0, 1 - edad * 7);
    const deriva = (tx.dx ?? 0) * (1 - (1 - edad) ** 2);
    const x = tx.x + deriva;
    ctx.globalAlpha = Math.min(1, k * 2.4);
    recto(ctx, x, tx.y, () => {
      ctx.save();
      ctx.translate(x, tx.y);
      ctx.scale(salto, salto);
      if (tx.dano) {
        const tam = Math.round(tx.critico ? 22 + Math.min(6, Math.log10(tx.valor + 1) * 2) : 14 + Math.min(7, Math.log10(tx.valor + 1) * 2.4));
        if (tx.critico) {
          ctx.rotate(Math.sin(edad * 30) * 0.06 * (1 - edad));
          ctx.fillStyle = '#ff7a1a';
          ctx.globalAlpha *= 0.85;
          estrellita(ctx, 0, 0, tam * 0.95, edad * 3);
          ctx.globalAlpha = Math.min(1, k * 2.4);
        }
        ctx.font = `800 ${tam}px ${FUENTE}`;
        ctx.lineWidth = tx.critico ? 5 : 4;
        ctx.strokeStyle = tx.critico ? '#5a0a12' : 'rgba(12,8,28,.92)';
        ctx.strokeText(tx.texto, 0, 0);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.texto, 0, 0);
      } else {
        ctx.font = `800 15px ${FUENTE}`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(12,8,28,.92)';
        ctx.strokeText(tx.texto, 0, 0);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.texto, 0, 0);
      }
      ctx.restore();
    });
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}

// --- Habilidades nuevas --------------------------------------------------------------------------

/** Lo que va pegado al suelo: la estela de la ola, la línea del fuera de juego y el aro de la ruleta. */
export function dibujarHabilidadesSuelo(ctx, mundo, t) {
  const J = mundo.jugadas;
  if (!J) return;
  for (const o of J.olas) {
    const k = o.d / o.max;
    const tx = -o.dy;
    const ty = o.dx;
    const m = o.largo / 2;
    ctx.globalAlpha = 0.22 * (1 - k * 0.7);
    ctx.fillStyle = colorFamilia('area');
    ctx.beginPath();
    ctx.moveTo(o.x + tx * m + o.dx * 18, o.y + ty * m + o.dy * 18);
    ctx.lineTo(o.x - tx * m + o.dx * 18, o.y - ty * m + o.dy * 18);
    ctx.lineTo(o.x - tx * m * 0.8 - o.dx * 90, o.y - ty * m * 0.8 - o.dy * 90);
    ctx.lineTo(o.x + tx * m * 0.8 - o.dx * 90, o.y + ty * m * 0.8 - o.dy * 90);
    ctx.closePath();
    ctx.fill();
  }
  for (const l of J.lineas) {
    const nace = Math.min(1, (l.total - l.t) / 0.25);
    const muere = l.t < 0.6 ? 0.45 + 0.55 * Math.abs(Math.sin(t * 14)) : 1;
    const tx = -l.ny;
    const ty = l.nx;
    const m = (l.largo / 2) * nace;
    // Banda amarilla del lado de los rivales
    ctx.globalAlpha = 0.18 * muere;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.moveTo(l.x + tx * m, l.y + ty * m);
    ctx.lineTo(l.x - tx * m, l.y - ty * m);
    ctx.lineTo(l.x - tx * m + l.nx * 34, l.y - ty * m + l.ny * 34);
    ctx.lineTo(l.x + tx * m + l.nx * 34, l.y + ty * m + l.ny * 34);
    ctx.closePath();
    ctx.fill();
    // La raya de cal, discontinua y más gruesa con el nivel
    ctx.globalAlpha = 0.95 * muere;
    ctx.strokeStyle = BLANCO;
    ctx.lineWidth = 4 + (l.nivel ?? 1);
    ctx.setLineDash([16, 9]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.moveTo(l.x + tx * m, l.y + ty * m);
    ctx.lineTo(l.x - tx * m, l.y - ty * m);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (J.giros.length) {
    const j = mundo.jugador;
    const g = J.giros[J.giros.length - 1];
    const k = g.t / g.total;
    ctx.globalAlpha = 0.25 * k;
    ctx.fillStyle = colorFamilia('movil');
    ctx.beginPath();
    ctx.arc(j.x, j.y, g.radio, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Un aficionado de la ola: camiseta rojiblanca y brazos (y bufanda) arriba al levantarse. */
function aficionado(ctx, x, y, alzado, i, nivel) {
  const h = (14 + alzado * 9) * DE_PIE;
  const piel = PIELES[i % PIELES.length];
  ctx.fillStyle = CONTORNO;
  ctx.fillRect(x - 5, y - h - 7 * DE_PIE, 10, h + 7 * DE_PIE);
  ctx.fillStyle = i % 2 ? ROJO : BLANCO;
  ctx.fillRect(x - 4, y - h + 1, 8, h - 1);
  ctx.fillStyle = i % 2 ? BLANCO : ROJO;
  ctx.fillRect(x - 1, y - h + 1, 2, h - 1);
  ctx.fillStyle = piel;
  ctx.fillRect(x - 3.5, y - h - 6 * DE_PIE, 7, 6 * DE_PIE);
  if (alzado > 0.35) { // brazos arriba
    ctx.fillStyle = piel;
    ctx.fillRect(x - 6, y - h - 9 * alzado * DE_PIE, 2, 9 * alzado * DE_PIE);
    ctx.fillRect(x + 4, y - h - 9 * alzado * DE_PIE, 2, 9 * alzado * DE_PIE);
    if (nivel >= 3 && i % 3 === 0) { // bufanda al aire
      ctx.fillStyle = ROJO;
      ctx.fillRect(x - 7, y - h - 12 * alzado * DE_PIE, 7, 3);
      ctx.fillStyle = BLANCO;
      ctx.fillRect(x, y - h - 12 * alzado * DE_PIE, 7, 3);
    }
  }
}

/** Una bandera de linier (a cuadros rojos y amarillos), bajada o levantada. */
function banderaLinier(ctx, x, y, arriba, t) {
  const palo = 22 * DE_PIE;
  const yPalo = arriba ? y - palo - 10 * DE_PIE : y - palo * 0.55;
  ctx.fillStyle = CONTORNO;
  ctx.fillRect(x - 2, yPalo - 1, 4, palo + 2);
  ctx.fillStyle = BLANCO;
  ctx.fillRect(x - 1, yPalo, 2, palo);
  const ondea = arriba ? Math.round(Math.sin(t * 18) * 2) : 0;
  for (let fx = 0; fx < 3; fx += 1) {
    for (let fy = 0; fy < 2; fy += 1) {
      ctx.fillStyle = (fx + fy) % 2 ? '#ffd400' : '#e3121b';
      ctx.fillRect(x + 1 + fx * 4, yPalo + fy * 4 * DE_PIE + (fx === 2 ? ondea : 0), 4, 4 * DE_PIE);
    }
  }
}

const aspectoCanterano = (i) => ({
  piel: PIELES[(i * 3 + 1) % PIELES.length], pelo: PELOS[(i * 2) % PELOS.length],
  camiseta: { c: ROJO, c2: BLANCO, p: 'franjas' }, pantalon: '#1b2a5c', medias: ROJO, botas: '#1d1d1d',
});

/** Canteranos de la presión alta (para ordenarlos con los demás muñecos por profundidad). */
export function canteranosParaOrdenar(ctx, mundo, lista, t, recto, sombra) {
  const J = mundo.jugadas;
  if (!J) return;
  const j = mundo.jugador;
  J.canteranos.forEach((c, i) => {
    lista.push({
      y: c.y + j.r,
      f: () => {
        const alto = j.r * 3.2 * 0.84;
        const corre = c.estado !== 'formacion';
        if (corre) { // estela roja al salir a presionar
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = colorFamilia('cuerpo');
          ctx.beginPath();
          ctx.ellipse(c.x - Math.sign(c.dirX || 1) * 10, c.y + alto * 0.42, alto * 0.42, alto * 0.08, 0, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        sombra(ctx, c.x, c.y + alto * 0.46, alto * 0.25, alto * 0.065);
        const sprite = obtenerSprite(`canterano:${i % 4}`, aspectoCanterano(i));
        recto(ctx, c.x, c.y + alto * 0.46, () => {
          const bote = Math.abs(Math.sin(t * (corre ? 16 : 9) + i)) * (corre ? 2.5 : 1.2);
          dibujarSprite(ctx, sprite, c.x, c.y - bote, alto, Math.floor(t * (corre ? 28 : 16) + i) % 4, (c.dirX || 1) < 0, c.golpe > 0.12);
        });
      },
    });
  });
}

/** Lo que va de pie o por encima: los aficionados de la ola, los linieres, la ruleta y los banderines de «fuera». */
export function dibujarHabilidadesAire(ctx, mundo, t, reducidos, recto) {
  const J = mundo.jugadas;
  const j = mundo.jugador;
  if (J) {
    for (const o of J.olas) {
      const tx = -o.dy;
      const ty = o.dx;
      const n = Math.max(6, Math.round(o.largo / 13));
      const desvanece = Math.min(1, (o.max - o.d) / 120);
      ctx.globalAlpha = desvanece;
      // Detrás primero (los de arriba en pantalla), para que se tapen bien
      const orden = ty >= 0 ? 1 : -1;
      for (let q = 0; q < n; q += 1) {
        const i = orden > 0 ? q : n - 1 - q;
        const s = (i / (n - 1) - 0.5) * o.largo;
        const fase = s / 46 - o.d / 26; // la ola recorre la fila mientras avanza
        const alzado = reducidos ? 0.6 : Math.max(0, Math.sin(fase));
        aficionado(ctx, o.x + tx * s, o.y + ty * s, alzado, i, o.nivel ?? 1);
      }
      ctx.globalAlpha = 1;
    }
    for (const l of J.lineas) {
      const tx = -l.ny;
      const ty = l.nx;
      const m = (l.largo / 2) * Math.min(1, (l.total - l.t) / 0.25);
      const arriba = l.bandera > 0;
      banderaLinier(ctx, l.x + tx * m, l.y + ty * m, arriba, t);
      banderaLinier(ctx, l.x - tx * m, l.y - ty * m, arriba, t + 0.3);
    }
    if (J.giros.length) { // la ruleta: estelas verdes girando a tu alrededor
      const g = J.giros[J.giros.length - 1];
      const k = g.t / g.total;
      const brazos = 2 + Math.min(3, Math.floor((g.nivel ?? 1) / 2));
      ctx.lineCap = 'round';
      for (let b = 0; b < brazos; b += 1) {
        const a0 = -(1 - k) * 14 + (b / brazos) * TAU;
        for (let s = 0; s < 5; s += 1) {
          ctx.globalAlpha = k * (0.75 - s * 0.14);
          ctx.strokeStyle = s === 0 ? BLANCO : colorFamilia('movil');
          ctx.lineWidth = 6 - s;
          ctx.beginPath();
          ctx.arc(j.x, j.y, g.radio * (0.55 + 0.1 * s), a0 + s * 0.22, a0 + s * 0.22 + 0.5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (!reducidos) brillo(ctx, j.x, j.y, g.radio * 0.8, colorFamilia('movil'), 0.25 * k);
    }
  }
  // Rivales cazados en fuera de juego: banderín sobre la cabeza
  for (const e of mundo.enemigos) {
    if (!(e.fuera > mundo.tiempo) || e.muerto) continue;
    const alto = e.jefe ? e.r * 3.3 : e.r * 3.1;
    recto(ctx, e.x, e.y + alto * 0.46, () => {
      const y = e.y - alto / 2 - 20;
      ctx.fillStyle = CONTORNO;
      ctx.fillRect(e.x - 9, y - 7, 18, 13);
      for (let fx = 0; fx < 4; fx += 1) {
        for (let fy = 0; fy < 3; fy += 1) {
          ctx.fillStyle = (fx + fy) % 2 ? '#ffd400' : '#e3121b';
          ctx.fillRect(e.x - 8 + fx * 4, y - 6 + fy * 3.7, 4, 3.7);
        }
      }
    });
  }
}
