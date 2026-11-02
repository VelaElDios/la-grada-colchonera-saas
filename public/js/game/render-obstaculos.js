// Dibujos de lo que está de pie en el mundo: gradas con público animado, vallas de led, porterías con red,
// banquillos, focos, árboles, tiendas, puestos, el trofeo de la plaza, la pantalla gigante, vallas, bancos,
// farolas, rocas, fuentes y banderas. Cada dibujo se pinta una vez por ambiente (y por fotograma de su
// animación) en un lienzo pequeño de píxeles de 2 unidades y después solo se copia.
// Las sombras no se dibujan aquí: `sombrasDe` dice qué sombra echa cada cosa y el suelo las pinta en su textura
// (todas hacia abajo a la derecha, más largas al atardecer).
// Sin escudos, logotipos ni marcas: los carteles llevan textos inventados o rojiblancos.
import { SELECCIONES } from './config.js';
import { MACIZOS } from './terreno.js';
import {
  PALETAS, PX, CONTORNO, rgb, hash, BAYER, mezcla, por, aficionDe, anchoTexto, Pixeles,
} from './render-paletas.js';

const C = (h) => rgb(h);
const PIELES = ['#f2c6a0', '#e0ac84', '#c68642', '#8d5524'].map(C);
const PELOS = ['#2a1a10', '#5a3a1a', '#c89a4a', '#161616', '#8a5a2a', '#d8d0c0'].map(C);
const HORMIGON = ['#7a809a', '#646a84', '#535872', '#40445c'].map(C); // de claro a oscuro
const METAL = ['#e2e6ee', '#c4c9d6', '#9aa0b4', '#6e748c'].map(C);
const NEGRO = C(CONTORNO);
const BLANCO = C('#f4f6fa');

// ---------------------------------------------------------------------------------------------
// Sombras (las pinta el suelo): `sombra(x0, y0, x1, y1, dentro(x, y), alfa)` en coordenadas del mundo
// ---------------------------------------------------------------------------------------------

/** Barrido de una caja [x0,x1]×[y0,y1] de altura h en la dirección del sol (desde la fracción k0 de la altura). */
function barrido(sombra, x0, y0, x1, y1, h, sol, alfa = 1, k0 = 0) {
  const vx = sol[0] * h;
  const vy = sol[1] * h;
  sombra(x0 + vx * k0, y0 + vy * k0, x1 + vx, y1 + vy, (x, y) => {
    const a = Math.max(k0, (x - x1) / vx, (y - y1) / vy);
    const b = Math.min(1, (x - x0) / vx, (y - y0) / vy);
    return a <= b;
  }, alfa);
}
/** Elipse en el suelo. */
function elipse(sombra, cx, cy, rx, ry, alfa = 1) {
  sombra(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, alfa);
}
/** Palo vertical de altura h y medio grosor g que sale de (x, y). */
function palo(sombra, x, y, h, g, sol, alfa = 1) {
  const ex = x + sol[0] * h;
  const ey = y + sol[1] * h;
  const lx = ex - x;
  const ly = ey - y;
  const l2 = lx * lx + ly * ly || 1;
  sombra(Math.min(x, ex) - g, Math.min(y, ey) - g, Math.max(x, ex) + g, Math.max(y, ey) + g, (px, py) => {
    const k = Math.max(0, Math.min(1, ((px - x) * lx + (py - y) * ly) / l2));
    return (px - x - lx * k) ** 2 + (py - y - ly * k) ** 2 <= g * g;
  }, alfa);
}

const ALTO_SOMBRA = { grada: 64, tienda: 84, kiosco: 52, cartel: 16, banquillo: 30, banco: 12, roca: 14, porteria: 46 };

