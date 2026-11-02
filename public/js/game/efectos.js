// Efectos visuales que nacen en la simulación: partículas, chispas de impacto y números de daño.
// Todo tiene un tope fijo y se reutilizan objetos, así que con cientos de rivales en pantalla no se crean
// miles de objetos por fotograma. Usa su propio azar (no el de la partida): lo que pasa en el campo no cambia
// por tener los efectos encendidos o apagados.
import { ARMAS } from './config.js';

export const MAX_PARTICULAS = 360;
/** Partículas nuevas como mucho en cada paso de simulación (las que sobran no se crean). */
export const PRESUPUESTO_PARTICULAS = 120;
const MAX_TEXTOS = 44;
/** Golpes al mismo rival en este tiempo desde su primer número se suman en él (más legible). */
const VENTANA_SUMA = 0.22;

/**
 * Colores por familia de habilidad: disparo (dorado y blanco), cuerpo a cuerpo (rojo rojiblanco),
 * área (azul cielo) y movilidad (verde menta). El fuego y las ultras tienen los suyos.
 */
export const FAMILIAS = {
  disparo: { color: '#ffd166', chispa: '#fff1b8', brillo: '#fff7dc', oscuro: '#7a5200' },
  cuerpo: { color: '#ff4d63', chispa: '#ffa0ad', brillo: '#ffe0e5', oscuro: '#6e0a1a' },
  area: { color: '#5cc8ff', chispa: '#bdeaff', brillo: '#e6f7ff', oscuro: '#0b4a73' },
  movil: { color: '#45eeb0', chispa: '#b4ffe0', brillo: '#e2fff3', oscuro: '#0b5e43' },
  fuego: { color: '#ff7a1a', chispa: '#ffd24a', brillo: '#fff0c0', oscuro: '#7a2600' },
  ultra: { color: '#ffe9a8', chispa: '#fff6d6', brillo: '#ffffff', oscuro: '#6b4a00' },
};

/** Familia visual de una fuente de daño (clave de arma, 'fuego', 'ultra:...'). */
export function familiaDe(fuente) {
  if (!fuente) return 'cuerpo';
  const arma = ARMAS[fuente];
  if (arma) return arma.familia ?? arma.tipo;
  if (fuente === 'fuego' || fuente === 'bengala') return 'fuego';
  if (fuente.startsWith('ultra:')) return 'ultra';
  return 'cuerpo';
}

// Azar propio de los efectos (xorshift de 32 bits): rápido y sin tocar el de la partida
let semilla = 0x9e3779b9;
function azar() {
  semilla ^= semilla << 13;
  semilla ^= semilla >>> 17;
  semilla ^= semilla << 5;
  return (semilla >>> 0) / 4294967296;
}
const entre = (a, b) => a + (b - a) * azar();

/** Empieza un paso de simulación: renueva el presupuesto de partículas. */
export function nuevoPasoDeEfectos(mundo) {
  mundo.presupuestoParticulas = PRESUPUESTO_PARTICULAS;
}

/**
 * Una partícula nueva (o una vieja reutilizada si ya hay el máximo). Devuelve null si no toca crearla
 * (efectos reducidos o presupuesto del paso agotado).
 */
function particula(mundo) {
  if (mundo.efectosReducidos) return null;
  const quedan = mundo.presupuestoParticulas ?? PRESUPUESTO_PARTICULAS;
  if (quedan <= 0) return null;
  mundo.presupuestoParticulas = quedan - 1;
  const lista = mundo.particulas;
  if (lista.length < MAX_PARTICULAS) {
    const p = { x: 0, y: 0, vx: 0, vy: 0, vida: 0, total: 0, color: '#fff', r: 2, forma: 'cuadro' };
    lista.push(p);
    return p;
  }
  // Lleno: se reutiliza la más antigua que quede (en anillo)
  mundo.anilloParticulas = ((mundo.anilloParticulas ?? -1) + 1) % lista.length;
  return lista[mundo.anilloParticulas];
}

