// Dibujo del mundo: reúne el suelo (render-suelo.js), lo que está de pie (render-obstaculos.js) y las paletas
// (render-paletas.js), y pinta la luz de cada ambiente (mediodía, tarde de sol, atardecer, noche de Champions,
// gala del Mundial), el cielo con confeti y fuegos y el cartel del cambio de pantalla.
// Solo lee el estado del mundo y del terreno: no cambia nada de la simulación.
import { azar } from './terreno.js';
import { PALETAS, ambienteVisible, hash } from './render-paletas.js';
import { dibujarSuelo, vaciarTexturas, numeroTexturas } from './render-suelo.js';
import {
  dibujarObstaculo, dibujarAdorno, esDeSuelo, numeroSprites,
} from './render-obstaculos.js';

export {
  PALETAS, ambienteVisible, dibujarSuelo, vaciarTexturas, dibujarObstaculo, dibujarAdorno, esDeSuelo, azar,
};

// ---------------------------------------------------------------------------------------------
// Luz del ambiente: tinte de tarde, atardecer o noche con focos, farolas y bengalas
// ---------------------------------------------------------------------------------------------

let capaLuz = null;
const halos = new Map();

/** Halo redondo (degradado del color a transparente) pintado una sola vez y reutilizado con drawImage. */
function halo(color) {
  let c = halos.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(0.45, color.replace(/[\d.]+\)$/, (a) => `${parseFloat(a) * 0.55})`));
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  halos.set(color, c);
  return c;
}

/** Fuentes de luz visibles (en coordenadas del mundo) según lo que hay cerca. */
function lucesDe(mundo, obstaculos, t) {
  const luces = [];
  const j = mundo.jugador;
  luces.push({ x: j.x, y: j.y, r: 260, k: 0.9 });
  for (const o of obstaculos) {
    if (o.tipo === 'foco') luces.push({ x: o.x + 30, y: o.y + 150, r: 380, k: 0.92, color: 'foco', o });
    else if (o.tipo === 'farola') luces.push({ x: o.x, y: o.y, r: 160, k: 0.88, color: 'calida', o });
    else if (o.tipo === 'pantalla') luces.push({ x: o.x, y: o.y + 90, r: 240, k: 0.8, color: 'pantalla', o });
    else if (o.tipo === 'kiosco' || o.tipo === 'tienda') luces.push({ x: o.x, y: o.y + o.h / 2 + 30, r: 140, k: 0.65, color: 'calida' });
    else if (o.tipo === 'grada') { // bengalas en la grada
      for (let i = 0; i < 3; i += 1) luces.push({ x: o.x + (hash(i, o.semilla) - 0.5) * o.w * 0.8, y: o.y + (hash(o.semilla, i) - 0.5) * o.h * 0.8, r: 70 + 20 * Math.sin(t * 7 + i), k: 0.7, color: 'bengala' });
    } else if (o.tipo === 'monumento') luces.push({ x: o.x, y: o.y, r: 200, k: 0.78, color: 'oro' });
  }
  for (const p of mundo.proyectiles) if (luces.length < 60) luces.push({ x: p.x, y: p.y, r: 60, k: 0.5 });
  return luces;
}

const COLOR_LUZ = {
  champions: { foco: 'rgba(170,205,255,0.32)', calida: 'rgba(255,214,150,0.26)', pantalla: 'rgba(120,170,255,0.22)', bengala: 'rgba(255,90,60,0.16)', oro: 'rgba(200,220,255,0.22)' },
  mundial: { foco: 'rgba(255,224,150,0.32)', calida: 'rgba(255,200,130,0.28)', pantalla: 'rgba(255,200,120,0.22)', bengala: 'rgba(255,110,170,0.16)', oro: 'rgba(255,210,110,0.28)' },
};

let vineta = null;

/**
 * Pinta la luz del ambiente sobre la escena (en píxeles de pantalla). `aPantalla(x, y)` pasa del mundo a la pantalla.
 */