/** Llama a `sombra(...)` con las formas de la sombra que echa un obstáculo o un adorno. */
export function sombrasDe(o, pal, sombra) {
  const sol = pal.sol;
  const pie = o.y + (o.h || 0) / 2; // línea del suelo de lo que está de pie
  switch (o.tipo) {
    case 'arbol': {
      const pino = o.especie === 'pino';
      const hc = o.alto * (pino ? 0.55 : 0.68);
      const cx = o.x + sol[0] * hc;
      const cy = pie - 2 + sol[1] * hc;
      palo(sombra, o.x, pie - 3, hc * 0.7, 4, sol, 0.95);
      elipse(sombra, cx, cy, o.copa * (pino ? 0.6 : 0.95), o.copa * (pino ? 0.4 : 0.52), 0.85);
      return;
    }
    case 'foco':
      barrido(sombra, o.x - o.w / 2, pie - o.h, o.x + o.w / 2, pie, 18, sol);
      palo(sombra, o.x, pie - 8, o.alto, 3.5, sol);
      elipse(sombra, o.x + sol[0] * o.alto + 4, pie - 8 + sol[1] * o.alto, 20, 9);
      return;
    case 'farola':
      palo(sombra, o.x, pie - 2, o.alto, 2.5, sol);
      elipse(sombra, o.x + sol[0] * o.alto, pie - 2 + sol[1] * o.alto, 7, 4);
      return;
    case 'monumento': {
      const base = o.hBase ?? o.h;
      elipse(sombra, o.x + sol[0] * 10, pie - base / 2 + sol[1] * 10 + 2, o.w / 2, base / 2, 0.7); // pileta redonda
      barrido(sombra, o.x - 16, pie - base / 2 - 8, o.x + 16, pie - base / 2 + 8, o.alto, sol);
      return;
    }
    case 'pantalla':
      barrido(sombra, o.x - o.w / 2, pie - 8, o.x + o.w / 2, pie, o.alto, sol, 1, 0.3);
      palo(sombra, o.x - o.w / 2 + 12, pie - 4, o.alto * 0.4, 3, sol);
      palo(sombra, o.x + o.w / 2 - 12, pie - 4, o.alto * 0.4, 3, sol);
      return;
    case 'valla':
      barrido(sombra, o.x - o.w / 2, o.y - o.h / 2, o.x + o.w / 2, o.y + o.h / 2, o.alto, sol, 0.45);
      return;
    case 'fuente':
      barrido(sombra, o.x - o.w / 2 + 6, o.y - o.h / 2 + 6, o.x + o.w / 2 - 6, o.y + o.h / 2 - 2, 10, sol, 0.7);
      return;
    case 'mata': {
      const r = o.r || 14;
      elipse(sombra, o.x + sol[0] * r * 0.6 + 2, o.y + 3 + sol[1] * r * 0.6, r * 1.05, r * 0.42, 0.8);
      return;
    }
    case 'bandera':
      palo(sombra, o.x, o.y, 70, 1.6, sol);
      elipse(sombra, o.x + 15 + sol[0] * 62, o.y + sol[1] * 62, 14, 5, 0.8);
      return;
    default: {
      const h = ALTO_SOMBRA[o.tipo];
      if (!h || !MACIZOS.has(o.tipo)) return;
      const base = o.hBase ?? o.h;
      barrido(sombra, o.x - o.w / 2, pie - base, o.x + o.w / 2, pie, h, sol, o.tipo === 'porteria' ? 0.45 : 1);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Utilidades de dibujo
// ---------------------------------------------------------------------------------------------

/** Caja vista en 3/4: tapa (clara) de `alto` píxeles arriba y frente más oscuro debajo, con contorno. */
function caja(px, x, y, w, tapa, frente, colTapa, colFrente) {
  px.r(x, y, w, tapa, colTapa);
  px.r(x, y + tapa, w, frente, colFrente);
  px.r(x, y + tapa, w, 1, por(colFrente, 0.8));
}

/** Malla de red o de valla (rombos) con transparencia. */
function malla(px, x, y, w, h, col, a, paso = 3) {
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      if ((xx + yy) % paso === 0 || (xx - yy + 300) % paso === 0) px.p(x + xx, y + yy, col, a);
    }
  }
}

/** Escribe centrado un texto que quepa en `ancho` (si no cabe, prueba con los siguientes). */
function rotulo(px, textos, x, y, ancho, col, a = 1) {
  const t = textos.find((s) => anchoTexto(s) <= ancho) ?? '';
  px.texto(t, x + Math.floor((ancho - anchoTexto(t)) / 2), y, col, a);
}

// ---------------------------------------------------------------------------------------------
// Gradas con público
// ---------------------------------------------------------------------------------------------

/** Un aficionado visto de frente (`vista` = 'frente'), de espaldas ('espalda') o de lado ('e' / 'o'). */
function aficionado(px, x, y, vista, cam, piel, pelo, pose, bufanda) {
  const sombraCam = por(cam, 0.78);
  if (vista === 'frente' || vista === 'espalda') {
    const dy = pose === 1 ? -1 : 0;
    px.r(x + 1, y + dy, 2, 1, pelo);
    px.r(x + 1, y + 1 + dy, 2, 1, vista === 'frente' ? piel : pelo);
    px.r(x, y + 2 + dy, 4, 3, cam);
    px.r(x + 3, y + 2 + dy, 1, 3, sombraCam);
    if (pose === 1) { // salta con los brazos arriba
      px.r(x - 1, y - 1, 1, 3, cam); px.p(x - 1, y - 2, piel);
      px.r(x + 4, y - 1, 1, 3, cam); px.p(x + 4, y - 2, piel);
    } else if (pose === 2 && bufanda) { // bufanda al aire
      for (let i = -1; i <= 4; i += 1) px.p(x + i, y - 2, bufanda[(i + 2) % 2]);
      px.p(x - 1, y - 1, piel); px.p(x + 4, y - 1, piel);
    } else if (bufanda && vista === 'frente') {
      px.p(x + 1, y + 2, bufanda[0]); px.p(x + 2, y + 2, bufanda[1]);
    }
    return;
  }
  // De lado: mira hacia `vista` ('e' o 'o')
  const haciaE = vista === 'e';
  const dy = pose === 1 ? -1 : 0;
  px.r(x, y + dy, 2, 2, pelo);
  px.p(haciaE ? x + 1 : x, y + 1 + dy, piel);
  px.r(x - 1, y + 2 + dy, 4, 2, cam);
  px.r(haciaE ? x - 1 : x + 2, y + 2 + dy, 1, 2, sombraCam);
  if (pose === 1) { px.p(haciaE ? x + 2 : x - 1, y - 1, piel); px.p(haciaE ? x + 2 : x - 1, y, cam); }
  if (pose === 2 && bufanda) { px.p(x - 1, y - 1, bufanda[0]); px.p(x, y - 2, bufanda[1]); px.p(x + 1, y - 1, bufanda[0]); px.p(x + 2, y - 2, bufanda[1]); }
}

function pintarGrada(o, pw, ph, amb, mundo, frame) {
  const px = new Pixeles(pw, ph);
  const pal = PALETAS[amb.clave];
  const colores = aficionDe(amb, mundo).map(C);
  const banderas = pal.banderas.map(C);
  const s = o.semilla;
  const asientos = [C('#a3162b'), C('#d6d9e2')];
  /** Decide quién hay en cada sitio y qué hace en este fotograma. */
  const quien = (col, fila) => {
    const a = hash(col + s, fila * 7 + 3);
    if (a < pal.vacios) return null;
    let cam = colores[Math.floor(hash(col * 3 + s, fila) * colores.length) % colores.length];
    let tifo = null;
    if (pal.tifo) { // mosaico de cartulinas rojas y blancas
      tifo = (Math.floor(col / 3) + (fila >> 2)) % 2 ? C('#c8102e') : BLANCO;
      cam = tifo;
    }
    const ritmo = (col + fila * 2 + frame) % 4 === 0; // la ola recorre la grada
    const salta = !pal.tifo && frame >= 0 && ((ritmo && hash(col, fila + s) < 0.7) || hash(col * 5 + frame, fila + s) < 0.06);
    const conBufanda = hash(col + 17, fila * 5 + s) < 0.22;
    const pose = salta ? 1 : conBufanda && (frame + col) % 2 === 0 ? 2 : 0;
    return {
      cam, tifo, pose, piel: PIELES[Math.floor(hash(col, fila + s) * 4)], pelo: PELOS[Math.floor(hash(fila, col + s) * PELOS.length)],
      bufanda: conBufanda ? [banderas[0], banderas[1 % banderas.length]] : null,
    };
  };
  px.r(0, 0, pw, ph, NEGRO);
  if (o.mira === 's') {
    // De frente (la grada mira hacia ti): cubierta arriba, filas de aficionados y el muro con pancarta abajo
    px.r(1, 1, pw - 2, 6, METAL[1]);
    for (let x = 1; x < pw - 1; x += 6) px.r(x, 1, 1, 6, METAL[2]);
    px.r(1, 1, pw - 2, 1, METAL[0]);
    px.r(1, 7, pw - 2, 2, METAL[3]);
    const muro = 11;
    const fondo = ph - muro;
    let fila = 0;
    for (let y = 10; y + 6 <= fondo; y += 6, fila += 1) {
      const lejos = 1 - 0.18 * (1 - (y - 10) / (fondo - 10)); // las filas de arriba, más a la sombra de la cubierta
      px.r(1, y, pw - 2, 6, por(HORMIGON[3], lejos));
      px.r(1, y + 5, pw - 2, 1, por(HORMIGON[1], lejos));
      for (let x = 2; x + 4 < pw - 1; x += 5) px.r(x, y + 2, 4, 3, por(asientos[(Math.floor(x / 20) + fila) % 2], lejos * 0.9));
      const desf = (fila % 2) * 2;
      for (let col = 0, x = 2 + desf; x + 4 < pw - 1; x += 5, col += 1) {
        const f = quien(col, fila);
        if (f) aficionado(px, x, y, 'frente', por(f.cam, lejos), f.piel, f.pelo, f.pose, f.bufanda);
      }
    }
    if (fila > 0) px.tono(1, 10, pw - 2, 3, 0.75); // sombra de la cubierta
    // Muro de abajo con bufandas colgadas y una pancarta
    px.r(1, fondo, pw - 2, muro - 1, HORMIGON[1]);
    px.r(1, fondo, pw - 2, 1, HORMIGON[0]);
    const pancarta = Math.min(pw - 24, 52);
    const xp = Math.floor((pw - pancarta) / 2);
    px.r(xp, fondo + 2, pancarta, 7, banderas[0]);
    px.r(xp, fondo + 2, pancarta, 1, por(banderas[0], 1.2));
    rotulo(px, ['AUPA ATLETI', 'ATLETI', 'AUPA'], xp, fondo + 3, pancarta, banderas[1 % banderas.length]);
    for (let x = 4; x < pw - 4; x += 6) {
      if (x + 3 > xp && x < xp + pancarta) continue;
      for (let k = 0; k < 7; k += 1) px.r(x, fondo + 2 + k, 2, 1, banderas[(k >> 1) % banderas.length]);
      px.p(x, fondo + 9, banderas[0]); px.p(x + 1, fondo + 9, banderas[0]);
    }
  } else if (o.mira === 'n') {
    // De espaldas: la parte de delante descubierta (cabezas vistas desde atrás), la cubierta y la fachada con puertas
    const fachada = Math.round(o.alto / PX);
    const yFach = ph - fachada;
    const yTecho = Math.max(18, Math.floor(yFach * 0.42));
    let fila = 0;
    for (let y = 2; y + 5 <= yTecho; y += 5, fila += 1) {
      px.r(1, y, pw - 2, 5, HORMIGON[3]);
      px.r(1, y + 4, pw - 2, 1, HORMIGON[2]);
      const desf = (fila % 2) * 2;
      for (let col = 0, x = 2 + desf; x + 4 < pw - 1; x += 5, col += 1) {
        const f = quien(col, fila + 20);
        if (f) aficionado(px, x, y, 'espalda', f.cam, f.piel, f.pelo, f.pose, f.bufanda);
      }
    }
    px.r(1, 1, pw - 2, 1, HORMIGON[0]); // barandilla de delante
    // Cubierta: chapa con nervios, más clara arriba, y canalón
    for (let y = yTecho; y < yFach; y += 1) {
      const k = (y - yTecho) / (yFach - yTecho);
      px.r(1, y, pw - 2, 1, mezcla(METAL[0], METAL[2], k));
    }
    for (let x = 4; x < pw - 2; x += 7) px.r(x, yTecho, 1, yFach - yTecho, por(METAL[2], 0.92));
    for (let x = 10; x < pw - 8; x += 28) px.r(x, yTecho + 3, 8, yFach - yTecho - 6, C('#9cc4ee')); // lucernarios
    px.r(1, yTecho, pw - 2, 1, METAL[3]);
    px.r(1, yFach - 2, pw - 2, 2, METAL[3]);
    // Fachada: pilares, ventanas, puertas numeradas y lonas con los colores
    px.r(1, yFach, pw - 2, fachada - 1, HORMIGON[1]);
    let puerta = 1 + (s % 9);
    for (let x = 2; x + 12 < pw - 1; x += 14, puerta += 1) {
      px.r(x, yFach, 3, fachada - 1, HORMIGON[0]);
      px.r(x + 2, yFach, 1, fachada - 1, HORMIGON[2]);
      px.r(x + 5, yFach + 3, 6, 5, C('#2a3550'));
      px.r(x + 5, yFach + 3, 6, 1, C('#5a7090'));
      const alto = Math.min(12, fachada - 14);
      px.r(x + 5, ph - 1 - alto, 6, alto, C('#1a1c30'));
      for (let k = 0; k < 3; k += 1) px.r(x + 6 + k * 2, ph - alto, 1, alto - 2, METAL[3]);
      px.texto(String(puerta % 10), x + 7, ph - alto - 7, BLANCO);
      if ((x / 14) % 2 === 1) for (let k = 0; k < 10; k += 1) px.r(x + 1, yFach + 9 + k, 3, 1, banderas[(k >> 2) % banderas.length]);
    }
    // Mástiles con banderas en la cubierta (ondean con el fotograma)
    for (let x = 8; x < pw - 10; x += 22) {
      px.r(x, yTecho - 9, 1, 10, METAL[0]);
      for (let k = 0; k < 7; k += 1) {
        const ola = Math.round(Math.sin((frame + k * 0.8) * 1.6));
        px.r(x + 1 + k, yTecho - 9 + ola, 1, 4, banderas[(Math.floor(x / 22) + (k > 3 ? 1 : 0)) % banderas.length]);
      }
    }
  } else {
    // De lado: filas que suben hacia fuera, con la cubierta en el borde de fuera y el perfil escalonado abajo
    const haciaE = o.mira === 'e';
    const cubierta = 8;
    const perfil = Math.round(o.alto / PX);
    const xCub = haciaE ? 1 : pw - 1 - cubierta;
    const x0 = haciaE ? cubierta + 1 : 1;
    const x1 = haciaE ? pw - 1 : pw - 1 - cubierta;
    // Cada grada (columna) de 6 píxeles: escalón con su canto y una fila de asientos con su aficionado cada 5
    let col = 0;
    for (let x = x0; x + 6 <= x1; x += 6, col += 1) {
      const subida = haciaE ? 1 - (x - x0) / (x1 - x0) : (x - x0) / (x1 - x0); // las de fuera, más altas y más al sol
      const luz = 0.86 + 0.18 * subida;
      px.r(x, 1, 6, ph - 2, por(HORMIGON[2], luz));
      px.r(haciaE ? x + 5 : x, 1, 1, ph - 2, por(HORMIGON[3], luz)); // tabica del escalón
      px.r(haciaE ? x : x + 5, 1, 1, ph - 2, por(HORMIGON[0], luz)); // canto iluminado
      for (let fila = 0, y = 2; y + 5 < ph - 2; y += 5, fila += 1) {
        px.r(x + 1, y + 3, 4, 2, por(asientos[(Math.floor(fila / 6) + col) % 2], luz * 0.9));
        const f = quien(fila, col);
        if (f) aficionado(px, x + 2, y, haciaE ? 'e' : 'o', por(f.cam, luz), f.piel, f.pelo, f.pose, f.bufanda);
      }
    }
    for (let y = 1; y < ph - 1; y += 1) px.r(xCub, y, cubierta, 1, y % 4 ? METAL[1] : METAL[2]);
    px.r(haciaE ? xCub + cubierta - 1 : xCub, 1, 1, ph - 2, METAL[3]);
    // Perfil del lado sur: escalones de hormigón, más alto por fuera
    for (let x = 1; x < pw - 1; x += 1) {
      const dentro = haciaE ? (x - 1) / (pw - 2) : 1 - (x - 1) / (pw - 2);
      const alto = Math.round(perfil * (1 - 0.6 * Math.floor(dentro * 6) / 6));
      const y0 = ph - 1 - alto;
      px.r(x, y0, 1, alto, HORMIGON[1]);
      px.p(x, y0, HORMIGON[0]);
    }
    px.r(Math.floor(pw / 2) - 4, ph - 11, 8, 10, C('#1a1c30')); // vomitorio
    px.r(Math.floor(pw / 2) - 4, ph - 11, 8, 1, HORMIGON[0]);
    for (let x = 3; x < pw - 3; x += 6) px.r(x, ph - 3, 3, 1, banderas[Math.floor(x / 6) % banderas.length]);
  }
  return px;
}

// ---------------------------------------------------------------------------------------------
// Estadio: vallas de led, porterías, banquillos y focos
// ---------------------------------------------------------------------------------------------

function pintarCartel(o, pw, ph, amb, frame) {
  const px = new Pixeles(pw, ph);
  const pal = PALETAS[amb.clave];
  const [fondo, claro] = pal.carteles[(o.semilla + frame) % pal.carteles.length].map(C);
  const cara = ph - 5;
  px.r(0, 0, pw, cara + 1, NEGRO);
  px.r(1, 1, pw - 2, cara - 1, fondo);
  px.r(1, 1, pw - 2, 1, mezcla(fondo, BLANCO, 0.35));
  // Píxeles del led (una rejilla muy suave) y el texto
  for (let y = 2; y < cara; y += 2) px.r(1, y, pw - 2, 1, por(fondo, 0.92));
  const textos = pal.textos;
  const i = (o.semilla + frame) % textos.length;
  rotulo(px, [textos[i], textos[(i + 1) % textos.length], 'LA GRADA', 'ATLETI'], 2, Math.floor((cara - 5) / 2) + 1, pw - 4, claro);
  px.r(0, cara, pw, 1, NEGRO);
  px.r(3, cara + 1, 2, ph - cara - 1, NEGRO);
  px.r(pw - 5, cara + 1, 2, ph - cara - 1, NEGRO);
  return px;
}

function pintarPorteria(o, pw, ph) {
  const px = new Pixeles(pw, ph);
  const L = 640;
  const frente = o.y < (Math.floor(o.y / L) + 0.5) * L; // la de arriba te enseña la boca; la de abajo, la red
  const fondo = Math.round((o.hBase ?? 30) / PX); // lo que mide la red hacia atrás
  const red = C('#e8ecf4');
  const poste = BLANCO;
  const posteSombra = C('#a9b0c4');
  if (frente) {
    // Red: techo y fondo vistos desde arriba, laterales en diagonal
    malla(px, 2, 0, pw - 4, fondo, red, 0.55);
    px.r(2, 0, pw - 4, 1, red, 0.8);
    malla(px, 2, fondo, pw - 4, ph - fondo, red, 0.3);
    for (let y = 0; y < ph - fondo; y += 1) { px.p(1 + Math.floor(y / 3), fondo + y, red, 0.6); px.p(pw - 2 - Math.floor(y / 3), fondo + y, red, 0.6); }
    // Larguero y postes
    px.r(0, fondo, pw, 3, NEGRO);
    px.r(1, fondo, pw - 2, 1, poste);
    px.r(1, fondo + 1, pw - 2, 1, posteSombra);
    px.r(0, fondo, 3, ph - fondo, NEGRO);
    px.r(pw - 3, fondo, 3, ph - fondo, NEGRO);
    px.r(1, fondo, 1, ph - fondo, poste);
    px.r(pw - 2, fondo, 1, ph - fondo, posteSombra);
  } else {
    // Vista desde detrás: larguero al fondo, la red delante
    px.r(0, 0, pw, 3, NEGRO);
    px.r(1, 0, pw - 2, 1, poste);
    px.r(1, 1, pw - 2, 1, posteSombra);
    px.r(0, 0, 3, ph - fondo, NEGRO);
    px.r(pw - 3, 0, 3, ph - fondo, NEGRO);
    px.r(1, 0, 1, ph - fondo, poste);
    px.r(pw - 2, 0, 1, ph - fondo, posteSombra);
    malla(px, 3, 2, pw - 6, ph - 2, red, 0.5);
    px.r(2, ph - 1, pw - 4, 1, red, 0.85);
    for (let y = 0; y < ph; y += 1) { px.p(2, y, red, 0.7); px.p(pw - 3, y, red, 0.7); }
  }
  return px;
}

function pintarBanquillo(o, pw, ph, amb) {
  const px = new Pixeles(pw, ph);
  const pal = PALETAS[amb.clave];
  const asiento = C(pal.banderas[0]);
  const plexi = C('#9cc4ee');
  if (o.vertical) {
    // A lo largo de la banda, visto desde arriba: asientos con suplentes bajo un techo transparente
    px.r(0, 0, pw, ph, NEGRO);
    px.r(1, 1, pw - 2, ph - 2, C('#3b4262'));
    for (let y = 3; y < ph - 4; y += 5) {
      px.r(3, y, pw - 6, 3, asiento);
      px.r(3, y, pw - 6, 1, por(asiento, 1.25));
      if (hash(y, o.semilla) < 0.7) {
        px.r(Math.floor(pw / 2) - 1, y, 3, 2, PELOS[Math.floor(hash(o.semilla, y) * PELOS.length)]);
        px.p(Math.floor(pw / 2) + 1, y + 1, PIELES[Math.floor(hash(y, 3) * 4)]);
      }
    }
    px.r(1, 1, Math.ceil(pw / 2), ph - 2, plexi, 0.35);
    px.r(1, 1, 1, ph - 2, plexi);
    for (let y = 1; y < ph - 1; y += 10) px.r(1, y, Math.ceil(pw / 2), 1, BLANCO, 0.5);
    return px;
  }
  const techo = Math.round((o.hBase ?? 40) / PX);
  px.r(0, 0, pw, ph, NEGRO);
  // Fondo y asientos con suplentes (se ven a través del techo)
  px.r(1, 1, pw - 2, ph - 2, C('#1d2347'));
  for (let x = 3; x + 5 < pw - 2; x += 6) {
    px.r(x, techo - 4, 5, 6, asiento);
    px.r(x, techo - 4, 5, 1, por(asiento, 1.25));
    if (hash(x, o.semilla) < 0.75) {
      const piel = PIELES[Math.floor(hash(x, o.semilla + 1) * 4)];
      px.r(x + 1, techo - 2, 3, 1, PELOS[Math.floor(hash(o.semilla, x) * PELOS.length)]);
      px.r(x + 1, techo - 1, 3, 2, piel);
      px.r(x, techo + 1, 5, 4, C(pal.banderas[1 % pal.banderas.length]));
      px.r(x + 1, techo + 2, 3, 1, asiento); // peto
    }
  }
  // Techo de plexiglás visto desde arriba y la estructura
  px.r(1, 1, pw - 2, techo - 2, plexi, 0.42);
  px.r(1, 1, pw - 2, 1, BLANCO, 0.8);
  for (let x = 1; x < pw - 1; x += 12) px.r(x, 1, 1, techo - 2, METAL[1]);
  px.r(1, techo - 1, pw - 2, 1, METAL[2]);
  px.r(1, ph - 3, pw - 2, 2, METAL[1]);
  px.r(1, ph - 3, pw - 2, 1, METAL[0]);
  return px;
}

function pintarFoco(pw, ph, amb) {
  const px = new Pixeles(pw, ph);
  const noche = PALETAS[amb.clave].noche > 0;
  const m = Math.floor(pw / 2);
  // Base de hormigón (tapa y frente)
  const yb = ph - 18;
  px.r(1, yb - 1, pw - 2, 19, NEGRO);
  caja(px, 2, yb, pw - 4, 9, 8, HORMIGON[0], HORMIGON[2]);
  // Mástil de celosía
  const y0 = 13;
  px.r(m - 3, y0, 6, yb - y0, NEGRO);
  px.r(m - 2, y0, 1, yb - y0, METAL[1]);
  px.r(m + 1, y0, 1, yb - y0, METAL[3]);
  for (let y = y0; y < yb; y += 1) { const k = (y - y0) % 6; px.p(m - 2 + Math.min(3, k), y, METAL[2]); px.p(m + 1 - Math.min(3, k), y, METAL[2]); }
  // Cabeza con la batería de focos y una pasarela
  px.r(0, 0, pw, 13, NEGRO);
  px.r(1, 1, pw - 2, 10, C('#3b4262'));
  for (let y = 2; y < 10; y += 3) {
    for (let x = 2; x + 2 < pw - 1; x += 3) {
      px.r(x, y, 2, 2, noche ? BLANCO : C('#fff3b0'));
      px.p(x + 1, y + 1, noche ? C('#cfe0ff') : C('#e6cf70'));
    }
  }
  px.r(1, 11, pw - 2, 1, METAL[1]);
  px.r(1, 12, pw - 2, 1, METAL[3]);
  return px;
}

// ---------------------------------------------------------------------------------------------
// Naturaleza: árboles y rocas
// ---------------------------------------------------------------------------------------------

/** Tamaño del dibujo de un árbol, en píxeles. */
const medidaArbol = (o) => ({ w: Math.round((o.copa * 2.3) / PX) + 4, h: Math.round((o.alto + o.copa * 0.7) / PX) });

function pintarArbol(o, amb) {
  const { w, h } = medidaArbol(o);
  const px = new Pixeles(w, h);
  const pal = PALETAS[amb.clave];
  const v = pal.arbol.map(C);
  const borde = [v[0][0] * 0.5, v[0][1] * 0.5, v[0][2] * 0.6];
  const m = w / 2;
  const s = o.semilla;
  const tronco = Math.round((o.alto * 0.32) / PX);
  const R = o.copa / PX;
  // Tronco con corteza, luz a la izquierda y raíces
  const corteza = [C('#8a6240'), C('#6e4b2a'), C('#4f3420')];
  const yT = h - tronco - 2;
  for (let y = yT; y < h; y += 1) {
    const raiz = y >= h - 3 ? (h - y === 1 ? 3 : 2) : 0;
    for (let x = Math.floor(m - 2 - raiz); x < Math.ceil(m + 2 + raiz); x += 1) {
      const k = (x - (m - 2 - raiz)) / (4 + raiz * 2);
      px.p(x, y, corteza[k < 0.3 ? 0 : k < 0.7 ? 1 : 2]);
    }
  }
  if (tronco > 6) px.p(Math.floor(m), yT + Math.floor(tronco / 2), corteza[2]);
  if (o.maceta) {
    px.r(m - 6, h - 6, 12, 6, C('#a65e3a'));
    px.r(m - 7, h - 7, 14, 2, C('#c67a50'));
    px.r(m - 6, h - 5, 12, 1, C('#7a4428'));
    px.r(m - 5, h - 7, 10, 1, C('#4f3420'));
  }
  if (o.especie === 'pino') {
    // Pisos de ramas: cada uno con luz a la izquierda, sombra a la derecha y el borde de abajo oscuro
    const pisos = 4;
    const altoCopa = yT + 3;
    for (let i = 0; i < pisos; i += 1) {
      const top = Math.floor((altoCopa * i * 0.72) / pisos);
      const fondo = Math.floor((altoCopa * (i + 1.35)) / (pisos + 0.35));
      const anchoMax = R * (0.45 + 0.55 * ((i + 1) / pisos)) * 1.05;
      for (let y = top; y < Math.min(fondo, h); y += 1) {
        const k = (y - top) / Math.max(1, fondo - top);
        const ancho = Math.max(1, anchoMax * (0.25 + 0.75 * k));
        for (let x = Math.floor(m - ancho); x < Math.ceil(m + ancho); x += 1) {
          const dx = (x + 0.5 - m) / ancho;
          const dit = BAYER[((y & 3) << 2) | (x & 3)];
          let tono = 2.2 - dx * 1.4 - k * 0.6 + (dit - 0.5) * 0.7;
          if (y >= fondo - 2) tono -= 1.2;
          px.p(x, y, v[Math.max(0, Math.min(4, Math.floor(tono)))]);
        }
      }
    }
    px.contorno(borde);
    return px;
  }
  // Frondoso: varias bolas de hojas
  const cy = yT - R * 0.72;
  const bolas = [
    [m, cy, R * 0.68], [m - R * 0.52, cy + R * 0.22, R * 0.52], [m + R * 0.55, cy + R * 0.2, R * 0.55],
    [m - R * 0.25, cy - R * 0.42, R * 0.5], [m + R * 0.3, cy - R * 0.36, R * 0.5], [m + (s % 2 ? 0.65 : -0.65) * R, cy - R * 0.05, R * 0.42],
  ];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let mejor = -9;
      let hondo = 0;
      const borde = 0.14 * hash(x + s, y * 3); // borde de la copa algo irregular
      for (const [bx, by, r] of bolas) {
        const dx = (x + 0.5 - bx) / r;
        const dy = (y + 0.5 - by) / r;
        const q = dx * dx + dy * dy - borde;
        if (q >= 1) continue;
        const luz = -dx * 0.6 - dy * 0.8;
        if (luz > mejor) { mejor = luz; hondo = q; }
      }
      if (mejor < -8) continue;
      const bajo = (y - (cy - R)) / (R * 2); // lo de abajo de la copa, más oscuro
      const dit = BAYER[((y & 3) << 2) | (x & 3)];
      let tono = 2 + mejor * 1.5 - Math.max(0, bajo - 0.6) * 2.2 + (dit - 0.5) * 0.9 - (hondo > 0.85 ? 0.4 : 0);
      if (hash(x * 3 + s, y) < 0.05) tono += 1; // hojas sueltas con brillo
      px.p(x, y, v[Math.max(0, Math.min(4, Math.floor(tono)))]);
    }
  }
  // Guirnaldas de luces en el Mundial
  if (amb.clave === 'mundial') {
    for (let i = 0; i < 14; i += 1) {
      const x = Math.floor(m - R + hash(i, s) * R * 2);
      const y = Math.floor(cy - R * 0.6 + hash(s, i) * R * 1.3);
      if (px.lleno(x, y)) px.p(x, y, i % 3 ? C('#ffe08a') : C('#ff9ec0'));
    }
  }
  px.contorno(borde);
  return px;
}