/**
 * Suelta `cantidad` partículas. `opciones`: forma ('cuadro' | 'chispa' | 'brillo'), dir [dx, dy] y abanico
 * (radianes) para lanzarlas hacia un lado, vida [mín, máx] y r [mín, máx].
 */
export function emitir(mundo, x, y, color, cantidad, velocidad, opciones = {}) {
  const { forma = 'cuadro', dir = null, abanico = Math.PI, vida = [0.25, 0.5], r = [2, 4] } = opciones;
  const base = dir ? Math.atan2(dir[1], dir[0]) : 0;
  for (let i = 0; i < cantidad; i += 1) {
    const p = particula(mundo);
    if (!p) return;
    const ang = dir ? base + entre(-abanico, abanico) : entre(0, Math.PI * 2);
    const v = entre(0.35, 1) * velocidad;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(ang) * v;
    p.vy = Math.sin(ang) * v;
    p.vida = entre(vida[0], vida[1]);
    p.total = p.vida;
    p.color = color;
    p.r = entre(r[0], r[1]);
    p.forma = forma;
  }
}

/** Chispas al golpear a un rival: del color de la habilidad que golpea, hacia donde sale despedido; más en un crítico. */
export function chispasDeImpacto(mundo, e, dir, critico) {
  if (mundo.efectosReducidos) return;
  const fam = FAMILIAS[familiaDe(mundo.fuente)];
  const y = e.y - e.r * 0.4;
  emitir(mundo, e.x, y, fam.chispa, critico ? 6 : 3, critico ? 340 : 240, {
    forma: 'chispa', dir, abanico: dir ? 0.85 : Math.PI, vida: [0.16, 0.3], r: [1.6, 2.6],
  });
  emitir(mundo, e.x, y, fam.color, critico ? 3 : 1, 120, { vida: [0.2, 0.4], r: [2, 3.5] });
  if (critico) emitir(mundo, e.x, y - 4, '#fff3b0', 1, 0, { forma: 'brillo', vida: [0.28, 0.32], r: [9, 11] });
}

/** Restos al eliminar a un rival: cuadraditos del color de su camiseta y un par de chispas blancas. */
export function restosDeBaja(mundo, x, y, color, jefe) {
  emitir(mundo, x, y, color, jefe ? 26 : 6, jefe ? 260 : 140, { vida: [0.3, 0.6], r: [2.5, 4.5] });
  emitir(mundo, x, y, '#ffffff', jefe ? 10 : 2, jefe ? 320 : 200, { forma: 'chispa', vida: [0.15, 0.3], r: [1.5, 2.5] });
}

/** Un texto flotante cualquiera (avisos como «+vida»). */
export function texto(mundo, x, y, contenido, color = '#ffffff', extra = null) {
  if (mundo.textos.length >= MAX_TEXTOS) mundo.textos.shift();
  const t = { x, y, texto: contenido, color, vida: 0.7, total: 0.7, dx: 0 };
  if (extra) Object.assign(t, extra);
  mundo.textos.push(t);
  return t;
}

/**
 * Número de daño sobre un rival. Los golpes seguidos al mismo rival se suman en el mismo número (menos ruido en
 * pantalla) y los críticos salen aparte, más grandes y dorados.
 */
export function numeroDeDano(mundo, e, cantidad, critico, color) {
  const previo = e.numero;
  const ahora = mundo.tiempo ?? 0;
  if (previo && ahora - previo.nacio < VENTANA_SUMA && previo.critico === critico && previo.color === color && mundo.textos.includes(previo)) {
    previo.valor += cantidad;
    previo.texto = critico ? `${previo.valor}!` : String(previo.valor);
    previo.vida = Math.max(previo.vida, previo.total - 0.04); // vuelve a «saltar» un poco
    return previo;
  }
  const t = texto(mundo, e.x + entre(-8, 8), e.y - e.r, critico ? `${cantidad}!` : String(cantidad), color, {
    valor: cantidad, critico, dano: true, nacio: ahora, vida: critico ? 0.95 : 0.75, total: critico ? 0.95 : 0.75, dx: entre(-14, 14),
  });
  e.numero = t;
  return t;
}