export function dibujarLuz(ctx, mundo, amb, obstaculos, ancho, alto, escala, aPantalla, t) {
  const pal = PALETAS[amb.clave];
  if (pal.tinte === 'tarde') {
    // Tarde de sol: luz dorada desde arriba a la izquierda
    const g = ctx.createLinearGradient(0, 0, ancho * 0.4, alto);
    g.addColorStop(0, 'rgba(255,214,130,0.15)');
    g.addColorStop(0.6, 'rgba(255,190,100,0.06)');
    g.addColorStop(1, 'rgba(255,170,80,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
  } else if (pal.tinte === 'atardecer') {
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, 'rgba(255,128,60,0.2)');
    g.addColorStop(0.5, 'rgba(255,150,90,0.06)');
    g.addColorStop(1, 'rgba(110,40,120,0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    // Rayos de sol bajos que entran desde la izquierda
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i += 1) {
      const x0 = ancho * (0.05 + 0.3 * i) + Math.sin(t * 0.3 + i) * 20;
      ctx.fillStyle = 'rgba(255,170,90,0.045)';
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + ancho * 0.12, 0);
      ctx.lineTo(x0 + ancho * 0.55, alto);
      ctx.lineTo(x0 + ancho * 0.3, alto);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  if (pal.noche > 0) {
    if (!capaLuz || capaLuz.width !== Math.ceil(ancho) || capaLuz.height !== Math.ceil(alto)) {
      capaLuz = document.createElement('canvas');
      capaLuz.width = Math.ceil(ancho);
      capaLuz.height = Math.ceil(alto);
    }
    const c = capaLuz.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, capaLuz.width, capaLuz.height);
    c.fillStyle = amb.clave === 'mundial' ? `rgba(30,12,52,${pal.noche})` : `rgba(6,14,48,${pal.noche})`;
    c.fillRect(0, 0, capaLuz.width, capaLuz.height);
    c.globalCompositeOperation = 'destination-out';
    const agujero = halo('rgba(0,0,0,1)');
    const luces = lucesDe(mundo, obstaculos, t);
    for (const l of luces) {
      const [sx, sy] = aPantalla(l.x, l.y);
      const r = l.r * escala;
      if (sx < -r || sy < -r || sx > ancho + r || sy > alto + r) continue;
      c.globalAlpha = l.k;
      c.drawImage(agujero, sx - r, sy - r * 0.8, r * 2, r * 1.6);
    }
    ctx.drawImage(capaLuz, 0, 0, ancho, alto);
    // Un toque de color en las luces (azul en Champions, dorado en el Mundial) y el halo de los focos
    const colores = COLOR_LUZ[amb.clave] ?? COLOR_LUZ.champions;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of luces) {
      if (!l.color || l.color === 'calida' && !l.o) continue; // los escaparates ya se ven con el agujero de luz
      const [sx, sy] = aPantalla(l.x, l.y);
      const r = l.r * escala * (l.color === 'foco' ? 0.45 : l.color === 'bengala' ? 0.35 : 0.45);
      if (sx < -r || sy < -r || sx > ancho + r || sy > alto + r) continue;
      ctx.drawImage(halo(colores[l.color]), sx - r, sy - r * 0.8, r * 2, r * 1.6);
      if (l.color === 'foco') { // el foco encendido, arriba
        const [fx, fy] = aPantalla(l.o.x, l.o.y - l.o.alto);
        const rf = 60 * escala;
        ctx.drawImage(halo('rgba(255,255,255,0.55)'), fx - rf, fy - rf, rf * 2, rf * 2);
      } else if (l.color === 'calida') { // el farol de la farola
        const [fx, fy] = aPantalla(l.o.x, l.o.y - l.o.alto + 8);
        const rf = 24 * escala;
        ctx.drawImage(halo('rgba(255,230,160,0.6)'), fx - rf, fy - rf, rf * 2, rf * 2);
      }
    }
    ctx.restore();
  }
  // Viñeta suave en los ambientes de final (se pinta una vez por tamaño)
  if (amb.clave !== 'inicio') {
    const clave = `${Math.round(ancho)}x${Math.round(alto)}`;
    if (!vineta || vineta.clave !== clave) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(ancho));
      c.height = Math.max(1, Math.round(alto));
      const x = c.getContext('2d');
      const g = x.createRadialGradient(ancho / 2, alto / 2, Math.min(ancho, alto) * 0.35, ancho / 2, alto / 2, Math.max(ancho, alto) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.3)');
      x.fillStyle = g;
      x.fillRect(0, 0, c.width, c.height);
      vineta = { clave, c };
    }
    ctx.drawImage(vineta.c, 0, 0, ancho, alto);
  }
}

// ---------------------------------------------------------------------------------------------
// Ambiente en pantalla: confeti, serpentinas, fuegos artificiales y el cartel del cambio de pantalla
// ---------------------------------------------------------------------------------------------

const fuegos = [];
let proximoFuego = 0;