function pintarRoca(o, pw, ph) {
  const px = new Pixeles(pw, ph);
  const tonos = ['#c3c1c8', '#a4a2aa', '#86848e', '#67656f'].map(C);
  const musgo = hash(o.semilla, 1) < 0.5;
  for (let y = 0; y < ph; y += 1) {
    for (let x = 0; x < pw; x += 1) {
      const dx = (x + 0.5 - pw / 2) / (pw / 2 - 0.5);
      const dy = (y + 0.5 - ph * 0.56) / (ph * 0.46);
      if (dx * dx + dy * dy * 1.1 - 0.15 * hash(x + o.semilla, y) > 0.92) continue;
      // Caras: arriba clara, izquierda media, derecha oscura
      let t = dy < -0.25 ? 0 : dx < -0.1 ? 1 : dx < 0.45 ? 2 : 3;
      if (BAYER[((y & 3) << 2) | (x & 3)] < 0.12) t = Math.min(3, t + 1);
      px.p(x, y, tonos[t]);
      if (musgo && dy < -0.45 && hash(x, y + o.semilla) < 0.6) px.p(x, y, C('#5a8a3a'));
    }
  }
  px.p(Math.floor(pw * 0.55), Math.floor(ph * 0.5), tonos[3]);
  px.p(Math.floor(pw * 0.55) + 1, Math.floor(ph * 0.5) + 1, tonos[3]);
  px.contorno(C('#2a2834'));
  return px;
}

