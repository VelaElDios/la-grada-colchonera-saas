// Dibujo del juego en un <canvas> 2D con estética de píxeles (césped, muñecos «chibi» y rivales).
// Solo lee el estado del mundo: no cambia nada de la simulación.
import { obtenerSprite, dibujarSprite, aspectoDe, conSeleccion } from './sprites.js';
import { EQUIPACIONES } from './logros.js';
import { visibles as terrenoVisible, zonaEn } from './terreno.js';
import {
  CAMARA, ELITES, PERSONAJES, SELECCION_DE_EQUIPO, SELECCION_DE_JEFE,
} from './config.js';
import {
  dibujarSuelo, dibujarObstaculo as dibujarObstaculoMundo, dibujarAdorno, dibujarLuz, dibujarCielo,
  dibujarCambioDeAmbiente, ambienteVisible, esDeSuelo, PALETAS,
} from './render-mundo.js';
import { dibujarUltrasSuelo, dibujarUltrasAire, dibujarUltrasPantalla } from './render-ultras.js';
import {
  dibujarBalon, dibujarProyectil, dibujarDisparoEnemigo, dibujarTajo, dibujarOnda, dibujarImpacto, dibujarImpactoAire, dibujarRayo,
  dibujarTarjeta, dibujarBanderin, dibujarFuego, dibujarEscudo, dibujarParticulas, dibujarTextos,
  dibujarHabilidadesSuelo, dibujarHabilidadesAire, canteranosParaOrdenar, seguirRastro,
} from './render-habilidades.js';

// ---------------------------------------------------------------------------------------------
// Cámara 3/4: el suelo se aplasta en vertical (como si lo vieras desde arriba y de lado) y los
// muñecos, objetos y textos se dibujan «de pie» sobre él. Lo que está más arriba se ve algo más pequeño.
// ---------------------------------------------------------------------------------------------
const INC = CAMARA.inclinacion;
let profCamY = 0; // y del mundo en el centro de la pantalla
let profMitad = 400; // mitad del alto visible, en unidades del mundo

/** Escala de profundidad en la y del mundo: lo de abajo en pantalla, algo más grande. */
const factorProf = (y) => 1 + CAMARA.profundidad * Math.max(-1, Math.min(1, (y - profCamY) / profMitad));