export function dibujarCielo(ctx, mundo, amb, ancho, alto, t, reducido) {
  const pal = PALETAS[amb.clave];
  if (reducido) return;
  // Confeti / serpentinas que caen
  if (pal.confeti) {
    const n = amb.clave === 'mundial' ? 46 : 26;
    for (let i = 0; i < n; i += 1) {
      const x = (hash(i, 41) * ancho + Math.sin(t * 1.3 + i) * 30 + t * 12) % ancho;
      const y = (hash(i, 42) * alto + t * (50 + 40 * hash(i, 43))) % alto;
      ctx.fillStyle = pal.confeti[i % pal.confeti.length];
      const giro = Math.abs(Math.sin(t * 6 + i));
      ctx.fillRect(Math.round(x), Math.round(y), 4 * giro + 1, 5);
    }
  }
  // Fuegos artificiales en el Mundial (y algún destello en Champions)
  if (amb.clave === 'mundial' || amb.clave === 'champions') {
    if (t > proximoFuego) {
      proximoFuego = t + (amb.clave === 'mundial' ? 0.9 : 2.6) + hash(Math.floor(t), 9);
      const colores = amb.clave === 'mundial' ? ['#ffd166', '#ff5b8a', '#7fe0ff', '#ffffff'] : ['#9ab8ff', '#ffffff'];
      fuegos.push({ x: ancho * (0.1 + 0.8 * hash(Math.floor(t * 7), 3)), y: alto * (0.08 + 0.25 * hash(Math.floor(t * 5), 4)), t0: t, color: colores[Math.floor(hash(Math.floor(t * 3), 5) * colores.length)] });
    }
    for (let i = fuegos.length - 1; i >= 0; i -= 1) {
      const f = fuegos[i];
      const e = t - f.t0;
      if (e > 1.4 || e < 0) { fuegos.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, 1 - e / 1.4);
      ctx.fillStyle = f.color;
      for (let k = 0; k < 18; k += 1) {
        const ang = (k / 18) * Math.PI * 2;
        const r = e * 110;
        ctx.fillRect(Math.round(f.x + Math.cos(ang) * r), Math.round(f.y + Math.sin(ang) * r + e * e * 30), 4, 4);
      }
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Cartel del cambio de pantalla («Final de la Copa del Rey»…). `k` va de 0 a 1 durante la transición.
 * Primero un destello del color del ambiente y después el título que entra y se va.
 */
export function dibujarCambioDeAmbiente(ctx, amb, ancho, alto, k) {
  if (k <= 0 || k >= 1) return;
  // Destello inicial
  const destello = Math.max(0, 1 - k * 4);
  if (destello > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * destello})`;
    ctx.fillRect(0, 0, ancho, alto);
  }
  // Franja con el título
  const entra = Math.min(1, k * 5);
  const sale = Math.max(0, (k - 0.8) / 0.2);
  const alfa = entra * (1 - sale);
  const h = Math.min(150, alto * 0.24);
  const y = alto * 0.36;
  ctx.save();
  ctx.globalAlpha = alfa;
  const g = ctx.createLinearGradient(0, 0, ancho, 0);
  g.addColorStop(0, 'rgba(10,14,40,0)');
  g.addColorStop(0.2, 'rgba(10,14,40,0.88)');
  g.addColorStop(0.8, 'rgba(10,14,40,0.88)');
  g.addColorStop(1, 'rgba(10,14,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, ancho, h);
  ctx.fillStyle = amb.color;
  ctx.fillRect(ancho * 0.2, y, ancho * 0.6, 3);
  ctx.fillRect(ancho * 0.2, y + h - 3, ancho * 0.6, 3);
  const desliz = (1 - entra) * 80 - sale * 80;
  ctx.textAlign = 'center';
  ctx.fillStyle = amb.color;
  ctx.font = `800 ${Math.round(Math.min(18, ancho / 40))}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText('CAMBIO DE PANTALLA · LOS RIVALES APRIETAN MÁS', ancho / 2 + desliz, y + h * 0.27);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(Math.min(46, ancho / 16))}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(amb.nombre.toUpperCase(), ancho / 2 - desliz, y + h * 0.62);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.font = `600 ${Math.round(Math.min(16, ancho / 44))}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(amb.lugar, ancho / 2 + desliz * 0.5, y + h * 0.84);
  ctx.restore();
}

/** Para las pruebas: cuántas texturas y dibujos hay guardados. */
export const estadoCaches = () => ({ texturas: numeroTexturas(), sprites: numeroSprites() });