// ---------------------------------------------------------------------------------------------
// Ciudad: tienda, puesto, monumento, pantalla gigante, vallas, bancos, farolas y fuentes
// ---------------------------------------------------------------------------------------------

const MARCAS = [
  { colores: ['#c8102e', '#ffffff'], textos: ['LA GRADA', 'GRADA'] },
  { colores: ['#1b4fa8', '#ffffff'], textos: ['DEPORTES', 'SPORT'] },
  { colores: ['#1d1d24', '#ffd166'], textos: ['CAMISETAS', 'CAMIS'] },
  { colores: ['#0a7f42', '#ffffff'], textos: ['BOTAS Y BALONES', 'BOTAS'] },
];

/** Camiseta pequeña (5×6) colgada en una percha. */
function camiseta(px, x, y, c1, c2, rayas) {
  px.r(x + 2, y - 1, 1, 1, METAL[2]);
  px.r(x, y, 5, 2, c1);
  px.r(x + 1, y + 2, 3, 4, c1);
  if (rayas) { px.r(x + 1, y, 1, 6, c2); px.r(x + 3, y, 1, 6, c2); } else px.r(x + 1, y, 3, 1, c2);
}

function pintarTienda(o, pw, ph, amb) {
  const px = new Pixeles(pw, ph);
  const marca = MARCAS[(o.marca ?? o.semilla) % MARCAS.length];
  const [c1, c2] = marca.colores.map(C);
  const techo = Math.round((o.hBase ?? 96) / PX) - 4;
  px.r(0, 0, pw, ph, NEGRO);
  // Azotea de grava con pretil, máquina del aire acondicionado, lucernario y chimeneas
  px.r(1, 1, pw - 2, techo - 1, C('#8f8a84'));
  for (let i = 0; i < 120; i += 1) px.p(2 + Math.floor(hash(i, o.semilla) * (pw - 4)), 2 + Math.floor(hash(o.semilla, i) * (techo - 4)), hash(i, i + o.semilla) < 0.5 ? C('#a39d96') : C('#7c7771'));
  px.r(1, 1, pw - 2, 2, C('#c4beb4'));
  px.r(1, 1, 2, techo - 1, C('#b3ada3'));
  px.r(pw - 3, 1, 2, techo - 1, C('#6e6a64'));
  px.r(1, techo - 2, pw - 2, 2, C('#6e6a64'));
  caja(px, 8, 6, 14, 6, 4, METAL[1], METAL[3]);
  for (let x = 10; x < 20; x += 2) px.p(x, 8, METAL[3]);
  px.r(pw - 30, 8, 18, 10, C('#4a6a8a'));
  px.r(pw - 30, 8, 18, 1, C('#9cc4ee'));
  px.r(pw - 29, 9, 3, 8, C('#7a9aba'));
  px.r(30, techo - 12, 4, 4, METAL[2]);
  px.r(30, techo - 12, 4, 1, METAL[0]);
  // Fachada: rótulo, toldo de rayas con ondas, escaparate con camisetas y puerta
  const f = techo;
  px.r(1, f, pw - 2, ph - f - 1, C('#e8e2d6'));
  for (let y = f + 13; y < ph - 2; y += 3) px.r(1, y, pw - 2, 1, C('#ddd6c8'));
  px.r(1, f, pw - 2, 8, c1);
  px.r(1, f, pw - 2, 1, por(c1, 1.3));
  rotulo(px, marca.textos, 1, f + 2, pw - 2, c2);
  for (let x = 1; x < pw - 1; x += 1) {
    const raya = Math.floor((x - 1) / 4) % 2 ? c1 : BLANCO;
    px.r(x, f + 8, 1, 4, raya);
    if ((x - 1) % 4 !== 3) px.p(x, f + 12, por(raya, 0.85)); // ondas del borde
  }
  px.r(1, f + 13, pw - 2, 1, C('#b9b2a4'));
  const esc = f + 15;
  const altoEsc = ph - esc - 3;
  const anchoEsc = pw - 26;
  px.r(4, esc, anchoEsc, altoEsc, C('#2a3550'));
  px.r(4, esc + altoEsc - 3, anchoEsc, 3, C('#3d4a6a'));
  const paises = Object.keys(SELECCIONES);
  for (let x = 7, i = 0; x + 5 < 4 + anchoEsc - 1; x += 8, i += 1) {
    let cam = [C('#c8102e'), BLANCO];
    if (amb.clave === 'mundial') { const sel = SELECCIONES[paises[Math.floor(hash(x, o.semilla) * paises.length)]]; cam = [C(sel.camiseta.c), C(sel.camiseta.c2)]; }
    camiseta(px, x, esc + 3, cam[0], cam[1], amb.clave !== 'mundial' || i % 2 === 0);
  }
  for (let k = 0; k < altoEsc; k += 1) px.p(8 + k, esc + k, BLANCO, 0.18); // reflejo
  px.r(4, esc, anchoEsc, 1, BLANCO, 0.35);
  // Puerta de cristal y macetas
  const xp = pw - 18;
  px.r(xp, esc - 1, 12, altoEsc + 3, C('#5a3a22'));
  px.r(xp + 2, esc + 1, 8, altoEsc - 1, C('#3d5a7a'));
  px.r(xp + 2, esc + 1, 2, altoEsc - 1, C('#6a8aaa'));
  px.r(xp + 8, esc + Math.floor(altoEsc / 2), 1, 2, C('#ffd166'));
  for (const xm of [xp - 4, xp + 13]) {
    if (xm + 4 > pw - 1) continue;
    px.r(xm, ph - 6, 4, 4, C('#a65e3a'));
    px.r(xm - 1, ph - 10, 6, 4, C('#3d8a3a'));
    px.p(xm, ph - 10, C('#69bf57'));
  }
  if (amb.clave !== 'inicio') {
    const ban = PALETAS[amb.clave].banderas.map(C);
    for (let x = 2; x < pw - 2; x += 3) px.p(x, f + 14 + (Math.floor(x / 3) % 2), ban[Math.floor(x / 3) % ban.length]); // guirnalda
  }
  return px;
}