/** Dibuja `fn` de pie sobre el punto (x, y) del suelo, con la escala de profundidad. */
function recto(ctx, x, y, fn) {
  const f = factorProf(y);
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

/** Número pseudoaleatorio estable (0..1) para un par de enteros. */
function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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

/** Gema de experiencia «de pie» sin save/restore: `f` es la escala de profundidad (como `recto`). */
function dibujarGema(ctx, g, t, f) {
  const pulso = 1 + Math.sin(t * 6 + g.x) * 0.08;
  const u = (g.valor >= 8 ? 3.2 : g.valor >= 5 ? 2.6 : 2.1) * pulso;
  const ux = u * f; // en horizontal y en vertical (la vertical se estira lo que aplasta la cámara)
  const uy = (u * f) / INC;
  const { x, y } = g;
  ctx.fillStyle = '#10254a';
  ctx.fillRect(x - ux * 1.7, y - uy * 0.7, ux * 3.4, uy * 1.4);
  ctx.fillRect(x - ux * 0.7, y - uy * 1.7, ux * 1.4, uy * 3.4);
  ctx.fillStyle = g.valor >= 8 ? '#ffd166' : '#5cc8ff';
  ctx.fillRect(x - ux * 1.2, y - uy * 0.5, ux * 2.4, uy);
  ctx.fillRect(x - ux * 0.5, y - uy * 1.2, ux, uy * 2.4);
  ctx.fillRect(x - ux * 0.8, y - uy * 0.8, ux * 1.6, uy * 1.6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - ux * 0.5, y - uy * 0.7, ux * 0.6, uy * 0.6);
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

/** Estrellitas girando sobre un rival aturdido. */
function dibujarAturdido(ctx, e, alto, t) {
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 3; i += 1) {
    const a = t * 6 + (i * Math.PI * 2) / 3;
    ctx.fillRect(e.x + Math.cos(a) * alto * 0.22 - 2, e.y - alto / 2 - 4 + Math.sin(a) * 4 - 2, 5, 5);
  }
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
  } else if (a.tipo === 'linea') { // láser de aviso (Benzema): se vuelve más gruesa justo antes del tiro
    const x2 = a.x + Math.cos(a.ang) * a.largo;
    const y2 = a.y + Math.sin(a.ang) * a.largo;
    ctx.globalAlpha = 0.3 + 0.6 * k;
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 1.5 + 4 * k;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 0.25 * k;
    ctx.lineWidth = 14;
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

// ---------------------------------------------------------------------------------------------
// Adornos pequeños del suelo (el resto del terreno se dibuja en render-mundo.js)
// ---------------------------------------------------------------------------------------------

const CONTORNO = '#14102a';

// Adornos del suelo: baldosas de explanada, parches de tierra o césped, líneas de campo, conos y balones perdidos

function dibujarMarca(ctx, d) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  const x0 = d.x - d.w / 2;
  const y0 = d.y - d.h / 2;
  const g = 6;
  ctx.fillRect(x0, y0, d.w, g);
  ctx.fillRect(x0, y0 + d.h - g, d.w, g);
  ctx.fillRect(x0, y0, g, d.h);
  ctx.fillRect(x0 + d.w - g, y0, g, d.h);
  ctx.fillRect(x0, d.y - g / 2, d.w, g); // línea de medio campo
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = g;
  ctx.beginPath();
  ctx.arc(d.x, d.y, 46, 0, Math.PI * 2);
  ctx.stroke();
  // Áreas
  ctx.strokeRect(d.x - 80, y0 + g / 2, 160, 70);
  ctx.strokeRect(d.x - 80, y0 + d.h - 70 - g / 2, 160, 70);
  ctx.restore();
}

function dibujarConos(ctx, d) {
  for (let i = 0; i < (d.n || 3); i += 1) {
    const x = d.x + i * (d.dx || 0);
    const y = d.y + i * (d.dy || 0);
    sombra(ctx, x, y + 7, 7, 2.5);
    recto(ctx, x, y + 7, () => {
      ctx.fillStyle = CONTORNO;
      ctx.fillRect(x - 6, y + 2, 12, 5);
      ctx.fillRect(x - 4, y - 6, 8, 9);
      ctx.fillStyle = '#ff7a1a';
      ctx.fillRect(x - 5, y + 3, 10, 3);
      ctx.fillRect(x - 3, y - 5, 6, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 3, y - 1, 6, 2);
    });
  }
}

function dibujarDecor(ctx, d, t) {
  if (d.tipo === 'marca') dibujarMarca(ctx, d);
  else if (d.tipo === 'conos') dibujarConos(ctx, d);
  else if (d.tipo === 'balon') {
    sombra(ctx, d.x, d.y + 8, 7, 2.5);
    recto(ctx, d.x, d.y + 8, () => dibujarBalon(ctx, d.x, d.y, 6, false));
  }
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

// En la final del Mundial todos visten la camiseta de su selección
let enMundial = false;
let paisJugador = null;
// Muñeco de cada rival guardado en el propio dibujo (sin crear su clave ni su aspecto en cada fotograma)
const spritesRivales = new WeakMap();
function spriteRival(e) {
  const guardado = spritesRivales.get(e);
  if (guardado && guardado.mundial === enMundial && guardado.pais === paisJugador) return guardado.sprite;
  let sprite;
  if (e.jefe) {
    const pais = enMundial ? SELECCION_DE_JEFE[e.jefe] : null;
    sprite = obtenerSprite(`j:${e.jefe}:${pais ?? ''}`, pais ? conSeleccion(aspectoDe('jefe', e.jefe), pais) : aspectoDe('jefe', e.jefe));
  } else {
    let pais = enMundial ? SELECCION_DE_EQUIPO[e.tipo] : null;
    if (pais && pais === paisJugador) pais = 'Dinamarca';
    const aspecto = aspectoDe('rival', e.tipo, e.piel, e.pelo);
    sprite = obtenerSprite(`r:${e.tipo}:${e.piel}:${e.pelo}:${pais ?? ''}`, pais ? conSeleccion(aspecto, pais) : aspecto);
  }
  spritesRivales.set(e, { mundial: enMundial, pais: paisJugador, sprite });
  return sprite;
}

function dibujarEnemigo(ctx, e, t) {
  const alto = e.jefe ? e.r * 3.3 : e.r * 3.1;
  const sprite = spriteRival(e);
  const quieto = e.jefe && e.estado === 'preparar';
  const frame = quieto ? 0 : Math.floor(t * 16 + e.anim * 2) % 4; // 4 fotogramas de caminar (ver sprites.js)
  const bote = quieto ? 0 : Math.abs(Math.sin(t * 9 + e.anim)) * 1.5;
  const altura = (e.altura || 0) * 70;
  sombra(ctx, e.x, e.y + alto * 0.46, alto * 0.26 * (1 - altura / 160), alto * 0.07);
  if (e.elite) { // aro de color en el suelo: se ve de lejos que es un rival especial
    const col = ELITES.tipos[e.elite].color;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 6 + e.anim);
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + alto * 0.44, alto * 0.34, alto * 0.11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  }

  if (e.furia) { // jefe furioso: aura roja que late
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.18 * Math.sin(t * 10);
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + alto * 0.1, alto * 0.42, alto * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
    ctx.beginPath(); // por el suelo, desde sus pies (por donde pasa el golpe: el contacto es con los pies)
    const py = e.y + (e.pies ?? 0);
    ctx.moveTo(e.x, py);
    ctx.lineTo(e.x + e.dirX * (e.largoAviso || 340), py + e.dirY * (e.largoAviso || 340));
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

  if (e.aturdido > 0) dibujarAturdido(ctx, e, alto, t);
  if (e.quemado) { // en llamas
    for (let i = 0; i < 3; i += 1) {
      const h = 6 + 5 * Math.abs(Math.sin(t * 11 + i * 2 + e.anim));
      ctx.fillStyle = i === 1 ? '#ffd24a' : '#ff7a1a';
      ctx.fillRect(e.x - alto * 0.18 + i * alto * 0.18, e.y - alto * 0.1 - h, 4, h);
    }
  }

  // Rival normal que va a embestir: se agacha y aparece un «!»
  if (e.aviso > 0) {
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(e.x - 2, e.y - alto / 2 - 16, 4, 9);
    ctx.fillRect(e.x - 2, e.y - alto / 2 - 5, 4, 4);
  }

  if (e.jefe || (e.vida < e.vidaMax && (e.r >= 19 || e.elite))) {
    const w = Math.max(40, e.r * 2.4);
    const y = e.y - alto / 2 - 10;
    ctx.fillStyle = '#10142d';
    ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 7);
    ctx.fillStyle = e.jefe ? '#ffd166' : e.elite ? ELITES.tipos[e.elite].color : ROJO_CLARO;
    ctx.fillRect(e.x - w / 2, y, (w * Math.max(0, e.vida)) / e.vidaMax, 5);
  }
}

function dibujarJugador(ctx, j, t) {
  const alto = j.r * 3.2;
  const kit = EQUIPACIONES[j.equipacion]?.kit;
  let sprite;
  if (enMundial && paisJugador) sprite = obtenerSprite(`p:${j.personaje}:${paisJugador}`, conSeleccion(aspectoDe('personaje', j.personaje), paisJugador));
  else if (kit) {
    const a = aspectoDe('personaje', j.personaje);
    sprite = obtenerSprite(`p:${j.personaje}:eq:${j.equipacion}`, { ...a, camiseta: { ...kit.camiseta }, pantalon: kit.pantalon, medias: kit.medias });
  } else sprite = obtenerSprite(`p:${j.personaje}`, aspectoDe('personaje', j.personaje));
  const frame = j.moviendo ? Math.floor(t * 20) % 4 : 0; // 4 fotogramas de caminar (ver sprites.js)
  const parpadeo = j.invul > 0 && Math.floor(t * 20) % 2 === 0;

  if (j.escudo > 0) dibujarEscudo(ctx, j, t);
  if (j.guantes.cargas > 0) { // Paradón: un aro dorado por cada golpe que puede parar
    ctx.save();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < j.guantes.cargas; i += 1) {
      ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 5 + i);
      ctx.beginPath();
      ctx.ellipse(j.x, j.y + j.r * 1.2, j.r * (1.5 + 0.38 * i), j.r * (0.55 + 0.14 * i), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Aura de las ultis activas y del contragolpe
  if (j.furia > 0 || j.animo > 0 || j.contra) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 12);
    ctx.fillStyle = j.furia > 0 ? '#ff4d63' : j.contra ? '#ff9a3c' : '#ffd166';
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

/** Gotas de lluvia que caen sobre las zonas donde llueve (solo se dibujan las que se ven). */
function dibujarLluvia(ctx, mundo, cam, mx, my, t) {
  const paso = 70;
  ctx.fillStyle = 'rgba(200,230,255,.7)';
  const x0 = Math.floor((cam.x - mx) / paso);
  const y0 = Math.floor((cam.y - my) / paso);
  for (let i = x0; i <= x0 + (2 * mx) / paso + 1; i += 1) {
    for (let k = y0; k <= y0 + (2 * my) / paso + 1; k += 1) {
      const gx = i * paso + hash(i, k) * paso;
      const base = k * paso + hash(k, i) * paso;
      if (zonaEn(mundo.terreno, gx, base) !== 'lluvia') continue;
      const recorrido = (t * 260 + hash(i * 3, k) * 160) % 160;
      ctx.fillRect(Math.round(gx), Math.round(base - 120 + recorrido), 2, 8);
      const fase = (t * 0.9 + hash(i, k * 7)) % 1;
      ctx.globalAlpha = 1 - fase;
      ctx.strokeStyle = 'rgba(220,240,255,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(gx + 20, base + 30, 3 + fase * 12, 1.5 + fase * 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// Lista de lo que se ordena por profundidad (reutilizada entre fotogramas)
const OBSTACULO = 1;
const ADORNO = 2;
const RIVAL = 3;
const JUGADOR = 4;
const lista = [];
const entradas = [];
let usadas = 0;
function ordenar(y, tipo, o) {
  let d = entradas[usadas];
  if (!d) { d = { y: 0, tipo: 0, o: null, f: null }; entradas.push(d); }
  usadas += 1;
  d.y = y;
  d.tipo = tipo;
  d.o = o;
  lista.push(d);
}
const porSuelo = (a, b) => a.y - b.y;

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
  const amb = ambienteVisible(mundo);
  enMundial = amb.clave === 'mundial';
  paisJugador = PERSONAJES[j.personaje]?.nacionalidad ?? null;

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
  const aPantalla = (x, y) => [(x - cam.x) * escala + ancho / 2, (y - cam.y) * escala * INC + alto / 2];

  ctx.fillStyle = PALETAS[amb.clave].cesped[1];
  ctx.fillRect(0, 0, ancho, alto);

  const camara = () => {
    ctx.save();
    ctx.translate(ancho / 2, alto / 2);
    ctx.scale(escala, escala * INC);
    ctx.translate(-cam.x, -cam.y);
    ctx.imageSmoothingEnabled = false;
  };
  camara();

  // Solo se dibuja lo que cae dentro de la pantalla
  const mx = ancho / escala / 2 + 80;
  const my = alto / (escala * INC) / 2 + 80;
  const visible = (o) => Math.abs(o.x - cam.x) < mx && Math.abs(o.y - cam.y) < my;
  /** ¿Algo de radio `m` alrededor de (x, y) puede verse? (`visible` ya deja 80 de margen) */
  const enVista = (x, y, m) => Math.abs(x - cam.x) < mx + m && Math.abs(y - cam.y) < my + m;

  const area = terrenoVisible(mundo.terreno, cam.x - mx, cam.y - my, cam.x + mx, cam.y + my, 40);
  const alrededor = mundo.yaPintado ? terrenoVisible(mundo.terreno, cam.x - mx, cam.y - my, cam.x + mx, cam.y + my, 520).celdas : [];
  dibujarSuelo(ctx, mundo, area.celdas, amb, alrededor);
  const obstaculos = [];
  for (const o of area.obstaculos) {
    if (o.x + o.w / 2 < cam.x - mx - 60 || o.x - o.w / 2 > cam.x + mx + 60 || o.y + o.h / 2 < cam.y - my || o.y - o.h / 2 - o.alto > cam.y + my) continue;
    obstaculos.push(o);
  }
  for (const o of obstaculos) if (esDeSuelo(o)) dibujarObstaculoMundo(ctx, o, amb, mundo, t);
  const altos = [];
  for (const d of area.decor) {
    if (d.tipo === 'bandera') altos.push(d);
    else if (d.tipo === 'mata' || d.tipo === 'piedras') dibujarAdorno(ctx, d, amb, t);
    else dibujarDecor(ctx, d, t);
  }

  for (const a of mundo.avisosJefe) dibujarAvisoJefe(ctx, a);
  for (const p of mundo.premios) if (visible(p)) dibujarPremio(ctx, p, t);
  for (const g of mundo.gemas) if (visible(g)) dibujarGema(ctx, g, t, factorProf(g.y));
  for (const c of mundo.curas) if (visible(c)) recto(ctx, c.x, c.y, () => dibujarCura(ctx, c, t));
  for (const im of mundo.impactos) dibujarImpacto(ctx, im);
  for (const f of mundo.fuegos) if (visible(f)) dibujarFuego(ctx, f, t, mundo.efectosReducidos);
  for (const o of mundo.ondas) if (enVista(o.x, o.y, o.radio)) dibujarOnda(ctx, o, t);
  dibujarHabilidadesSuelo(ctx, mundo, t);
  dibujarUltrasSuelo(ctx, mundo, t);

  // Rivales, jugador y obstáculos se ordenan por su «suelo»: lo que está más abajo en pantalla se dibuja delante.
  // Las entradas de la lista se reutilizan de un fotograma a otro (sin crear cientos de objetos y funciones).
  lista.length = 0;
  usadas = 0;
  for (const o of obstaculos) if (!esDeSuelo(o)) ordenar(o.y + o.h / 2, OBSTACULO, o);
  for (const d of altos) ordenar(d.y, ADORNO, d);
  for (const e of mundo.enemigos) {
    if (!visible(e)) continue;
    const dx = j.x - e.x;
    const l = Math.hypot(dx, j.y - e.y) || 1;
    e.mx = dx / l;
    ordenar(e.y + e.r, RIVAL, e);
  }
  if (mundo.ult.magia.dur > 0) { // el tiempo parado deja imágenes de ti mismo
    mundo.ult.magia.rastro.forEach((p, i, todo) => lista.push({
      y: p.y + j.r - 1,
      f: () => {
        const [x0, y0] = [j.x, j.y];
        j.x = p.x; j.y = p.y;
        ctx.globalAlpha = 0.14 + 0.1 * (i / todo.length);
        dibujarJugador(ctx, j, t);
        ctx.globalAlpha = 1;
        j.x = x0; j.y = y0;
      },
    }));
  }
  canteranosParaOrdenar(ctx, mundo, lista, t, recto, sombra); // presión alta
  if (mundo.estado !== 'fin') ordenar(j.y + j.r, JUGADOR, j);
  lista.sort(porSuelo);
  for (let i = 0; i < lista.length; i += 1) {
    const d = lista[i];
    if (d.tipo === RIVAL) dibujarEnemigo(ctx, d.o, t);
    else if (d.tipo === OBSTACULO) dibujarObstaculoMundo(ctx, d.o, amb, mundo, t);
    else if (d.tipo === ADORNO) dibujarAdorno(ctx, d.o, amb, t);
    else if (d.tipo === JUGADOR) dibujarJugador(ctx, d.o, t);
    else d.f();
  }
  lista.length = 0;
  if (!mundo.efectosReducidos) dibujarLluvia(ctx, mundo, cam, mx, my, t);
  ctx.restore();

  // La luz del ambiente va por encima del campo, pero por debajo de los balones, los efectos y los números
  dibujarLuz(ctx, mundo, amb, obstaculos, ancho, alto, escala, aPantalla, t);

  camara();
  // Habilidades y efectos (ver render-habilidades.js). Lo que cae fuera de la pantalla no se pinta
  // (los balones sí apuntan su rastro, para que la estela no salte al volver a verse).
  const reducidos = mundo.efectosReducidos;
  for (const tj of mundo.tajos) if (enVista(tj.x, tj.y, tj.largo + 20)) dibujarTajo(ctx, tj);
  for (const b of j.banderines) dibujarBanderin(ctx, b, t, j, recto);
  for (const p of mundo.proyectiles) {
    if (enVista(p.x, p.y, 140)) dibujarProyectil(ctx, p, t, reducidos, recto, sombra);
    else seguirRastro(p, reducidos);
  }
  for (const im of mundo.impactos) dibujarImpactoAire(ctx, im, t, recto);
  dibujarUltrasAire(ctx, mundo, t);
  for (const d of mundo.disparosEnemigos) {
    if (enVista(d.x, d.y, 120)) dibujarDisparoEnemigo(ctx, d, recto, sombra);
    else seguirRastro(d, reducidos, true);
  }
  for (const r of mundo.rayos) if (enVista(r.x, r.y, r.radio + 440)) dibujarRayo(ctx, r, t);
  for (const tr of mundo.tarjetas) if (enVista(tr.x, tr.y, 60)) recto(ctx, tr.x, tr.y, () => dibujarTarjeta(ctx, tr));
  dibujarHabilidadesAire(ctx, mundo, t, reducidos, recto);
  dibujarParticulas(ctx, mundo.particulas, cam.x - mx, cam.y - my, cam.x + mx, cam.y + my);
  dibujarTextos(ctx, mundo.textos, recto, reducidos);
  ctx.restore();

  dibujarAmbiente(ctx, j, ancho, alto, t);
  dibujarCielo(ctx, mundo, amb, ancho, alto, t, mundo.efectosReducidos);
  dibujarUltrasPantalla(ctx, mundo, ancho, alto, t);
  dibujarFlechasPremios(ctx, mundo, cam, ancho, alto, escala, t);
  if (mundo.cambioAmbiente) dibujarCambioDeAmbiente(ctx, amb, ancho, alto, (t - mundo.cambioAmbiente.t0) / 3.4);
}
