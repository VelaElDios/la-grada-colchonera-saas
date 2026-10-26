// Dibujo del mundo: suelo (césped, caminos, barro, plazas, mesetas…), obstáculos (gradas, tiendas, árboles…),
// luz de cada ambiente (mediodía, tarde, atardecer, noche de Champions, gala del Mundial) y el cambio de pantalla.
// Solo lee el estado del mundo y del terreno: no cambia nada de la simulación.
import {
  TERRENO, AMBIENTES, SELECCIONES, PERSONAJES,
} from './config.js';
import {
  celda as celdaTerreno, loteDe, nivelBaldosa, tono as tonoEn, humedad as humedadEn, nubes as nubesEn,
  caminoEn, pavimentado, enPlaza, azar,
} from './terreno.js';

const PX = 4; // un «píxel» del suelo mide 4 unidades del mundo
const CONTORNO = '#14102a';

// ---------------------------------------------------------------------------------------------
// Paletas de cada ambiente
// ---------------------------------------------------------------------------------------------

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const PALETAS = {
  inicio: {
    cesped: ['#358a35', '#3f9a3d', '#4aa84a'], flores: ['#ffffff', '#fff6a8', '#f7d6ea'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#1b2a5c'], vacios: 0.45, banderas: ['#c8102e', '#ffffff'],
    carteles: [['#c8102e', '#ff8a9a'], ['#1b4fa8', '#7fb0ff'], ['#f2f2f8', '#9aa0b8'], ['#e8a800', '#fff0a0']],
    noche: 0, tinte: null, confeti: null,
  },
  copa: {
    cesped: ['#3b8f36', '#47a03f', '#55b04a'], flores: ['#ffc400', '#c60b1e', '#ffffff'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#ffc400', '#c60b1e'], vacios: 0.06, banderas: ['#c60b1e', '#ffc400'],
    carteles: [['#c60b1e', '#ffc400'], ['#ffc400', '#c60b1e'], ['#1b2a5c', '#ffc400']],
    noche: 0, tinte: 'rgba(255,190,90,0.10)', confeti: ['#c60b1e', '#ffc400'],
  },
  liga: {
    cesped: ['#367f33', '#41903c', '#4e9e45'], flores: ['#ff8a3c', '#ffffff', '#ffd1e0'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#ffffff', '#1b2a5c'], vacios: 0.03, banderas: ['#c8102e', '#ffffff', '#ff7a2f'],
    carteles: [['#ff4b2b', '#ffd0c0'], ['#1e1e3c', '#ff8a3c'], ['#f2f2f8', '#ff4b2b']],
    noche: 0, tinte: 'atardecer', confeti: null,
  },
  champions: {
    cesped: ['#1f6d40', '#277c49', '#2f8a52'], flores: ['#cfe0ff', '#ffffff', '#9ab8ff'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#ffffff'], vacios: 0, banderas: ['#0b1f5c', '#ffffff'],
    carteles: [['#0b1f5c', '#ffffff'], ['#13307f', '#9ab8ff'], ['#050f33', '#ffffff']],
    noche: 0.74, tinte: null, confeti: null, tifo: true,
  },
  mundial: {
    cesped: ['#2a913c', '#33a245', '#3fb44f'], flores: ['#ffd166', '#ffffff', '#ffe9a8'],
    aficion: null, vacios: 0, banderas: ['#ffd166', '#0d8a6a', '#ffffff'],
    carteles: [['#0d6b5a', '#ffd166'], ['#5a1a6b', '#ffd166'], ['#ffd166', '#5a1a6b']],
    noche: 0.66, tinte: null, confeti: ['#ffd166', '#ffffff', '#ffe08a'],
  },
};

/** Ambiente que se ve: el de la partida (o el del menú). */
export const ambienteVisible = (mundo) => AMBIENTES[mundo.ambiente ?? 0] ?? AMBIENTES[0];

/** Colores de la afición en el Mundial: los de la selección de tu jugador. */
function aficionDe(amb, mundo) {
  const p = PALETAS[amb.clave];
  if (p.aficion) return p.aficion;
  const pais = PERSONAJES[mundo.jugador.personaje]?.nacionalidad;
  const sel = SELECCIONES[pais];
  return sel ? [...sel.colores, sel.colores[0], '#ffd166'] : ['#ffd166', '#ffffff'];
}

// ---------------------------------------------------------------------------------------------
// Texturas del suelo: una por celda (160×160 píxeles), según el ambiente
// ---------------------------------------------------------------------------------------------

const texturas = new Map();
let pendientesEsteFotograma = 0;

function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}


const SUP_CAMPO = 1;
const SUP_PISTA = 2;
const SUP_PISTA_BORDE = 3;
const SUP_PLAZA = 4;
const SUP_CALLE = 5;
const SUP_ACERA = 6;
const SUP_HORMIGON = 7;
const SUP_TIERRA = 8;

/** Pinta la textura de una celda en un lienzo de 160×160 (cada píxel son 4 unidades). */
function pintarCelda(t, c, amb) {
  const pal = PALETAS[amb.clave];
  const L = TERRENO.celda;
  const n = L / PX;
  const lienzo = document.createElement('canvas');
  lienzo.width = n;
  lienzo.height = n;
  const cx2 = lienzo.getContext('2d');
  const img = cx2.createImageData(n, n);
  const d = img.data;
  const ox = c.cx * L;
  const oy = c.cy * L;
  const B = TERRENO.baldosa;
  const NB = L / B;
  const verdes = pal.cesped.map(hex);
  const tierra = [hex('#6e4b2a'), hex('#5f4023'), hex('#7a5532')];
  const borde = hex('#4a3018');
  const camino = [hex('#a7865a'), hex('#b39268'), hex('#98794f')];
  const piedra = [hex('#bdb5a5'), hex('#c8c0b0'), hex('#aea696')];
  const hormigon = [hex('#a4a6ad'), hex('#adafb6'), hex('#989aa2')];
  const talud = [hex('#7a6a55'), hex('#8b7a62'), hex('#695a47'), hex('#574a3a')];
  const pistaDentro = hex('#2f6db3');
  const pistaFuera = hex('#c2443f');
  const acera = hex('#8b8e98');
  const barroClaro = hex('#9b7345');
  const barroOscuro = hex('#3d2812');
  const flores = pal.flores.map(hex);
  const confeti = pal.confeti ? pal.confeti.map(hex) : null;
  const lote = c.lote.tipo;
  const urbano = lote === 'plaza' || lote === 'grada' || lote === 'estadio';

  // Campos de ruido a 8 unidades (2×2 píxeles): basta y es rápido
  const m = L / 8;
  const campoTono = new Float32Array(m * m);
  const campoHum = new Float32Array(m * m);
  const campoNub = new Float32Array(m * m);
  const campoCam = new Uint8Array(m * m);
  const campoPav = new Uint8Array(m * m);
  const hayPavimento = c.suelo.some((a) => a.tipo !== 'escalera' && a.tipo !== 'rampa' && a.tipo !== 'tierra' && !(a.tipo === 'campo' && a.entreno));
  for (let j = 0; j < m; j += 1) {
    for (let i = 0; i < m; i += 1) {
      const x = ox + i * 8 + 4;
      const y = oy + j * 8 + 4;
      const k = j * m + i;
      campoTono[k] = tonoEn(t, x, y);
      const hum = humedadEn(t, x, y);
      campoHum[k] = hum;
      campoNub[k] = nubesEn(t, x, y);
      campoCam[k] = caminoEn(t, x, y) ? 1 : 0;
      campoPav[k] = hayPavimento && hum > TERRENO.umbralBarro && pavimentado(t, x, y) ? 1 : 0;
    }
  }
  // Niveles de las baldosas de la celda y de su alrededor
  const nivRejilla = new Int8Array((NB + 2) * (NB + 2));
  for (let k = -1; k <= NB; k += 1) for (let i = -1; i <= NB; i += 1) nivRejilla[(k + 1) * (NB + 2) + i + 1] = nivelBaldosa(t, c.cx * NB + i, c.cy * NB + k);
  const niv = (i, k) => nivRejilla[(k + 1) * (NB + 2) + i + 1];
  const escaleras = c.suelo.filter((a) => a.tipo === 'escalera' || a.tipo === 'rampa');
  const areas = c.suelo.filter((a) => a.tipo !== 'escalera' && a.tipo !== 'rampa');
  // Bordes de la explanada / anillo: lisos donde hay más ciudad al lado, irregulares donde empieza el césped
  const vecinoUrbano = {};
  for (const [lado, i, k] of [['n', 0, -1], ['s', 0, 1], ['o', -1, 0], ['e', 1, 0]]) {
    const v = loteDe(t, c.cx + i, c.cy + k).tipo;
    vecinoUrbano[lado] = v === 'grada' || v === 'estadio' || v === 'plaza';
  }
  const { umbralBarro, umbralLluvia, frente } = TERRENO;
  // Qué superficie hay en cada punto (a 8 unidades: los bordes quedan «pixelados», como todo lo demás)
  const campoSup = new Uint8Array(m * m);
  const areaCampo = new Array(m * m);
  for (let j = 0; j < m; j += 1) {
    for (let i = 0; i < m; i += 1) {
      const x = ox + i * 8 + 4;
      const y = oy + j * 8 + 4;
      const k = j * m + i;
      let v = 0;
      for (let ia = 0; ia < areas.length; ia += 1) {
        const a = areas[ia];
        if (a.tipo === 'campo' && Math.abs(x - a.x) < a.w / 2 && Math.abs(y - a.y) < a.h / 2) { v = SUP_CAMPO; areaCampo[k] = a; } else if (a.tipo === 'pista' && Math.abs(x - a.x) < a.w / 2 + 6 && Math.abs(y - a.y) < a.h / 2 + 6) {
          v = Math.abs(x - a.x) < a.w / 2 - 14 && Math.abs(y - a.y) < a.h / 2 - 14 ? SUP_PISTA : SUP_PISTA_BORDE;
        } else if (a.tipo === 'plaza' && Math.abs(x - a.x) < a.r && Math.abs(y - a.y) < a.r && enPlaza(t, a, x, y)) v = SUP_PLAZA;
        else if (a.tipo === 'calle' && Math.abs(y - a.y) < a.h / 2) v = Math.abs(y - a.y) > a.h / 2 - 30 ? SUP_ACERA : SUP_CALLE;
        else if (a.tipo === 'explanada' && v === 0) {
          const rb = 18 + 46 * hash(Math.floor(i / 2) + c.cx * 31, Math.floor(j / 2) + c.cy * 17);
          if ((vecinoUrbano.o || x - ox > rb) && (vecinoUrbano.e || ox + L - x > rb) && (vecinoUrbano.n || y - oy > rb) && (vecinoUrbano.s || oy + L - y > rb)) v = SUP_HORMIGON;
        } else if (a.tipo === 'tierra' && v === 0 && (x - a.x) ** 2 + (y - a.y) ** 2 < a.r * a.r) v = SUP_TIERRA;
      }
      if (lote === 'estadio' && v === 0) {
        // Anillo de hormigón alrededor del campo
        const rb = 16 + 40 * hash(Math.floor(i / 2) + 11, Math.floor(j / 2) + c.cy);
        if ((vecinoUrbano.o || x - ox > rb) && (vecinoUrbano.e || ox + L - x > rb) && (vecinoUrbano.n || y - oy > rb) && (vecinoUrbano.s || oy + L - y > rb)) v = SUP_HORMIGON;
      }
      campoSup[k] = v;
    }
  }


  for (let py = 0; py < n; py += 1) {
    const y = oy + py * PX + 2;
    const bk = Math.floor((py * PX) / B);
    const enBaldosaY = (py * PX) % B;
    for (let px = 0; px < n; px += 1) {
      const x = ox + px * PX + 2;
      const k8 = (py >> 1) * m + (px >> 1);
      let r = 0;
      let g = 0;
      let bl = 0;
      const h1 = hash(px + c.cx * 977, py + c.cy * 613);
      // 1) Césped (tres tonos según el ruido, con matas más oscuras)
      { const q_ = verdes[Math.max(0, Math.min(2, Math.floor(campoTono[k8] * 2.6 + (h1 - 0.5) * 0.9)))]; r = q_[0]; g = q_[1]; bl = q_[2]; }
      if (h1 < 0.04) { const k_ = 0.82; r *= k_; g *= k_; bl *= k_; }
      const bi = Math.floor((px * PX) / B);
      const nivel = niv(bi, bk);
      // 2) Superficies (campos, plazas, explanadas…), calculadas antes a 8 unidades
      const sup = campoSup[k8];
      const sobreSuperficie = sup > 0 && sup !== SUP_TIERRA;
      if (sup === SUP_CAMPO) {
        const a = areaCampo[k8];
        const franja = Math.floor((y - (a.y - a.h / 2)) / 40) % 2;
        { const q_ = verdes[h1 < 0.08 ? (franja ? 1 : 0) : (franja ? 2 : 1)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
        if (a.entreno && h1 > 0.9) { const k_ = 0.35; r += (tierra[0][0] - r) * k_; g += (tierra[0][1] - g) * k_; bl += (tierra[0][2] - bl) * k_; }
      } else if (sup === SUP_PISTA) {
        { const q_ = pistaDentro; r = q_[0]; g = q_[1]; bl = q_[2]; }
        if (h1 < 0.1) { const k_ = 0.93; r *= k_; g *= k_; bl *= k_; }
      } else if (sup === SUP_PISTA_BORDE) {
        { const q_ = pistaFuera; r = q_[0]; g = q_[1]; bl = q_[2]; }
      } else if (sup === SUP_PLAZA) {
        const junta = py % 5 === 0 || (px + (Math.floor(py / 5) % 2) * 3) % 6 === 0;
        { const q_ = piedra[junta ? 0 : Math.floor(h1 * 3)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
        if (junta) { const k_ = 0.85; r *= k_; g *= k_; bl *= k_; }
      } else if (sup === SUP_CALLE) {
        { const q_ = piedra[Math.floor(h1 * 3)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
        if (px % 8 === 0 || py % 8 === 0) { const k_ = 0.9; r *= k_; g *= k_; bl *= k_; }
      } else if (sup === SUP_ACERA) {
        { const q_ = hormigon[Math.floor(h1 * 3)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
      } else if (sup === SUP_HORMIGON) {
        const junta = px % 10 === 0 || py % 10 === 0;
        { const q_ = hormigon[junta ? 0 : Math.floor(h1 * 3)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
        if (junta) { const k_ = 0.88; r *= k_; g *= k_; bl *= k_; }
      } else if (sup === SUP_TIERRA && h1 > 0.25) {
        const cm = camino[Math.floor(h1 * 3)];
        { const k_ = 0.75; r += (cm[0] - r) * k_; g += (cm[1] - g) * k_; bl += (cm[2] - bl) * k_; }
      }
      // 3) Caminos (de tierra; en la ciudad, de piedra) y flores sueltas
      if (!sobreSuperficie && campoCam[k8]) { const q_ = (urbano ? piedra : camino)[Math.floor(h1 * 3)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
      else if (!sobreSuperficie && !urbano && h1 > 0.996) { const q_ = flores[Math.floor(hash(px, py + 7) * 3)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
      // 4) Barro
      const hum = campoHum[k8];
      if (hum > umbralBarro && !campoPav[k8]) {
        { const q_ = hum < umbralBarro + 0.012 ? borde : tierra[Math.floor(h1 * 3)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
        if (h1 > 0.985) { const q_ = barroClaro; r = q_[0]; g = q_[1]; bl = q_[2]; }
        if (h1 < 0.012) { const q_ = barroOscuro; r = q_[0]; g = q_[1]; bl = q_[2]; }
      }
      // 5) Lluvia: suelo mojado y charcos
      const nub = campoNub[k8];
      if (nub > umbralLluvia) {
        { const k_ = 0.22; r += (40 - r) * k_; g += (80 - g) * k_; bl += (130 - bl) * k_; }
        if (nub > umbralLluvia + 0.06 && !sobreSuperficie) { const k_ = 0.55 + 0.1 * h1; r += (70 - r) * k_; g += (130 - g) * k_; bl += (180 - bl) * k_; }
      }
      // 6) Mesetas: arriba más claro; el frente sur es de tierra y piedra; sombra al pie
      if (nivel > 0) { const k_ = 0.1 * nivel; r += (255 - r) * k_; g += (255 - g) * k_; bl += (220 - bl) * k_; }
      const enBaldosaX = (px * PX) % B;
      if (nivel > 0 && niv(bi, bk + 1) < nivel && enBaldosaY >= B - frente) {
        const prof = enBaldosaY - (B - frente);
        if (prof < 4) { { const q_ = verdes[2]; r = q_[0]; g = q_[1]; bl = q_[2]; } { const k_ = 0.15; r += (255 - r) * k_; g += (255 - g) * k_; bl += (255 - bl) * k_; } } else {
          { const q_ = talud[h1 < 0.15 ? 3 : Math.floor((prof + hash(px, 3) * 6) / 9) % 3]; r = q_[0]; g = q_[1]; bl = q_[2]; }
          if (prof > frente - 5) { const k_ = 0.8; r *= k_; g *= k_; bl *= k_; }
        }
      } else if (enBaldosaY < 22 && niv(bi, bk - 1) > nivel) {
        { const k_ = 0.68 + 0.3 * (enBaldosaY / 22); r *= k_; g *= k_; bl *= k_; } // sombra al pie del talud
      }
      if (nivel > 0) {
        if (enBaldosaY < 4 && niv(bi, bk - 1) < nivel) { const k_ = 0.25; r += (255 - r) * k_; g += (255 - g) * k_; bl += (230 - bl) * k_; }
        if ((enBaldosaX < 8 && niv(bi - 1, bk) < nivel) || (enBaldosaX >= B - 8 && niv(bi + 1, bk) < nivel)) {
          { const q_ = talud[(enBaldosaX < 4 || enBaldosaX >= B - 4) ? 3 : 1]; r = q_[0]; g = q_[1]; bl = q_[2]; }
        }
      }
      // 7) Confeti del ambiente
      if (confeti && h1 > 0.993) { const q_ = confeti[Math.floor(hash(py, px) * confeti.length)]; r = q_[0]; g = q_[1]; bl = q_[2]; }
      const o = (py * n + px) * 4;
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = bl;
      d[o + 3] = 255;
    }
  }
  cx2.putImageData(img, 0, 0);

  // Escaleras y rampas (encima de la textura)
  for (const e of escaleras) {
    const x0 = (e.x - e.w / 2 - ox) / PX;
    const y0 = (e.y - e.h / 2 - oy) / PX;
    const w = e.w / PX;
    const h = e.h / PX;
    if (e.tipo === 'escalera') {
      for (let s = 0; s < h; s += 2) {
        cx2.fillStyle = s % 4 === 0 ? '#cfc6b4' : '#9c927f';
        cx2.fillRect(x0 + 2, y0 + s, w - 4, 2);
      }
      cx2.fillStyle = '#5c4f40';
      cx2.fillRect(x0, y0, 2, h);
      cx2.fillRect(x0 + w - 2, y0, 2, h);
    } else {
      cx2.fillStyle = 'rgba(214,190,140,0.55)';
      cx2.fillRect(x0, y0, w, h);
    }
  }
  // Líneas de los campos y de la pista
  cx2.fillStyle = 'rgba(255,255,255,0.85)';
  for (const a of areas) {
    if (a.tipo !== 'campo' && a.tipo !== 'pista') continue;
    const pista = a.tipo === 'pista';
    const x0 = Math.round((a.x - a.w / 2 - ox) / PX) + (pista ? 4 : 1);
    const y0 = Math.round((a.y - a.h / 2 - oy) / PX) + (pista ? 4 : 1);
    const w = Math.round(a.w / PX) - (pista ? 8 : 2);
    const h = Math.round(a.h / PX) - (pista ? 8 : 2);
    cx2.fillRect(x0, y0, w, 1);
    cx2.fillRect(x0, y0 + h - 1, w, 1);
    cx2.fillRect(x0, y0, 1, h);
    cx2.fillRect(x0 + w - 1, y0, 1, h);
    cx2.fillRect(x0, y0 + Math.floor(h / 2), w, 1);
    const cxm = x0 + Math.floor(w / 2);
    const cym = y0 + Math.floor(h / 2);
    const rr = pista ? 7 : 11;
    for (let a2 = 0; a2 < 64; a2 += 1) {
      const ang = (a2 / 64) * Math.PI * 2;
      cx2.fillRect(Math.round(cxm + Math.cos(ang) * rr), Math.round(cym + Math.sin(ang) * rr), 1, 1);
    }
    // Áreas
    const aw = Math.round(w * 0.5);
    const ah = Math.round(h * (pista ? 0.14 : 0.16));
    for (const yy of [y0, y0 + h - ah]) {
      cx2.fillRect(cxm - aw / 2, yy, aw, 1);
      cx2.fillRect(cxm - aw / 2, yy + ah - 1, aw, 1);
      cx2.fillRect(cxm - aw / 2, yy, 1, ah);
      cx2.fillRect(cxm + aw / 2, yy, 1, ah);
    }
    if (amb.clave === 'champions' && !pista && !a.entreno) {
      // Estrellas pintadas en el centro del campo
      cx2.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 8; i += 1) {
        const ang = (i / 8) * Math.PI * 2;
        cx2.fillRect(Math.round(cxm + Math.cos(ang) * 6) - 1, Math.round(cym + Math.sin(ang) * 6) - 1, 2, 2);
      }
      cx2.fillStyle = 'rgba(255,255,255,0.85)';
    }
  }
  return lienzo;
}

const ultimaTextura = new Map(); // la última textura pintada de cada celda (sirve mientras se repinta otra)

function texturaDe(t, c, amb, forzar) {
  const celdaClave = `${t.semilla}:${c.cx},${c.cy}`;
  const clave = `${celdaClave}:${amb.clave}`;
  let lienzo = texturas.get(clave);
  if (lienzo) return lienzo;
  if (!forzar && pendientesEsteFotograma >= 1) return ultimaTextura.get(celdaClave) ?? null; // una textura nueva por fotograma
  pendientesEsteFotograma += 1;
  lienzo = pintarCelda(t, c, amb);
  if (texturas.size > 110) texturas.delete(texturas.keys().next().value);
  texturas.set(clave, lienzo);
  if (ultimaTextura.size > 110) ultimaTextura.delete(ultimaTextura.keys().next().value);
  ultimaTextura.set(celdaClave, lienzo);
  return lienzo;
}

/** Dibuja el suelo de las celdas visibles (en coordenadas del mundo) y adelanta el de alrededor. */
export function dibujarSuelo(ctx, mundo, celdas, amb, alrededor = []) {
  pendientesEsteFotograma = 0;
  const L = TERRENO.celda;
  const forzar = !mundo.yaPintado;
  ctx.imageSmoothingEnabled = false;
  for (const c of celdas) {
    const tex = texturaDe(mundo.terreno, c, amb, forzar);
    if (tex) ctx.drawImage(tex, c.cx * L, c.cy * L, L + 0.5, L + 0.5);
    else {
      ctx.fillStyle = PALETAS[amb.clave].cesped[1];
      ctx.fillRect(c.cx * L, c.cy * L, L + 0.5, L + 0.5);
    }
  }
  // Si sobra tiempo en este fotograma, se pinta por adelantado una celda de las de alrededor
  if (pendientesEsteFotograma === 0) {
    for (const c of alrededor) {
      if (!texturas.has(`${mundo.terreno.semilla}:${c.cx},${c.cy}:${amb.clave}`)) { texturaDe(mundo.terreno, c, amb, false); break; }
    }
  }
  mundo.yaPintado = true;
}

/** Olvida las texturas (al cambiar de ambiente se repintan con la nueva paleta). */
export function vaciarTexturas() {
  texturas.clear();
  ultimaTextura.clear();
}

// ---------------------------------------------------------------------------------------------
// Obstáculos: cada uno se dibuja una vez por ambiente en un lienzo pequeño (píxeles de 4 unidades)
// ---------------------------------------------------------------------------------------------

const sprites = new Map();
const lienzo = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
const rect = (cx, color, x, y, w = 1, h = 1) => {
  cx.fillStyle = color;
  cx.fillRect(x, y, w, h);
};

/** Símbolo de la competición (pequeño, en píxeles) para carteles, pantallas y banderas. */
function simbolo(cx, clave, x, y, color, claro) {
  if (clave === 'copa') { // corona
    rect(cx, color, x, y + 2, 7, 3);
    [0, 3, 6].forEach((i) => rect(cx, color, x + i, y, 1, 2));
    rect(cx, claro, x + 3, y + 3, 1, 1);
  } else if (clave === 'liga') { // balón
    rect(cx, color, x + 1, y, 5, 5);
    rect(cx, color, x, y + 1, 7, 3);
    rect(cx, claro, x + 3, y + 2, 1, 1);
  } else if (clave === 'champions') { // estrella
    rect(cx, color, x + 3, y, 1, 7);
    rect(cx, color, x, y + 3, 7, 1);
    rect(cx, color, x + 1, y + 1, 5, 5);
    rect(cx, claro, x + 3, y + 3, 1, 1);
  } else if (clave === 'mundial') { // globo
    rect(cx, color, x + 1, y, 5, 7);
    rect(cx, color, x, y + 1, 7, 5);
    rect(cx, claro, x + 1, y + 3, 5, 1);
    rect(cx, claro, x + 3, y + 1, 1, 5);
  } else { // escudo
    rect(cx, color, x, y, 7, 5);
    rect(cx, color, x + 1, y + 5, 5, 1);
    rect(cx, color, x + 2, y + 6, 3, 1);
    for (let i = 0; i < 7; i += 2) rect(cx, claro, x + i, y + 1, 1, 4);
  }
}

function pintarGrada(cx, o, pw, ph, amb, mundo, frame) {
  const pal = PALETAS[amb.clave];
  const colores = aficionDe(amb, mundo);
  const pieles = ['#f2c6a0', '#e0ac84', '#c68642', '#8d5524'];
  const s = o.semilla;
  const fondo = Math.round(o.h / PX);
  const vacio = pal.vacios;
  const fan = (x, y, k) => {
    const a = hash(x + s, y + k);
    if (a < vacio) return;
    const salta = frame && hash(x * 3 + s, y) < 0.5 ? -1 : 0;
    rect(cx, pieles[Math.floor(hash(x, y + s) * pieles.length)], x + 1, y + salta, 1, 1);
    let camiseta = colores[Math.floor(a * colores.length) % colores.length];
    if (pal.tifo) camiseta = (Math.floor(x / 6) + Math.floor(y / 4)) % 2 ? '#c8102e' : '#ffffff'; // mosaico
    rect(cx, camiseta, x, y + 1 + salta, 3, 2);
    if (frame && a > 0.93) rect(cx, pal.banderas[Math.floor(a * 97) % pal.banderas.length], x + 1, y - 2, 1, 2); // brazo/bufanda arriba
  };
  if (o.mira === 's') {
    // De frente: tejadillo arriba, filas de aficionados y muro con bufandas abajo
    rect(cx, CONTORNO, 0, 0, pw, ph);
    rect(cx, '#c9ced9', 1, 1, pw - 2, 3);
    rect(cx, '#8f95aa', 1, 4, pw - 2, 1);
    for (let y = 5; y + 3 <= ph - 6; y += 4) {
      rect(cx, '#272c4a', 1, y + 3, pw - 2, 1);
      for (let x = 1; x + 3 <= pw - 1; x += 3) fan(x, y, 0);
    }
    rect(cx, '#4a4f6b', 1, ph - 6, pw - 2, 5);
    for (let x = 1; x < pw - 1; x += 1) rect(cx, pal.banderas[Math.floor(x / 3) % pal.banderas.length], x, ph - 5, 1, 2);
  } else if (o.mira === 'n') {
    // De espaldas: cubierta vista desde arriba y la fachada con pilares, puertas y pancartas
    const techo = Math.max(6, fondo - 2);
    rect(cx, CONTORNO, 0, 0, pw, ph);
    for (let y = 1; y < techo; y += 1) rect(cx, y % 3 === 0 ? '#9aa0b4' : '#b8bdcc', 1, y, pw - 2, 1);
    rect(cx, '#e6e9f0', 1, techo, pw - 2, 1);
    rect(cx, '#5a6078', 1, techo + 1, pw - 2, ph - techo - 2);
    for (let x = 3; x < pw - 3; x += 8) {
      rect(cx, '#474c63', x, techo + 1, 2, ph - techo - 2); // pilares
      rect(cx, '#1d2140', x + 3, ph - 7, 3, 6); // puertas
      rect(cx, pal.banderas[(x / 8) % pal.banderas.length | 0], x + 3, techo + 3, 3, 4); // pancartas
    }
    for (let x = 2; x < pw - 2; x += 6) { // banderas en lo alto
      rect(cx, '#d8dbe4', x, 0, 1, 3);
      rect(cx, pal.banderas[(x / 6) % pal.banderas.length | 0], x + 1, 0, 2, 2);
    }
  } else {
    // De lado: filas de asientos en columnas que suben hacia fuera, con la cubierta en el borde exterior
    const fuera = o.mira === 'e' ? 0 : 1; // en qué lado está el exterior (0: izquierda)
    const alto = ph - Math.round(o.alto / PX);
    rect(cx, CONTORNO, 0, 0, pw, ph);
    const cubierta = 6;
    const xCub = fuera === 0 ? 1 : pw - 1 - cubierta;
    for (let y = 1; y < alto; y += 1) rect(cx, y % 3 ? '#b8bdcc' : '#9aa0b4', xCub, y, cubierta, 1);
    const x0 = fuera === 0 ? cubierta + 1 : 1;
    const x1 = fuera === 0 ? pw - 1 : pw - 1 - cubierta;
    for (let x = x0; x + 3 <= x1; x += 4) {
      rect(cx, '#272c4a', fuera === 0 ? x : x + 3, 1, 1, alto - 2);
      for (let y = 1; y + 3 <= alto - 1; y += 3) fan(x, y, 7);
    }
    // Lateral de la grada (el perfil escalonado se ve abajo)
    for (let y = alto; y < ph - 1; y += 1) {
      const k = (y - alto) / (ph - alto);
      const ancho = Math.round((pw - 2) * (1 - 0.55 * (1 - k)));
      const xs = fuera === 0 ? 1 : pw - 1 - ancho;
      rect(cx, (y - alto) % 4 === 0 ? '#474c63' : '#5a6078', xs, y, ancho, 1);
    }
    for (let x = 2; x < pw - 2; x += 5) rect(cx, pal.banderas[(x / 5) % pal.banderas.length | 0], x, ph - 3, 2, 1);
  }
}

function pintarCartel(cx, o, pw, ph, amb) {
  const pal = PALETAS[amb.clave];
  const [fondo, claro] = pal.carteles[o.semilla % pal.carteles.length];
  rect(cx, CONTORNO, 0, 0, pw, ph - 2);
  rect(cx, fondo, 1, 1, pw - 2, ph - 5);
  for (let x = 3; x < pw - 4; x += 12) simbolo(cx, amb.clave, x, 2, claro, fondo);
  rect(cx, 'rgba(255,255,255,.3)', 1, 1, pw - 2, 1);
  rect(cx, CONTORNO, 2, ph - 3, 2, 3);
  rect(cx, CONTORNO, pw - 4, ph - 3, 2, 3);
}

function pintarPorteria(cx, pw, ph) {
  for (let y = 2; y < ph - 3; y += 1) {
    for (let x = 3; x < pw - 3; x += 1) if ((x + y) % 2 === 0) rect(cx, 'rgba(235,240,255,.55)', x, y);
  }
  rect(cx, CONTORNO, 0, 0, pw, 3);
  rect(cx, CONTORNO, 0, 0, 3, ph);
  rect(cx, CONTORNO, pw - 3, 0, 3, ph);
  rect(cx, '#ffffff', 1, 1, pw - 2, 1);
  rect(cx, '#ffffff', 1, 1, 1, ph - 1);
  rect(cx, '#ffffff', pw - 2, 1, 1, ph - 1);
}

function pintarBanquillo(cx, o, pw, ph, amb) {
  const pal = PALETAS[amb.clave];
  if (o.vertical) {
    // Banquillo a lo largo de la banda, visto desde arriba: techo transparente sobre los asientos
    rect(cx, CONTORNO, 0, 0, pw, ph);
    rect(cx, '#3b4262', 1, 1, pw - 2, ph - 2);
    for (let y = 3; y < ph - 4; y += 4) {
      rect(cx, pal.banderas[0], 3, y, pw - 6, 2);
      rect(cx, '#f2c6a0', Math.floor(pw / 2) - 1, y, 2, 1);
    }
    rect(cx, 'rgba(156,196,238,0.45)', 1, 1, Math.ceil(pw / 2), ph - 2);
    rect(cx, '#9cc4ee', 1, 1, 1, ph - 2);
    return;
  }
  rect(cx, CONTORNO, 0, 0, pw, 8);
  rect(cx, '#5b86b8', 1, 1, pw - 2, 6);
  rect(cx, '#9cc4ee', 1, 1, pw - 2, 1);
  rect(cx, '#1d2347', 1, 8, pw - 2, ph - 8);
  for (let x = 3; x + 4 < pw - 2; x += 5) {
    rect(cx, ['#f2c6a0', '#c68642', '#8d5524'][Math.floor(hash(x, o.semilla) * 3)], x + 1, 9, 2, 2);
    rect(cx, pal.banderas[Math.floor(hash(x + 1, o.semilla) * pal.banderas.length)], x, 11, 4, 4);
  }
  rect(cx, '#e8e8f0', 1, ph - 3, pw - 2, 2);
  rect(cx, CONTORNO, 0, 8, 1, ph - 8);
  rect(cx, CONTORNO, pw - 1, 8, 1, ph - 8);
  rect(cx, CONTORNO, 0, ph - 1, pw, 1);
}

function pintarFoco(cx, pw, ph, noche) {
  const m = Math.floor(pw / 2);
  rect(cx, CONTORNO, 0, ph - pw, pw, pw);
  rect(cx, '#59607f', 1, ph - pw + 1, pw - 2, pw - 2);
  rect(cx, '#7d86a8', 1, ph - pw + 1, pw - 2, 2);
  rect(cx, CONTORNO, m - 1, 6, 3, ph - pw - 5);
  rect(cx, '#9aa2c0', m, 6, 1, ph - pw - 5);
  rect(cx, CONTORNO, 0, 0, pw, 7);
  rect(cx, '#3b4262', 1, 1, pw - 2, 5);
  for (let x = 2; x < pw - 2; x += 3) rect(cx, noche ? '#ffffff' : '#fff6b0', x, 2, 2, 3);
}

function pintarArbol(cx, o, pw, ph, amb) {
  const pal = PALETAS[amb.clave];
  const verdes = amb.clave === 'champions' ? ['#1d5a35', '#246b40', '#2f7d4c'] : amb.clave === 'liga' ? ['#3d6b2a', '#4f7f32', '#6a9440'] : ['#2b6e2c', '#358a35', '#4aa84a'];
  const m = pw / 2;
  const tronco = Math.round(o.alto * 0.32 / PX);
  // Tronco
  rect(cx, CONTORNO, m - 2, ph - tronco - 1, 4, tronco + 1);
  rect(cx, '#7a5532', m - 1, ph - tronco - 1, 2, tronco);
  if (o.maceta) {
    rect(cx, CONTORNO, m - 5, ph - 5, 10, 5);
    rect(cx, '#a65e3a', m - 4, ph - 4, 8, 3);
  }
  const copaAlto = ph - tronco;
  const cy = copaAlto / 2;
  const r = Math.min(m - 1, copaAlto / 2 - 1);
  if (o.especie === 'pino') {
    for (let y = 0; y < copaAlto; y += 1) {
      const k = y / copaAlto;
      const ancho = Math.round(r * 2 * (0.15 + 0.85 * k) * (0.8 + 0.2 * ((y % 5) / 5)));
      rect(cx, CONTORNO, m - ancho / 2 - 1, y, ancho + 2, 1);
      rect(cx, y % 5 < 2 ? verdes[2] : verdes[1], m - ancho / 2, y, ancho, 1);
    }
  } else {
    for (let y = 0; y < copaAlto; y += 1) {
      for (let x = 0; x < pw; x += 1) {
        const dx = x + 0.5 - m;
        const dy = y + 0.5 - cy;
        const ang = Math.atan2(dy, dx);
        const lim = r * (0.86 + 0.1 * Math.sin(ang * 5 + o.semilla) + 0.06 * Math.sin(ang * 9));
        const d = Math.hypot(dx, dy);
        if (d > lim + 1) continue;
        if (d > lim) { rect(cx, CONTORNO, x, y); continue; }
        const luz = (-dx - dy) / r; // luz desde arriba a la izquierda
        const hh = hash(x + o.semilla, y);
        rect(cx, luz > 0.35 + hh * 0.3 ? verdes[2] : luz < -0.3 ? verdes[0] : verdes[1], x, y);
      }
    }
    if (pal.confeti && amb.clave === 'mundial') for (let i = 0; i < 4; i += 1) rect(cx, '#ffd166', Math.floor(hash(i, o.semilla) * pw), Math.floor(hash(o.semilla, i) * copaAlto * 0.8) + 2);
  }
}

function pintarTienda(cx, o, pw, ph, amb, mundo) {
  const pal = PALETAS[amb.clave];
  const marca = (o.marca ?? o.semilla) % 4;
  const colores = [['#c8102e', '#ffffff'], ['#1b4fa8', '#ffffff'], ['#111111', '#ffd166'], ['#0a8f4a', '#ffffff']][marca];
  const techo = Math.round(o.h / PX) - 4;
  rect(cx, CONTORNO, 0, 0, pw, ph);
  // Tejado plano visto desde arriba (gravilla) con aparatos
  rect(cx, '#8f8a84', 1, 1, pw - 2, techo - 1);
  for (let i = 0; i < 30; i += 1) rect(cx, '#a29c95', 1 + Math.floor(hash(i, o.semilla) * (pw - 3)), 1 + Math.floor(hash(o.semilla, i) * (techo - 2)));
  rect(cx, '#c9ced9', 4, 3, 6, 4);
  rect(cx, '#6e737f', 5, 4, 4, 2);
  // Fachada: rótulo, escaparate con camisetas y puerta
  const f = techo;
  rect(cx, '#e8e2d6', 1, f, pw - 2, ph - f - 1);
  rect(cx, colores[0], 1, f, pw - 2, 4);
  simbolo(cx, amb.clave === 'inicio' ? 'liga' : amb.clave, Math.floor(pw / 2) - 3, f - 2 + 1, colores[1], colores[0]);
  // Toldo a rayas
  for (let x = 1; x < pw - 1; x += 1) rect(cx, Math.floor(x / 3) % 2 ? colores[0] : '#ffffff', x, f + 4, 1, 3);
  const esc = f + 8;
  const altoEsc = ph - esc - 2;
  rect(cx, '#2a3550', 3, esc, pw - 16, altoEsc);
  // Camisetas en el escaparate (en el Mundial, de selecciones)
  const paises = Object.keys(SELECCIONES);
  for (let x = 5; x < pw - 18; x += 6) {
    let cam = ['#c8102e', '#ffffff'];
    if (amb.clave === 'mundial') { const sel = SELECCIONES[paises[Math.floor(hash(x, o.semilla) * paises.length)]]; cam = [sel.camiseta.c, sel.camiseta.c2]; }
    rect(cx, cam[0], x, esc + 2, 4, 4);
    rect(cx, cam[1], x + 1, esc + 2, 1, 4);
    rect(cx, cam[0], x - 1, esc + 2, 1, 2);
    rect(cx, cam[0], x + 4, esc + 2, 1, 2);
  }
  rect(cx, 'rgba(255,255,255,.25)', 3, esc, pw - 16, 1);
  rect(cx, '#5a3a22', pw - 11, esc, 7, altoEsc + 1); // puerta
  rect(cx, '#ffd166', pw - 6, esc + Math.floor(altoEsc / 2), 1, 1);
  if (pal.banderas && amb.clave !== 'inicio') for (let x = 2; x < pw - 2; x += 4) rect(cx, pal.banderas[(x / 4) % pal.banderas.length | 0], x, f + 7, 2, 1); // guirnalda
}

function pintarKiosco(cx, o, pw, ph, amb, mundo) {
  const pal = PALETAS[amb.clave];
  const colores = aficionDe(amb, mundo);
  rect(cx, CONTORNO, 0, 0, pw, ph);
  for (let x = 1; x < pw - 1; x += 1) rect(cx, Math.floor(x / 3) % 2 ? pal.banderas[0] : '#ffffff', x, 1, 1, 6); // toldo
  rect(cx, '#7a5532', 1, 7, pw - 2, ph - 8);
  rect(cx, '#5f4023', 1, ph - 6, pw - 2, 5); // mostrador
  for (let x = 3; x < pw - 3; x += 3) { // bufandas colgadas
    const c = colores[Math.floor(hash(x, o.semilla) * colores.length)];
    rect(cx, c, x, 8, 2, 5);
    rect(cx, '#ffffff', x, 10, 2, 1);
  }
}

function pintarTrofeo(cx, clave, x, y) {
  // (x, y) = base del trofeo; dibuja hacia arriba
  const oro = ['#b8860b', '#ffd166', '#fff3b0'];
  const plata = ['#7d86a8', '#c9ced9', '#ffffff'];
  if (clave === 'copa') { // Copa del Rey: copa con asas y corona
    rect(cx, CONTORNO, x - 6, y - 22, 13, 22);
    rect(cx, plata[1], x - 2, y - 4, 5, 4);
    rect(cx, plata[1], x - 1, y - 9, 3, 5);
    rect(cx, plata[1], x - 5, y - 17, 11, 8);
    rect(cx, plata[2], x - 4, y - 16, 2, 6);
    rect(cx, plata[0], x - 6, y - 16, 1, 4);
    rect(cx, plata[0], x + 6, y - 16, 1, 4);
    rect(cx, oro[1], x - 3, y - 21, 7, 3);
    [x - 3, x, x + 3].forEach((xx) => rect(cx, oro[1], xx, y - 23, 1, 2));
  } else if (clave === 'liga') { // trofeo alto de liga
    rect(cx, CONTORNO, x - 5, y - 26, 11, 26);
    rect(cx, plata[1], x - 3, y - 4, 7, 4);
    rect(cx, plata[1], x - 1, y - 14, 3, 10);
    rect(cx, plata[1], x - 4, y - 25, 9, 11);
    rect(cx, plata[2], x - 3, y - 24, 2, 9);
    rect(cx, '#c8102e', x - 4, y - 18, 9, 1);
  } else if (clave === 'champions') { // la de las orejas grandes
    rect(cx, CONTORNO, x - 9, y - 24, 19, 24);
    rect(cx, plata[1], x - 3, y - 4, 7, 4);
    rect(cx, plata[1], x - 1, y - 10, 3, 6);
    rect(cx, plata[1], x - 4, y - 22, 9, 12);
    rect(cx, plata[2], x - 3, y - 21, 2, 10);
    for (const s of [-1, 1]) { // orejas
      rect(cx, plata[1], x + s * 6 - (s < 0 ? 1 : 0), y - 21, 2, 9);
      rect(cx, plata[1], x + s * 5 - (s < 0 ? 0 : 0), y - 22, 2, 1);
      rect(cx, plata[1], x + s * 5, y - 13, 2, 1);
    }
  } else if (clave === 'mundial') { // trofeo dorado con el mundo arriba
    rect(cx, CONTORNO, x - 6, y - 28, 13, 28);
    rect(cx, '#1d6b3a', x - 4, y - 4, 9, 4);
    rect(cx, oro[1], x - 3, y - 5, 7, 1);
    rect(cx, oro[1], x - 2, y - 16, 5, 11);
    rect(cx, oro[0], x - 2, y - 12, 1, 6);
    rect(cx, oro[1], x - 5, y - 27, 11, 11);
    rect(cx, oro[2], x - 3, y - 25, 3, 3);
    rect(cx, oro[0], x - 5, y - 21, 11, 1);
  } else { // balón gigante
    rect(cx, CONTORNO, x - 8, y - 17, 17, 17);
    rect(cx, '#ffffff', x - 7, y - 16, 15, 15);
    rect(cx, '#1d2140', x - 2, y - 11, 5, 5);
    rect(cx, '#1d2140', x - 7, y - 9, 2, 3);
    rect(cx, '#1d2140', x + 6, y - 9, 2, 3);
    rect(cx, '#1d2140', x - 2, y - 16, 5, 2);
    rect(cx, '#1d2140', x - 2, y - 3, 5, 2);
  }
}

function pintarMonumento(cx, o, pw, ph, amb) {
  const base = Math.round(o.h / PX);
  const top = ph - base;
  // Fuente redonda (vista desde arriba) con agua
  for (let y = 0; y < base; y += 1) {
    for (let x = 0; x < pw; x += 1) {
      const dx = (x + 0.5 - pw / 2) / (pw / 2);
      const dy = (y + 0.5 - base / 2) / (base / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      rect(cx, d > 0.8 ? '#cfc6b4' : d > 0.72 ? CONTORNO : hash(x, y) > 0.85 ? '#9fd4ff' : '#4d8fc4', x, top + y);
    }
  }
  // Pedestal y trofeo
  const m = Math.floor(pw / 2);
  rect(cx, CONTORNO, m - 7, top - 6 + base / 2, 15, 10);
  rect(cx, '#8f95aa', m - 6, top - 5 + base / 2, 13, 8);
  rect(cx, '#c9ced9', m - 6, top - 5 + base / 2, 13, 2);
  pintarTrofeo(cx, amb.clave, m, top - 5 + base / 2);
}

function pintarPantalla(cx, o, pw, ph, amb) {
  const pal = PALETAS[amb.clave];
  const pie = Math.round(o.h / PX);
  const alto = ph - pie;
  // Patas
  rect(cx, CONTORNO, 4, alto - 4, 3, pie + 4);
  rect(cx, CONTORNO, pw - 7, alto - 4, 3, pie + 4);
  // Marco y pantalla
  rect(cx, CONTORNO, 0, 0, pw, alto - 3);
  rect(cx, '#2a2f45', 1, 1, pw - 2, alto - 5);
  const [fondo, claro] = pal.carteles[0];
  rect(cx, fondo, 3, 3, pw - 6, alto - 9);
  for (let y = 3; y < alto - 6; y += 2) rect(cx, 'rgba(255,255,255,.06)', 3, y, pw - 6, 1);
  // Símbolo grande en el centro y nombre (en bloques)
  const m = Math.floor(pw / 2);
  cx.save();
  cx.translate(m - 10, 4);
  cx.scale(3, 3);
  simbolo(cx, amb.clave, 0, 0, claro, fondo);
  cx.restore();
  for (let x = 8; x < pw - 8; x += 1) if (hash(x, 3) > 0.4) rect(cx, claro, x, alto - 10, 1, 2);
  // Altavoces
  rect(cx, '#1d2140', 0, alto - 12, 4, 8);
  rect(cx, '#1d2140', pw - 4, alto - 12, 4, 8);
}

function pintarValla(cx, o, pw, ph) {
  const verde = o.jaula ? '#3b6e4a' : '#d8dbe4';
  if (o.vertical) {
    rect(cx, CONTORNO, 0, 0, pw, ph);
    rect(cx, verde, 1, 0, pw - 2, ph - 1);
    for (let y = 0; y < ph; y += 4) rect(cx, '#9aa0b8', 0, y, pw, 1);
    return;
  }
  const alto = ph - Math.round(o.h / PX);
  for (let x = 0; x < pw; x += 5) rect(cx, CONTORNO, x, 0, 1, ph);
  for (let y = 0; y < alto; y += 1) for (let x = 0; x < pw; x += 1) if ((x + y) % 3 === 0) rect(cx, verde, x, y);
  rect(cx, CONTORNO, 0, 0, pw, 1);
}

function pintarBanco(cx, pw, ph) {
  rect(cx, CONTORNO, 0, 0, pw, ph);
  rect(cx, '#a0703f', 1, 1, pw - 2, 2);
  rect(cx, '#8a5a32', 1, 4, pw - 2, 2);
  rect(cx, '#5c6070', 2, ph - 2, 2, 2);
  rect(cx, '#5c6070', pw - 4, ph - 2, 2, 2);
}

function pintarFarola(cx, o, pw, ph, amb) {
  const pal = PALETAS[amb.clave];
  const m = Math.floor(pw / 2);
  rect(cx, CONTORNO, m - 1, 3, 3, ph - 3);
  rect(cx, '#5c6070', m, 3, 1, ph - 4);
  rect(cx, CONTORNO, m - 2, 0, 5, 4);
  rect(cx, pal.noche ? '#fff6c8' : '#e8e2c0', m - 1, 1, 3, 2);
  if (amb.clave !== 'inicio') { // banderola colgada
    rect(cx, pal.banderas[0], m + 2, 6, 2, 6);
    rect(cx, pal.banderas[1 % pal.banderas.length], m + 2, 9, 2, 2);
  }
}

function pintarRoca(cx, o, pw, ph) {
  for (let y = 0; y < ph; y += 1) {
    for (let x = 0; x < pw; x += 1) {
      const dx = (x + 0.5 - pw / 2) / (pw / 2);
      const dy = (y + 0.5 - ph * 0.55) / (ph * 0.5);
      const d = dx * dx + dy * dy * 1.2;
      if (d > 1) continue;
      rect(cx, d > 0.75 ? CONTORNO : dy < -0.2 ? '#a3a2a8' : hash(x, y + o.semilla) > 0.8 ? '#6e6d75' : '#8a8992', x, y);
    }
  }
}

function pintarFuente(cx, o, pw, ph) {
  for (let y = 0; y < ph; y += 1) {
    for (let x = 0; x < pw; x += 1) {
      const dx = (x + 0.5 - pw / 2) / (pw / 2);
      const dy = (y + 0.5 - ph / 2) / (ph / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      rect(cx, d > 0.78 ? '#cfc6b4' : d > 0.7 ? CONTORNO : hash(x, y) > 0.85 ? '#9fd4ff' : '#4d8fc4', x, y);
    }
  }
  rect(cx, '#cfc6b4', Math.floor(pw / 2) - 2, Math.floor(ph / 2) - 3, 4, 4);
}

const SIN_SPRITE = new Set(['talud']);
/** ¿Cambia el dibujo con el ambiente? (las rocas, por ejemplo, no). */
const POR_AMBIENTE = new Set(['grada', 'cartel', 'banquillo', 'foco', 'arbol', 'tienda', 'kiosco', 'monumento', 'pantalla', 'farola']);

function spriteObstaculo(ob, amb, mundo, frame) {
  const clave = `${ob.id}:${POR_AMBIENTE.has(ob.tipo) ? amb.clave : ''}:${frame}`;
  let c = sprites.get(clave);
  if (c) return c;
  const o = ob.hBase !== undefined ? { ...ob, h: ob.hBase } : ob; // los dibujos trabajan con el fondo de la base
  const pw = Math.max(4, Math.round(o.w / PX));
  let ph = Math.max(4, Math.round((o.h + o.alto) / PX));
  let ancho = pw;
  if (o.tipo === 'arbol') { ancho = Math.round((o.copa * 2) / PX) + 2; ph = Math.round((o.alto + o.copa * 0.6) / PX); }
  if (o.tipo === 'farola') ancho = 7;
  c = lienzo(ancho, ph);
  const cx = c.getContext('2d');
  const noche = PALETAS[amb.clave].noche > 0;
  switch (o.tipo) {
    case 'grada': pintarGrada(cx, o, pw, ph, amb, mundo, frame); break;
    case 'cartel': pintarCartel(cx, o, pw, ph, amb); break;
    case 'porteria': pintarPorteria(cx, pw, ph); break;
    case 'banquillo': pintarBanquillo(cx, o, pw, ph, amb); break;
    case 'foco': pintarFoco(cx, pw, ph, noche); break;
    case 'arbol': pintarArbol(cx, o, ancho, ph, amb); break;
    case 'tienda': pintarTienda(cx, o, pw, ph, amb, mundo); break;
    case 'kiosco': pintarKiosco(cx, o, pw, ph, amb, mundo); break;
    case 'monumento': pintarMonumento(cx, o, pw, ph, amb); break;
    case 'pantalla': pintarPantalla(cx, o, pw, ph, amb); break;
    case 'valla': pintarValla(cx, o, pw, ph); break;
    case 'banco': pintarBanco(cx, pw, ph); break;
    case 'farola': pintarFarola(cx, o, ancho, ph, amb); break;
    case 'roca': pintarRoca(cx, o, pw, ph); break;
    case 'fuente': pintarFuente(cx, o, pw, Math.round(o.h / PX)); break;
    default: rect(cx, '#888', 0, 0, pw, ph);
  }
  if (sprites.size > 900) sprites.delete(sprites.keys().next().value);
  sprites.set(clave, c);
  return c;
}

function sombra(ctx, x, y, rx, ry, alfa = 0.28) {
  ctx.fillStyle = `rgba(0,0,0,${alfa})`;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Dibuja un obstáculo de pie sobre su sitio (en coordenadas del mundo). */
export function dibujarObstaculo(ctx, o, amb, mundo, t) {
  if (SIN_SPRITE.has(o.tipo)) return;
  const frame = o.tipo === 'grada' ? Math.floor(t * 2.2 + (o.semilla % 7) * 0.3) % 2 : 0;
  const c = spriteObstaculo(o, amb, mundo, frame);
  if (o.tipo === 'arbol') {
    const w = c.width * PX;
    const h = c.height * PX;
    sombra(ctx, o.x + 8, o.y + 4, o.copa * 0.9, o.copa * 0.32, 0.3);
    // Si estás detrás de la copa, se vuelve transparente para que no te pierdas de vista
    const j = mundo.jugador;
    const detras = j && j.y < o.y && j.y > o.y - h - 20 && Math.abs(j.x - o.x) < w / 2 + 8;
    if (detras) ctx.globalAlpha = 0.45;
    ctx.drawImage(c, o.x - w / 2, o.y + o.h / 2 - h, w, h);
    ctx.globalAlpha = 1;
    return;
  }
  if (o.tipo === 'farola') {
    sombra(ctx, o.x, o.y + 3, 8, 3);
    ctx.drawImage(c, o.x - (c.width * PX) / 2, o.y + o.h / 2 - c.height * PX, c.width * PX, c.height * PX);
    return;
  }
  if (o.tipo === 'fuente') {
    ctx.drawImage(c, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
    return;
  }
  if (o.tipo === 'foco') sombra(ctx, o.x + 26, o.y + o.h / 2 - 4, 44, 8);
  else sombra(ctx, o.x, o.y + o.h / 2 - 2, o.w * 0.52, 8);
  // Los macizos ya incluyen su altura en `h` (lo que se ve es lo que choca); el resto se dibuja hacia arriba
  if (o.hBase !== undefined) ctx.drawImage(c, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
  else ctx.drawImage(c, o.x - o.w / 2, o.y - o.h / 2 - o.alto, o.w, o.h + o.alto);
}

/** Obstáculos que se dibujan pegados al suelo (antes que nadie): no tapan a nadie. */
export const esDeSuelo = (o) => o.tipo === 'fuente' || o.tipo === 'talud';

// ---------------------------------------------------------------------------------------------
// Adornos sueltos: matas, piedras, banderas
// ---------------------------------------------------------------------------------------------

/** Matorral: una bola de hojas con luz arriba a la izquierda y, a veces, flores. */
function spriteMata(d, amb) {
  const clave = `m:${d.id}:${amb.clave}`;
  let c = sprites.get(clave);
  if (c) return c;
  const r = Math.max(3, Math.round((d.r || 14) / PX));
  const w = r * 2 + 2;
  const h = Math.round(r * 1.5) + 2;
  c = lienzo(w, h);
  const cx = c.getContext('2d');
  const verdes = amb.clave === 'champions' ? ['#174a2c', '#1d5a35', '#2f7d4c'] : amb.clave === 'liga' ? ['#35602a', '#4f7f32', '#6a9440'] : ['#22592a', '#2f7a33', '#4aa84a'];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = (x + 0.5 - w / 2) / (w / 2 - 0.5);
      const dy = (y + 0.5 - h * 0.58) / (h * 0.58 - 0.5);
      const bulto = 0.12 * Math.sin(x * 1.7 + d.semilla);
      const dd = dx * dx + dy * dy - bulto;
      if (dd > 1.12) continue;
      if (dd > 0.85) { rect(cx, CONTORNO, x, y); continue; }
      const luz = -dx * 0.6 - dy;
      rect(cx, luz > 0.45 ? verdes[2] : luz < -0.4 ? verdes[0] : verdes[1], x, y);
    }
  }
  const pal = PALETAS[amb.clave];
  if (d.semilla % 3 === 0) {
    for (let i = 0; i < 3; i += 1) rect(cx, pal.flores[(d.semilla + i) % pal.flores.length], 2 + Math.floor(hash(i, d.semilla) * (w - 4)), 1 + Math.floor(hash(d.semilla, i) * (h - 3)));
  }
  sprites.set(clave, c);
  return c;
}

export function dibujarAdorno(ctx, d, amb, t) {
  if (d.tipo === 'mata') {
    const r = d.r || 14;
    const c = spriteMata(d, amb);
    const w = c.width * PX;
    const h = c.height * PX;
    sombra(ctx, d.x, d.y + 2, r, r * 0.35, 0.2);
    ctx.drawImage(c, d.x - w / 2, d.y + 4 - h, w, h);
  } else if (d.tipo === 'piedras') {
    ctx.fillStyle = '#6e6d75';
    ctx.fillRect(d.x - 8, d.y - 4, 8, 6);
    ctx.fillRect(d.x + 4, d.y, 6, 4);
    ctx.fillStyle = '#a3a2a8';
    ctx.fillRect(d.x - 8, d.y - 4, 8, 2);
  } else if (d.tipo === 'bandera') {
    const pal = PALETAS[amb.clave];
    const ondea = Math.sin(t * 5 + d.semilla) * 3;
    ctx.fillStyle = CONTORNO;
    ctx.fillRect(d.x - 1, d.y - 70, 3, 70);
    ctx.fillStyle = pal.banderas[d.semilla % pal.banderas.length];
    ctx.fillRect(d.x + 2, d.y - 70 + ondea * 0.3, 26, 9);
    ctx.fillStyle = pal.banderas[(d.semilla + 1) % pal.banderas.length];
    ctx.fillRect(d.x + 2, d.y - 61 + ondea * 0.3, 26, 9);
  }
}

// ---------------------------------------------------------------------------------------------
// Luz del ambiente: tinte de tarde, atardecer o noche con focos, farolas y bengalas
// ---------------------------------------------------------------------------------------------

let capaLuz = null;

/** Fuentes de luz visibles (en coordenadas del mundo) según lo que hay cerca. */
function lucesDe(mundo, obstaculos, amb, t) {
  const luces = [];
  const j = mundo.jugador;
  luces.push({ x: j.x, y: j.y, r: 250, k: 0.9 });
  for (const o of obstaculos) {
    if (o.tipo === 'foco') luces.push({ x: o.x, y: o.y + 140, r: 360, k: 0.9 });
    else if (o.tipo === 'farola') luces.push({ x: o.x, y: o.y, r: 150, k: 0.85 });
    else if (o.tipo === 'pantalla') luces.push({ x: o.x, y: o.y + 90, r: 230, k: 0.75 });
    else if (o.tipo === 'kiosco' || o.tipo === 'tienda') luces.push({ x: o.x, y: o.y + o.h / 2 + 30, r: 130, k: 0.6 });
    else if (o.tipo === 'grada') { // bengalas en la grada
      for (let i = 0; i < 3; i += 1) luces.push({ x: o.x + (hash(i, o.semilla) - 0.5) * o.w * 0.8, y: o.y + (hash(o.semilla, i) - 0.5) * o.h * 0.8, r: 70 + 20 * Math.sin(t * 7 + i), k: 0.7 });
    } else if (o.tipo === 'monumento') luces.push({ x: o.x, y: o.y, r: 190, k: 0.75 });
  }
  for (const p of mundo.proyectiles) if (luces.length < 60) luces.push({ x: p.x, y: p.y, r: 60, k: 0.5 });
  return luces;
}

/**
 * Pinta la luz del ambiente sobre la escena (en píxeles de pantalla). `aPantalla(x, y)` pasa del mundo a la pantalla.
 */
export function dibujarLuz(ctx, mundo, amb, obstaculos, ancho, alto, escala, aPantalla, t) {
  const pal = PALETAS[amb.clave];
  if (pal.tinte === 'atardecer') {
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, 'rgba(255,120,60,0.22)');
    g.addColorStop(0.55, 'rgba(255,170,90,0.08)');
    g.addColorStop(1, 'rgba(120,40,110,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
  } else if (pal.tinte) {
    ctx.fillStyle = pal.tinte;
    ctx.fillRect(0, 0, ancho, alto);
  }
  if (pal.noche > 0) {
    if (!capaLuz || capaLuz.width !== Math.ceil(ancho) || capaLuz.height !== Math.ceil(alto)) capaLuz = lienzo(Math.ceil(ancho), Math.ceil(alto));
    const c = capaLuz.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, capaLuz.width, capaLuz.height);
    c.fillStyle = amb.clave === 'mundial' ? `rgba(28,14,40,${pal.noche})` : `rgba(6,12,40,${pal.noche})`;
    c.fillRect(0, 0, capaLuz.width, capaLuz.height);
    c.globalCompositeOperation = 'destination-out';
    for (const l of lucesDe(mundo, obstaculos, amb, t)) {
      const [sx, sy] = aPantalla(l.x, l.y);
      const r = l.r * escala;
      if (sx < -r || sy < -r || sx > ancho + r || sy > alto + r) continue;
      const g = c.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(0,0,0,${l.k})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.drawImage(capaLuz, 0, 0, ancho, alto);
    // Un toque de color en las luces (azul en Champions, dorado en el Mundial)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of obstaculos) {
      if (o.tipo !== 'foco') continue;
      const [sx, sy] = aPantalla(o.x, o.y - o.alto);
      const r = 90 * escala;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, amb.clave === 'mundial' ? 'rgba(255,220,140,0.35)' : 'rgba(170,200,255,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  // Viñeta suave en los ambientes de final
  if (amb.clave !== 'inicio') {
    const g = ctx.createRadialGradient(ancho / 2, alto / 2, Math.min(ancho, alto) * 0.35, ancho / 2, alto / 2, Math.max(ancho, alto) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
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
export const estadoCaches = () => ({ texturas: texturas.size, sprites: sprites.size });
export { azar };