function pintarKiosco(o, pw, ph, amb, mundo) {
  const px = new Pixeles(pw, ph);
  const pal = PALETAS[amb.clave];
  const colores = aficionDe(amb, mundo).map(C);
  const toldo = C(pal.banderas[0]);
  px.r(0, 0, pw, ph, NEGRO);
  // Toldo de rayas visto desde arriba, con ondas al borde
  for (let x = 1; x < pw - 1; x += 1) {
    const raya = Math.floor((x - 1) / 3) % 2 ? toldo : BLANCO;
    for (let y = 1; y < 13; y += 1) px.p(x, y, por(raya, 1 - (y - 1) * 0.012));
    if ((x - 1) % 3 !== 2) px.p(x, 13, por(raya, 0.82));
  }
  px.r(1, 1, pw - 2, 1, BLANCO, 0.5);
  // Interior con el vendedor y bufandas colgadas
  px.r(1, 14, pw - 2, ph - 15, C('#4a2f1c'));
  px.r(1, 14, pw - 2, 2, C('#2a1a10'));
  const mx = Math.floor(pw / 2);
  px.r(mx - 2, 18, 4, 2, PELOS[o.semilla % PELOS.length]);
  px.r(mx - 2, 20, 4, 3, PIELES[(o.semilla >> 2) % 4]);
  px.r(mx - 3, 23, 6, 6, colores[0]);
  for (let x = 3; x < pw - 4; x += 4) {
    if (Math.abs(x - mx) < 5) continue;
    const c = colores[Math.floor(hash(x, o.semilla) * colores.length)];
    const largo = 9 + Math.floor(hash(o.semilla, x) * 6);
    for (let k = 0; k < largo; k += 1) px.r(x, 16 + k, 2, 1, k % 4 < 2 ? c : BLANCO);
    px.p(x, 16 + largo, c); px.p(x + 1, 16 + largo + 1, c);
  }
  // Mostrador de madera con latas y bufandas dobladas encima
  const yM = ph - 14;
  px.r(1, yM, pw - 2, 3, C('#b08a5c'));
  px.r(1, yM, pw - 2, 1, C('#d0aa78'));
  px.r(1, yM + 3, pw - 2, ph - yM - 4, C('#7a5532'));
  for (let y = yM + 6; y < ph - 1; y += 3) px.r(1, y, pw - 2, 1, C('#5f4023'));
  for (let x = 4; x < pw - 5; x += 5) {
    const c = colores[Math.floor(hash(x + 3, o.semilla) * colores.length)];
    px.r(x, yM - 2, 3, 2, c);
    px.p(x, yM - 2, BLANCO);
  }
  return px;
}

