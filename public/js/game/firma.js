// Animación de la firma de un contrato (pixel art, unos 5 segundos): el contrato del Atleti llega a la mesa,
// se rellenan las cláusulas, el boli escribe el nombre del fichaje y cae el sello de «¡FICHADO!».
// Se dibuja en un lienzo pequeño que se amplía sin suavizar. Se puede saltar con un clic o una tecla.
import { obtenerSprite } from './sprites.js';

const W = 256;
const H = 160;

// Letra de píxeles de 3×5 (cada fila, 3 bits). Las tildes se quitan antes de dibujar.
const LETRAS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', Ñ: '111000110101101',
  O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110',
  T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111',
  3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110', '.': '000000000000010', ',': '000000000010100', ':': '000010000010000',
  '-': '000000111000000', '¡': '010000010010010', '!': '010010010000010', '/': '001001010100100', "'": '010010000000000',
  ' ': '000000000000000',
};
const sinTildes = (t) => t.toUpperCase().replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I').replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U');

/** Escribe `texto` con la letra de píxeles. `k` = tamaño del píxel. Devuelve el ancho. */
function escribir(ctx, texto, x, y, color, k = 1) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of sinTildes(texto)) {
    const g = LETRAS[ch] ?? LETRAS[' '];
    for (let i = 0; i < 15; i += 1) if (g[i] === '1') ctx.fillRect(cx + (i % 3) * k, y + Math.floor(i / 3) * k, k, k);
    cx += 4 * k;
  }
  return cx - x;
}
const anchoTexto = (texto, k = 1) => sinTildes(texto).length * 4 * k - k;

function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** La firma «a mano»: el nombre en letra cursiva, pasado a píxeles (sin suavizado). */
function lienzoFirma(nombre) {
  const c = document.createElement('canvas');
  c.width = 120;
  c.height = 22;
  const cx = c.getContext('2d');
  let tam = 15;
  cx.font = `italic 600 ${tam}px "Brush Script MT", "Segoe Script", cursive`;
  while (cx.measureText(nombre).width > 112 && tam > 8) { tam -= 1; cx.font = `italic 600 ${tam}px "Brush Script MT", "Segoe Script", cursive`; }
  cx.fillStyle = '#000';
  cx.textBaseline = 'middle';
  cx.fillText(nombre, 3, 12);
  const img = cx.getImageData(0, 0, c.width, c.height);
  let maxX = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const on = img.data[i + 3] > 110;
    img.data[i] = 22; img.data[i + 1] = 38; img.data[i + 2] = 120; img.data[i + 3] = on ? 255 : 0;
    if (on) maxX = Math.max(maxX, (i / 4) % c.width);
  }
  cx.putImageData(img, 0, 0);
  // Rúbrica: un trazo que vuelve por debajo del nombre
  cx.fillStyle = 'rgb(22,38,120)';
  for (let x = 4; x < maxX + 6; x += 1) cx.fillRect(x, 19 + Math.round(Math.sin(x / 9) * 1.2), 1, 1);
  return { lienzo: c, ancho: Math.min(c.width, maxX + 8) };
}