function pintarTrofeo(px, clave, x, y) {
  // (x, y) = base del trofeo; se dibuja hacia arriba, con luz a la izquierda
  const oro = ['#8a6508', '#c9960f', '#ffd166', '#fff3b0'].map(C);
  const plata = ['#5d6684', '#9aa2c0', '#d4d9e6', '#ffffff'].map(C);
  const vol = (x0, y0, w, h, p) => { // pieza redondeada con brillo y sombra
    px.r(x0, y0, w, h, p[1]);
    px.r(x0, y0, Math.max(1, Math.floor(w / 3)), h, p[2]);
    px.r(x0 + 1, y0 + 1, 1, Math.max(1, h - 2), p[3]);
    px.r(x0 + w - Math.max(1, Math.floor(w / 4)), y0, Math.max(1, Math.floor(w / 4)), h, p[0]);
  };
  if (clave === 'copa') { // copa con asas y corona
    vol(x - 4, y - 5, 9, 5, plata); vol(x - 1, y - 12, 3, 7, plata); vol(x - 7, y - 24, 15, 12, plata);
    px.r(x - 9, y - 22, 2, 6, plata[1]); px.r(x + 8, y - 22, 2, 6, plata[0]);
    vol(x - 5, y - 28, 11, 4, oro);
    for (const xx of [x - 5, x, x + 5]) px.r(xx, y - 31, 1, 3, oro[2]);
    px.p(x, y - 26, C('#c8102e'));
  } else if (clave === 'liga') { // trofeo alto
    vol(x - 5, y - 5, 11, 5, plata); vol(x - 1, y - 18, 3, 13, plata); vol(x - 6, y - 34, 13, 16, plata);
    px.r(x - 6, y - 26, 13, 2, C('#c8102e'));
  } else if (clave === 'champions') { // copa de orejas grandes
    vol(x - 5, y - 5, 11, 5, plata); vol(x - 1, y - 13, 3, 8, plata); vol(x - 6, y - 30, 13, 17, plata);
    for (const sx of [-1, 1]) {
      const xo = sx < 0 ? x - 11 : x + 8;
      px.r(xo, y - 29, 4, 2, plata[2]); px.r(xo + (sx < 0 ? 0 : 2), y - 29, 2, 12, sx < 0 ? plata[2] : plata[0]); px.r(xo, y - 19, 4, 2, plata[1]);
    }
  } else if (clave === 'mundial') { // trofeo dorado con el mundo arriba
    vol(x - 6, y - 6, 13, 6, oro); px.r(x - 6, y - 4, 13, 2, C('#1d6b3a'));
    vol(x - 3, y - 22, 7, 16, oro);
    for (let yy = 0; yy < 12; yy += 1) for (let xx = 0; xx < 12; xx += 1) {
      const dx = xx - 5.5;
      const dy = yy - 5.5;
      if (dx * dx + dy * dy > 34) continue;
      px.p(x - 6 + xx, y - 35 + yy, oro[dx + dy < -3 ? 3 : dx + dy < 3 ? 2 : 1]);
    }
  } else { // balón gigante
    for (let yy = 0; yy < 20; yy += 1) for (let xx = 0; xx < 20; xx += 1) {
      const dx = xx - 9.5;
      const dy = yy - 9.5;
      const d2 = dx * dx + dy * dy;
      if (d2 > 96) continue;
      const parche = (Math.abs(dx) < 3 && Math.abs(dy) < 3) || (Math.abs(dx) > 7 && Math.abs(dy) < 2) || (Math.abs(dy) > 7 && Math.abs(dx) < 2.5);
      px.p(x - 10 + xx, y - 21 + yy, parche ? C('#1d2140') : dx + dy < -6 ? BLANCO : dx + dy > 6 ? C('#c4c9d6') : C('#eef1f6'));
    }
  }
}

/** Agua de una fuente vista desde arriba: elipse con borde de piedra, pared de dentro y agua con brillos animados. */
function pileta(px, x0, y0, w, h, frame, alto) {
  const piedra = ['#e2dacb', '#cfc6b4', '#aea493', '#8a8070'].map(C);
  const agua = ['#2f6fa8', '#3f86c0', '#5aa0d6', '#c8e8ff'].map(C);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = (x + 0.5 - w / 2) / (w / 2);
      const dy = (y + 0.5 - h / 2) / (h / 2);
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      let c;
      if (d2 > 0.74) c = piedra[dy < 0 ? (dx < 0.2 ? 0 : 1) : (d2 > 0.9 ? 3 : 2)]; // borde: arriba claro, delante el canto
      else if (dy < 0 && d2 > 0.74 - alto) c = piedra[3]; // pared de dentro, que se ve al fondo
      else {
        const ola = Math.sin(dx * 9 + dy * 6 + frame * 2.1);
        c = agua[ola > 0.75 ? 2 : dy < -0.2 ? 0 : 1];
        if (hash(x + frame * 7, y) < 0.04) c = agua[3];
      }
      px.p(x0 + x, y0 + y, c);
    }
  }
}

function pintarMonumento(o, pw, ph, amb, frame) {
  const px = new Pixeles(pw, ph);
  const base = Math.round((o.hBase ?? 70) / PX);
  const top = ph - base;
  pileta(px, 0, top, pw, base, frame, 0.22);
  // Pedestal de piedra con escalón y placa dorada
  const m = Math.floor(pw / 2);
  const yP = top + Math.floor(base / 2) + 4;
  px.r(m - 9, yP - 16, 18, 18, NEGRO);
  caja(px, m - 8, yP - 15, 16, 4, 12, C('#d4cdbd'), C('#a8a090'));
  px.r(m - 8, yP - 11, 3, 12, C('#bfb7a6'));
  px.r(m - 4, yP - 7, 8, 4, C('#c9960f'));
  px.r(m - 3, yP - 6, 6, 1, C('#ffd166'));
  pintarTrofeo(px, amb.clave, m, yP - 15);
  // Chorros de agua alrededor del pedestal
  for (let i = 0; i < 4; i += 1) {
    const ang = (i / 4) * Math.PI * 2 + frame * 0.3;
    const xx = Math.round(m + Math.cos(ang) * 14);
    const yy = Math.round(yP + 3 + Math.sin(ang) * 6);
    px.r(xx, yy - 4 - (frame + i) % 2, 1, 4, C('#c8e8ff'), 0.8);
  }
  return px;
}

function pintarPantalla(o, pw, ph, amb, frame) {
  const px = new Pixeles(pw, ph);
  const pal = PALETAS[amb.clave];
  const pie = Math.round((o.hBase ?? 30) / PX);
  const alto = ph - pie;
  // Patas de celosía
  for (const xl of [6, pw - 11]) {
    px.r(xl, alto - 6, 5, pie + 6, NEGRO);
    px.r(xl + 1, alto - 6, 1, pie + 6, METAL[1]);
    px.r(xl + 3, alto - 6, 1, pie + 6, METAL[3]);
    for (let y = alto - 6; y < ph; y += 3) px.p(xl + 2, y, METAL[2]);
  }
  // Marco, altavoces y la pantalla con el partido en directo
  px.r(0, 0, pw, alto - 3, NEGRO);
  px.r(1, 1, pw - 2, alto - 5, C('#2a2f45'));
  px.r(1, 1, pw - 2, 1, C('#4a5070'));
  const [acento] = pal.carteles[0].map(C);
  px.r(1, alto - 6, pw - 2, 2, acento);
  const x0 = 8;
  const y0 = 4;
  const w = pw - 16;
  const h = alto - 13;
  // Césped con franjas, líneas y jugadores que se mueven
  for (let y = 0; y < h; y += 1) px.r(x0, y0 + y, w, 1, Math.floor(y / 4) % 2 ? C('#3f9a3d') : C('#4aa846'));
  px.r(x0, y0 + 8, w, 1, BLANCO, 0.7);
  px.r(x0 + Math.floor(w / 2), y0 + 8, 1, h - 8, BLANCO, 0.7);
  px.r(x0 + 2, y0 + 8, 1, h - 10, BLANCO, 0.5); px.r(x0 + w - 3, y0 + 8, 1, h - 10, BLANCO, 0.5);
  for (let i = 0; i < 10; i += 1) {
    const rojo = i < 5;
    const bx = x0 + 4 + Math.floor((hash(i, 5) * (w - 8) + Math.sin(frame * 1.6 + i) * 3 + w) % (w - 8));
    const by = y0 + 11 + Math.floor(hash(5, i) * (h - 14) + Math.cos(frame * 1.3 + i * 2) * 1.5);
    px.r(bx, by, 2, 3, rojo ? C('#c8102e') : C('#1b4fa8'));
    if (rojo) px.p(bx + 1, by, BLANCO);
  }
  px.r(x0 + 10 + ((frame * 9) % (w - 20)), y0 + 13 + (frame % 2) * 3, 2, 2, BLANCO);
  // Marcador arriba
  px.r(x0, y0, w, 8, C('#101428'));
  px.texto('ATL 1-0', x0 + 3, y0 + 2, BLANCO);
  px.r(x0 + w - 8, y0 + 3, 3, 3, frame % 2 ? C('#ff3b3b') : C('#8a1a1a'));
  for (let y = y0; y < y0 + h; y += 2) px.r(x0, y, w, 1, BLANCO, 0.05);
  px.r(0, 6, 5, alto - 16, C('#1d2140'));
  px.r(pw - 5, 6, 5, alto - 16, C('#1d2140'));
  for (let y = 8; y < alto - 12; y += 3) { px.p(2, y, C('#3b4262')); px.p(pw - 3, y, C('#3b4262')); }
  return px;
}

function pintarValla(o, pw, ph) {
  const px = new Pixeles(pw, ph);
  const red = o.jaula ? C('#4a8a5a') : C('#c9ced9');
  const posteC = o.jaula ? C('#2f5a3a') : METAL[3];
  if (o.vertical) {
    // De norte a sur, vista desde arriba: cara iluminada, pasamanos y postes
    px.r(0, 0, pw, ph, red, 0.35);
    malla(px, 0, 0, pw - 2, ph, red, 0.75, 3);
    px.r(pw - 2, 0, 1, ph, por(red, 1.25));
    px.r(pw - 1, 0, 1, ph, posteC);
    for (let y = 1; y < ph; y += 10) { px.r(pw - 3, y, 3, 3, posteC); px.p(pw - 3, y, por(red, 1.3)); }
    return px;
  }
  const alto = ph - Math.round(o.h / PX);
  malla(px, 0, 1, pw, alto, red, 0.8, 3);
  px.r(0, 0, pw, 1, por(red, 1.2));
  px.r(0, 1, pw, 1, posteC);
  for (let x = 0; x < pw; x += 10) {
    px.r(x, 0, 2, ph, posteC);
    px.p(x, 0, por(red, 1.3));
  }
  px.r(0, ph - 1, pw, 1, posteC, 0.6);
  return px;
}

function pintarBanco(pw, ph) {
  const px = new Pixeles(pw, ph);
  const madera = ['#c08a52', '#a0703f', '#80562e'].map(C);
  // Respaldo (dos listones), asiento (tres listones vistos desde arriba) y patas de hierro
  px.r(2, 1, pw - 4, 2, madera[0]);
  px.r(2, 3, pw - 4, 1, madera[2]);
  px.r(2, 4, pw - 4, 2, madera[1]);
  for (const x of [3, pw - 5]) px.r(x, 0, 2, 9, C('#3a3e4c'));
  for (let k = 0; k < 3; k += 1) {
    px.r(1, 7 + k * 2, pw - 2, 1, madera[k === 0 ? 0 : 1]);
    px.r(1, 8 + k * 2, pw - 2, 1, madera[2]);
  }
  for (const x of [3, pw - 5]) { px.r(x, 13, 2, ph - 13, C('#3a3e4c')); px.p(x, 13, C('#6a7080')); }
  px.contorno(NEGRO);
  return px;
}

function pintarFarola(o, pw, ph, amb) {
  const px = new Pixeles(pw, ph);
  const pal = PALETAS[amb.clave];
  const m = Math.floor(pw / 2);
  const hierro = ['#4a5064', '#2c3040', '#7a8296'].map(C);
  // Pie, poste con anillo y farol
  px.r(m - 2, ph - 4, 4, 4, hierro[1]);
  px.r(m - 2, ph - 4, 1, 4, hierro[2]);
  px.r(m - 1, 9, 2, ph - 12, hierro[0]);
  px.r(m - 1, 9, 1, ph - 12, hierro[2]);
  px.r(m - 2, Math.floor(ph * 0.55), 4, 2, hierro[1]);
  px.r(m - 3, 0, 6, 2, hierro[1]); // sombrerete
  px.r(m - 4, 2, 8, 1, hierro[1]);
  px.r(m - 3, 3, 6, 5, pal.noche ? C('#fff6c8') : C('#e8e2c0'));
  px.r(m - 3, 3, 1, 5, hierro[1]); px.r(m + 2, 3, 1, 5, hierro[1]);
  if (pal.noche) px.r(m - 2, 4, 3, 3, BLANCO);
  px.r(m - 3, 8, 6, 1, hierro[1]);
  if (amb.clave !== 'inicio') { // banderola colgada
    const ban = pal.banderas.map(C);
    px.r(m + 1, 14, 4, 1, hierro[1]);
    for (let y = 0; y < 10; y += 1) px.r(m + 2, 15 + y, 3, 1, ban[Math.floor(y / 4) % ban.length]);
    px.p(m + 2, 25, ban[0]); px.p(m + 4, 25, ban[0]);
  }
  px.contorno(NEGRO);
  return px;
}