/** Fondo: mesa de madera con la luz de un flexo. */
function pintarMesa(ctx) {
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const veta = Math.sin(y * 0.55 + Math.sin(x * 0.04) * 3) * 0.5 + 0.5;
      const h = hash(x, y);
      const base = [92 + veta * 26 + h * 8, 54 + veta * 14 + h * 6, 30 + veta * 8];
      const luz = Math.max(0, 1 - Math.hypot(x - W * 0.42, y - H * 0.35) / 190);
      ctx.fillStyle = `rgb(${base[0] * (0.55 + 0.6 * luz)},${base[1] * (0.55 + 0.6 * luz)},${base[2] * (0.55 + 0.6 * luz)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/**
 * Reproduce la animación en `contenedor`. Devuelve una promesa que se resuelve al terminar (o al saltarla).
 * @param {HTMLElement} contenedor
 * @param {{ nombre: string, aspecto: object, rareza: { nombre: string, color: string }, posicion?: string, duracion?: number }} datos
 */
export function animarFirma(contenedor, { nombre, aspecto, rareza, posicion = '', duracion = 5000 }) {
  const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const total = reducido ? 1600 : duracion;
  const capa = document.createElement('div');
  capa.className = 'firma';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', `Firmando el contrato de ${nombre}`);
  const lienzo = document.createElement('canvas');
  lienzo.width = W;
  lienzo.height = H;
  lienzo.className = 'firma__lienzo';
  const pista = document.createElement('p');
  pista.className = 'firma__pista';
  pista.textContent = 'Pulsa para saltar';
  capa.append(lienzo, pista);
  contenedor.append(capa);
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const mesa = document.createElement('canvas');
  mesa.width = W;
  mesa.height = H;
  pintarMesa(mesa.getContext('2d'));
  const firma = lienzoFirma(nombre);
  const sprite = obtenerSprite(`firma:${nombre}`, aspecto);

  // Papel
  const PW = 168;
  const PH = 138;
  const px0 = Math.round((W - PW) / 2) - 18;
  const lineas = [[0.95, 0], [0.8, 1], [0.9, 2], [0.62, 3], [0.88, 5], [0.7, 6]];

  return new Promise((resolver) => {
    let inicio = null;
    let acabado = false;
    const terminar = () => {
      if (acabado) return;
      acabado = true;
      capa.classList.add('firma--fuera');
      window.removeEventListener('keydown', terminar);
      setTimeout(() => { capa.remove(); resolver(); }, reducido ? 0 : 260);
    };
    capa.addEventListener('click', terminar);
    window.addEventListener('keydown', terminar);

    function fotograma(ahora) {
      if (acabado) return;
      if (inicio === null) inicio = ahora;
      const t = (ahora - inicio) / total; // 0..1
      ctx.drawImage(mesa, 0, 0);

      // 1) El papel entra desde abajo (0 – 0,12)
      const entra = Math.min(1, t / 0.12);
      const suave = 1 - (1 - entra) ** 3;
      const py0 = Math.round(H + 4 - (H + 4 - 11) * suave);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(px0 + 4, py0 + 4, PW, PH);
      ctx.fillStyle = '#f4ecd8';
      ctx.fillRect(px0, py0, PW, PH);
      ctx.fillStyle = '#e6dcc2';
      for (let i = 0; i < 40; i += 1) ctx.fillRect(px0 + Math.floor(hash(i, 3) * PW), py0 + Math.floor(hash(3, i) * PH), 1, 1);
      // Franjas rojiblancas arriba y título
      for (let x = 0; x < PW; x += 1) {
        ctx.fillStyle = Math.floor(x / 6) % 2 ? '#ffffff' : '#c8102e';
        ctx.fillRect(px0 + x, py0, 1, 7);
      }
      ctx.fillStyle = '#1b2a5c';
      ctx.fillRect(px0, py0 + 7, PW, 2);
      escribir(ctx, 'CONTRATO PROFESIONAL', px0 + 8, py0 + 14, '#1b2a5c', 1);
      escribir(ctx, 'CLUB ATLETICO DE MADRID', px0 + 8, py0 + 22, '#c8102e', 1);
      // Foto del jugador (esquina superior derecha)
      const fx = px0 + PW - 34;
      const fy = py0 + 13;
      ctx.fillStyle = '#1b2a5c';
      ctx.fillRect(fx - 1, fy - 1, 26, 30);
      ctx.fillStyle = '#d9e4f2';
      ctx.fillRect(fx, fy, 24, 28);
      ctx.drawImage(sprite.frames[0], 0, 0, 16, 14, fx, fy + 4, 24, 21);

      // 2) Cláusulas que se van escribiendo (0,12 – 0,32)
      const clausulas = Math.max(0, Math.min(1, (t - 0.12) / 0.2));
      lineas.forEach(([largo, fila], i) => {
        const k = Math.max(0, Math.min(1, clausulas * lineas.length - i));
        if (k <= 0) return;
        ctx.fillStyle = '#9a917c';
        const yy = py0 + 34 + fila * 6;
        const ancho = Math.round((PW - 48) * largo * k);
        for (let x = 0; x < ancho; x += 1) if (hash(x + i * 31, fila) > 0.18) ctx.fillRect(px0 + 8 + x, yy, 1, 2);
      });
      if (clausulas > 0.6) {
        escribir(ctx, `JUGADOR: ${nombre}`.slice(0, 34), px0 + 8, py0 + 82, '#1b2a5c', 1);
        if (posicion) escribir(ctx, posicion, px0 + 8, py0 + 90, '#7a705c', 1);
      }
      // Línea de la firma («FIRMA:» a la izquierda y la línea de puntos donde escribe el boli)
      escribir(ctx, 'FIRMA:', px0 + 8, py0 + 116, '#7a705c', 1);
      const lx = px0 + 34;
      const ly = py0 + 121;
      for (let x = 0; x < 122; x += 2) { ctx.fillStyle = '#7a705c'; ctx.fillRect(lx + x, ly + 1, 1, 1); }

      // 3) El boli escribe el nombre (0,34 – 0,78)
      const escrito = Math.max(0, Math.min(1, (t - 0.34) / 0.44));
      const hasta = Math.round(firma.ancho * escrito);
      if (hasta > 0) ctx.drawImage(firma.lienzo, 0, 0, hasta, firma.lienzo.height, lx, ly - 20, hasta, firma.lienzo.height);
      const enMano = t > 0.28 && t < 0.86;
      if (enMano) {
        // Boli: sube y baja un poco al escribir y se va al acabar
        const bx = lx + hasta + (escrito >= 1 ? (t - 0.78) * 400 : 0);
        const by = ly - 12 + (escrito > 0 && escrito < 1 ? Math.round(Math.sin(t * 160) * 2) : -6);
        pintarBoli(ctx, Math.round(bx), Math.round(by));
      }

      // 4) Sello de ¡FICHADO! (0,8 – 0,88) con sacudida, y la rareza debajo
      if (t > 0.8) {
        const k = Math.min(1, (t - 0.8) / 0.08);
        const escala = 1 + (1 - k) * 1.6;
        const tw = anchoTexto('¡FICHADO!', 2) + 10;
        const sx = px0 + PW - tw - 10;
        const sy = py0 + 88;
        ctx.save();
        ctx.translate(sx + tw / 2, sy + 9);
        ctx.scale(escala, escala);
        ctx.globalAlpha = 0.25 + 0.75 * k;
        ctx.fillStyle = '#c8102e';
        ctx.fillRect(-tw / 2, -9, tw, 2);
        ctx.fillRect(-tw / 2, 7, tw, 2);
        ctx.fillRect(-tw / 2, -9, 2, 18);
        ctx.fillRect(tw / 2 - 2, -9, 2, 18);
        escribir(ctx, '¡FICHADO!', -tw / 2 + 5, -5, '#c8102e', 2);
        ctx.restore();
        if (k >= 1) {
          const rw = anchoTexto(rareza.nombre, 1) + 8;
          ctx.fillStyle = rareza.color;
          ctx.fillRect(sx + tw / 2 - rw / 2, sy + 22, rw, 9);
          escribir(ctx, rareza.nombre, sx + tw / 2 - rw / 2 + 4, sy + 24, '#14102a', 1);
        }
        if (k < 1) lienzo.style.transform = `translate(${(hash(Math.floor(t * 1000), 1) - 0.5) * 8}px, ${(hash(1, Math.floor(t * 1000)) - 0.5) * 8}px)`;
        else lienzo.style.transform = '';
      }
      // 5) Destellos y confeti al final
      if (t > 0.88) {
        const k = (t - 0.88) / 0.12;
        for (let i = 0; i < 40; i += 1) {
          const x = Math.floor(hash(i, 7) * W);
          const y = Math.floor((hash(7, i) * H * 0.5 + k * H * (0.6 + hash(i, 9))) % H);
          ctx.fillStyle = ['#c8102e', '#ffffff', rareza.color][i % 3];
          ctx.fillRect(x, y, 2, 2);
        }
      }
      if (t >= 1) { terminar(); return; }
      requestAnimationFrame(fotograma);
    }
    requestAnimationFrame(fotograma);
  });
}

/** Boli de píxeles en diagonal con la punta en (x, y). */
function pintarBoli(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let i = 0; i < 20; i += 1) ctx.fillRect(x + 3 + i, y + 3 - i, 2, 2);
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(x, y, 1, 1);
  for (let i = 1; i < 22; i += 1) {
    ctx.fillStyle = i < 4 ? '#c9ced9' : i < 18 ? '#c8102e' : '#ffd166';
    ctx.fillRect(x + i, y - i, 2, 2);
    if (i > 5 && i < 17) { ctx.fillStyle = '#ff6b7f'; ctx.fillRect(x + i, y - i - 1, 1, 1); }
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 8, y - 10, 1, 1);
}