function pintarFuente(o, pw, ph, frame) {
  const px = new Pixeles(pw, ph);
  pileta(px, 0, 0, pw, ph, frame, 0.28);
  // Surtidor en el centro con el chorro
  const m = Math.floor(pw / 2);
  const c = Math.floor(ph / 2);
  px.r(m - 3, c - 2, 6, 5, C('#cfc6b4'));
  px.r(m - 3, c - 2, 6, 1, C('#e2dacb'));
  px.r(m + 1, c - 1, 2, 4, C('#aea493'));
  const alto = 6 + (frame % 2);
  px.r(m - 1, c - 2 - alto, 2, alto, C('#c8e8ff'), 0.85);
  px.p(m - 2 - (frame % 2), c - 2 - alto + 1, C('#c8e8ff'));
  px.p(m + 1 + (frame % 2), c - 2 - alto + 1, C('#c8e8ff'));
  return px;
}

// ---------------------------------------------------------------------------------------------
// Caché y dibujo
// ---------------------------------------------------------------------------------------------

const sprites = new Map();
const MAX_SPRITES = 1400;
const SIN_SPRITE = new Set(['talud']);
/** ¿Cambia el dibujo con el ambiente? (las rocas, por ejemplo, no). */
const POR_AMBIENTE = new Set(['grada', 'cartel', 'banquillo', 'foco', 'arbol', 'tienda', 'kiosco', 'monumento', 'pantalla', 'farola']);

/** Fotograma de la animación de cada cosa en el instante t (0 si no se mueve). */
function fotograma(o, t, reducido) {
  if (o.tipo === 'grada') return reducido ? 0 : Math.floor(t * 3.2 + (o.semilla % 7) * 0.37) % 4;
  if (o.tipo === 'cartel') return Math.floor(t / 3.5 + (o.semilla % 5) * 0.21) % 2;
  if (o.tipo === 'pantalla') return reducido ? 0 : Math.floor(t * 2.5) % 4;
  if (o.tipo === 'monumento' || o.tipo === 'fuente') return reducido ? 0 : Math.floor(t * 3 + (o.semilla % 3)) % 3;
  return 0;
}

function spriteObstaculo(ob, amb, mundo, frame) {
  const clave = `${ob.id}:${POR_AMBIENTE.has(ob.tipo) ? amb.clave : ''}:${frame}`;
  let c = sprites.get(clave);
  if (c) return c;
  const o = ob;
  const pw = Math.max(2, Math.round(o.w / PX));
  const ph = Math.max(2, Math.round(MACIZOS.has(o.tipo) ? o.h / PX : (o.h + o.alto) / PX));
  let px;
  switch (o.tipo) {
    case 'grada': px = pintarGrada(o, pw, ph, amb, mundo, frame); break;
    case 'cartel': px = pintarCartel(o, pw, ph, amb, frame); break;
    case 'porteria': px = pintarPorteria(o, pw, ph); break;
    case 'banquillo': px = pintarBanquillo(o, pw, ph, amb); break;
    case 'foco': px = pintarFoco(pw, ph, amb); break;
    case 'arbol': px = pintarArbol(o, amb); break;
    case 'tienda': px = pintarTienda(o, pw, ph, amb); break;
    case 'kiosco': px = pintarKiosco(o, pw, ph, amb, mundo); break;
    case 'monumento': px = pintarMonumento(o, pw, ph, amb, frame); break;
    case 'pantalla': px = pintarPantalla(o, pw, ph, amb, frame); break;
    case 'valla': px = pintarValla(o, pw, ph); break;
    case 'banco': px = pintarBanco(pw, ph); break;
    case 'farola': px = pintarFarola(o, 12, Math.round((o.alto + o.h) / PX), amb); break;
    case 'roca': px = pintarRoca(o, pw, ph); break;
    case 'fuente': px = pintarFuente(o, pw, Math.round(o.h / PX), frame); break;
    default: px = new Pixeles(pw, ph); px.r(0, 0, pw, ph, C('#888888'));
  }
  c = px.aLienzo();
  if (sprites.size > MAX_SPRITES) sprites.delete(sprites.keys().next().value);
  sprites.set(clave, c);
  return c;
}

/** Dibuja un obstáculo de pie sobre su sitio (en coordenadas del mundo). Su sombra ya está en el suelo. */
export function dibujarObstaculo(ctx, o, amb, mundo, t) {
  if (SIN_SPRITE.has(o.tipo)) return;
  const c = spriteObstaculo(o, amb, mundo, fotograma(o, t, mundo.efectosReducidos));
  const w = c.width * PX;
  const h = c.height * PX;
  if (o.tipo === 'arbol') {
    // Si estás detrás de la copa, se vuelve transparente para que no te pierdas de vista
    const j = mundo.jugador;
    const detras = j && j.y < o.y && j.y > o.y - h - 20 && Math.abs(j.x - o.x) < w / 2 + 8;
    if (detras) ctx.globalAlpha = 0.45;
    ctx.drawImage(c, o.x - w / 2, o.y + o.h / 2 - h, w, h);
    ctx.globalAlpha = 1;
    return;
  }
  if (o.tipo === 'farola') {
    ctx.drawImage(c, o.x - w / 2, o.y + o.h / 2 - h, w, h);
    return;
  }
  if (o.tipo === 'fuente') {
    ctx.drawImage(c, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
    return;
  }
  // Los macizos ya incluyen su altura en `h` (lo que se ve es lo que choca); el resto se dibuja hacia arriba
  if (MACIZOS.has(o.tipo)) ctx.drawImage(c, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
  else ctx.drawImage(c, o.x - o.w / 2, o.y - o.h / 2 - o.alto, o.w, o.h + o.alto);
}

/** Obstáculos que se dibujan pegados al suelo (antes que nadie): no tapan a nadie. */
export const esDeSuelo = (o) => o.tipo === 'fuente' || o.tipo === 'talud';

// ---------------------------------------------------------------------------------------------
// Adornos: las matas y las piedras ya están pintadas en el suelo; aquí, las banderas que ondean
// ---------------------------------------------------------------------------------------------

function spriteBandera(colores, frame) {
  const clave = `b:${colores.join()}:${frame}`;
  let c = sprites.get(clave);
  if (c) return c;
  const px = new Pixeles(16, 37);
  const [c1, c2] = colores.map(C);
  px.r(0, 0, 2, 37, NEGRO);
  px.r(0, 0, 1, 37, METAL[1]);
  px.r(0, 0, 2, 1, C('#ffd166'));
  for (let k = 0; k < 13; k += 1) {
    const fase = frame * (Math.PI / 3) - k * 0.55;
    const ola = Math.round(Math.sin(fase) * 1.3 * (k / 12));
    const luz = 0.86 + 0.14 * Math.cos(fase);
    px.r(2 + k, 1 + ola, 1, 4, por(c1, luz));
    px.r(2 + k, 5 + ola, 1, 4, por(c2, luz));
  }
  c = px.aLienzo();
  sprites.set(clave, c);
  return c;
}

export function dibujarAdorno(ctx, d, amb, t) {
  if (d.tipo !== 'bandera') return; // matas y piedras: en la textura del suelo
  const pal = PALETAS[amb.clave];
  const colores = [pal.banderas[d.semilla % pal.banderas.length], pal.banderas[(d.semilla + 1) % pal.banderas.length]];
  const c = spriteBandera(colores, Math.floor(t * 7 + (d.semilla % 6)) % 6);
  ctx.drawImage(c, d.x - 1, d.y - 72, c.width * PX, c.height * PX);
}

export const numeroSprites = () => sprites.size;
