// Suelo del mundo: una textura por celda (640×640 unidades → 320×320 píxeles de 2 unidades) y por ambiente.
// Se pinta píxel a píxel en un búfer: césped con tonos tramados, briznas, flores y piedras; campos con franjas
// de corte, desgaste y líneas; caminos con bordes; barro con charcos; lluvia con charcos que reflejan el cielo;
// plazas de adoquines, explanadas de hormigón con bordillos; mesetas con taludes de tierra y escaleras; los
// matorrales; y las SOMBRAS de todo lo que está de pie (árboles, gradas, focos…), todas hacia el mismo lado.
// Como todo eso queda en la textura, cada fotograma solo cuesta un drawImage por celda.
//
// Rendimiento: la textura se pinta con un generador que se puede parar y seguir, así que se reparte entre
// varios fotogramas con un presupuesto de tiempo (y se adelanta la de las celdas de alrededor).
import { TERRENO } from './config.js';
import {
  celda as celdaTerreno, loteDe, nivelBaldosa, tono as tonoEn, humedad as humedadEn, nubes as nubesEn,
  caminoValor, ANCHO_CAMINO, pavimentado, enPlaza, ruido,
} from './terreno.js';
import { PALETAS, PX, rgb, hash, BAYER } from './render-paletas.js';
import { sombrasDe } from './render-obstaculos.js';

// Materiales de cada píxel (deciden qué detalles se pueden poner encima)
const CESPED = 0;
const CAMPO = 1;
const PISTA = 2;
const PISTA_BORDE = 3;
const PLAZA = 4;
const CALLE = 5;
const ACERA = 6;
const HORMIGON = 7;
const TIERRA = 8;
const CAMINO = 9;
const BARRO = 10;
const CHARCO_BARRO = 11;
const CHARCO = 12;
const TALUD = 13;
const ESCALON = 14;
const MATA = 15;
/** Suelos duros: llevan bordillo donde tocan la hierba o la tierra (tabla por material). */
const DURO = new Uint8Array(16);
for (const m of [PLAZA, CALLE, ACERA, HORMIGON, PISTA_BORDE]) DURO[m] = 1;
/** Lo que no lleva bordillo al lado de un suelo duro (otro suelo duro, el césped de un campo, la pista, escalones). */
const SIN_BORDILLO = new Uint8Array(16);
for (const m of [PLAZA, CALLE, ACERA, HORMIGON, PISTA_BORDE, CAMPO, PISTA, ESCALON]) SIN_BORDILLO[m] = 1;

// Superficies (rejilla de 4 unidades)
const S_NADA = 0;
const S_CAMPO = 1;
const S_PISTA = 2;
const S_PISTA_BORDE = 3;
const S_PLAZA = 4;
const S_CALLE = 5;
const S_ACERA = 6;
const S_HORMIGON = 7;
const S_TIERRA = 8;

const G = 8; // paso de la rejilla de ruidos (unidades)
const FR = [1 / 8, 3 / 8, 5 / 8, 7 / 8]; // dónde cae cada píxel dentro de su casilla de 8 unidades

const C = (h) => rgb(h);
const TIERRAS = ['#7a5532', '#6e4b2a', '#5f4023'].map(C);
const ARENA = ['#bf9f72', '#b39268', '#a7865a', '#98794f'].map(C);
const ARENA_BORDE = C('#6f5434');
const PIEDRAS = ['#d2cbbb', '#c6beae', '#b9b1a1', '#aca494'].map(C);
const PIEDRAS_ANILLO = ['#b49278', '#a8866c', '#9c7c62'].map(C);
const JUNTA_PIEDRA = C('#8a8274');
const HORMIGONES = ['#acaeb5', '#a4a6ad', '#9b9da5'].map(C);
const JUNTA_HORMIGON = C('#83858d');
const CALLES = ['#8f9199', '#878991', '#7f8189'].map(C);
const JUNTA_CALLE = C('#6c6e76');
const ACERAS = ['#c2bdb3', '#b8b3a9'].map(C);
const JUNTA_ACERA = C('#96918a');
const BORDILLO_LUZ = C('#e2ddd2');
const BORDILLO_SOMBRA = C('#6a6862');
const PISTA_C = [C('#2f6db3'), C('#2b66a8')];
const PISTA_FUERA = [C('#c2443f'), C('#b33d39')];
const TALUDES = ['#8b7a62', '#7a6a55', '#695a47', '#574a3a'].map(C);
const PIEDRA_TALUD = [C('#a8a39a'), C('#7c776f')];
const BARROS = ['#6b4828', '#5d3f22', '#77522f'].map(C);
const BARRO_BORDE = C('#3f2913');
const BARRO_CLARO = C('#93703f');
const CHARCO_BARRO_C = [C('#56442f'), C('#64513a')];
const DESGASTE = C('#a69c5e');
const BLANCO = C('#f3f6ee');
const ESCALONES = [C('#d6cdbb'), C('#a99f8b'), C('#7d7464'), C('#5c5246')];

/** Colores del agua de los charcos: reflejan el cielo de cada ambiente. */
const AGUA = {
  inicio: ['#5a86aa', '#a9cde6', '#2f5070'],
  copa: ['#6a8fa8', '#f1d9a0', '#34587a'],
  liga: ['#5d6a8a', '#f2a985', '#363650'],
  champions: ['#1b2b55', '#7d9be0', '#0d1733'],
  mundial: ['#2b2152', '#e8c06a', '#160f30'],
};

// ---------------------------------------------------------------------------------------------
// Búferes reutilizables: pintar una celda necesita más de un mega de memoria de trabajo; si se pidiera
// nueva cada vez, el recolector de basura del navegador pararía el juego a menudo (tirones de 10–30 ms)
// ---------------------------------------------------------------------------------------------

const reservas = [];
function tomarBuferes(n, m, mg, ms, crearImagen) {
  const b = reservas.pop();
  if (b) {
    b.moja.fill(0);
    b.som.fill(0);
    return b;
  }
  const f32 = (k) => new Float32Array(k);
  return {
    gTono: f32(mg * mg), gHum: f32(mg * mg), gNub: f32(mg * mg), gCam: f32(mg * mg), gMan: f32(mg * mg),
    fTono: f32(m * m), fHum: f32(m * m), fNub: f32(m * m), fCam: f32(m * m), fMan: f32(m * m), fVerde: f32(m * m),
    fPav: new Uint8Array(m * m), cerca: new Uint8Array(m * m), fSup: new Uint8Array(ms * ms), fArea: new Uint8Array(ms * ms),
    mat: new Uint8Array(n * n), moja: new Uint8Array(n * n), som: new Uint8Array(n * n), imagen: crearImagen(),
  };
}
const devolverBuferes = (b) => { if (reservas.length < 3) reservas.push(b); };
// Matorrales: casillas de trabajo compartidas (se pintan de uno en uno)
let mataDentro = new Uint8Array(64 * 64);
let mataTono = new Uint8Array(64 * 64);

// ---------------------------------------------------------------------------------------------
// Pintar una celda (generador: cede el control cada cierto trabajo)
// ---------------------------------------------------------------------------------------------

/** Nivel de la baldosa (i, k) de la celda (de -1 a NB: también las de alrededor). */
const nivDe = (e) => {
  const { nivRejilla, NB } = e;
  return (i, k) => nivRejilla[(k + 1) * (NB + 2) + i + 1];
};
/** Pinta un píxel de la textura (si `solo` ≥ 0, solo encima de ese material). */
const ponDe = (e) => {
  const { n, mat, d } = e;
  return (x, y, col, solo = -1) => {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    const io = y * n + x;
    if (solo >= 0 && mat[io] !== solo) return;
    const o = io * 4;
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2];
  };
};

/** Datos de una celda que comparten todas las fases de su pintado (y sus búferes de trabajo). */
function prepararCelda(t, c, amb) {
  const pal = PALETAS[amb.clave];
  const L = TERRENO.celda;
  const n = L / PX; // 320
  const ox = c.cx * L;
  const oy = c.cy * L;
  const gx0 = c.cx * n; // coordenadas globales del píxel (para que el grano siga de una celda a otra)
  const gy0 = c.cy * n;
  const B = TERRENO.baldosa;
  const NB = L / B;
  const { umbralBarro, umbralLluvia, frente } = TERRENO;
  const verdes = pal.cesped.map(C);
  const franjas = pal.franjas.map(C);
  const agua = AGUA[amb.clave].map(C);
  const lote = c.lote.tipo;
  const urbano = lote === 'plaza' || lote === 'grada' || lote === 'estadio';
  const cuadros = amb.clave === 'champions' || amb.clave === 'mundial'; // corte en cuadros en las grandes finales

  // A) Ruidos: son suaves (ondas de 150 unidades o más), así que se calculan cada 16 unidades y se interpolan
  //    a una rejilla de 8 alineada con la celda (81×81: el borde se comparte con la vecina)
  const m = L / G + 1;
  const mg = L / (G * 2) + 1;
  const ms = L / 4;
  const lienzo = document.createElement('canvas');
  lienzo.width = n;
  lienzo.height = n;
  const cx2 = lienzo.getContext('2d');
  const buf = tomarBuferes(n, m, mg, ms, () => cx2.createImageData(n, n));
  return {
    t, c, amb, pal, L, n, ox, oy, gx0, gy0, B, NB, umbralBarro, umbralLluvia, frente, verdes, franjas, agua, lote, urbano, cuadros,
    m, mg, ms, lienzo, cx2, buf, ...buf, d: buf.imagen.data,
  };
}

/** Fase A1: ruidos suaves cada 16 unidades. */
function camposGruesos(e) {
  const { t, ox, oy, mg, gTono, gHum, gNub, gCam, gMan } = e;
  for (let j = 0; j < mg; j += 1) {
    for (let i = 0; i < mg; i += 1) {
      const x = ox + i * G * 2;
      const y = oy + j * G * 2;
      const k = j * mg + i;
      gTono[k] = tonoEn(t, x, y);
      gHum[k] = humedadEn(t, x, y);
      gNub[k] = nubesEn(t, x, y);
      gCam[k] = Math.abs(caminoValor(t, x, y) - 0.5) / ANCHO_CAMINO;
      gMan[k] = ruido(t.semilla, x * 0.8 - y * 0.6, x * 0.6 + y * 0.8, 170, 77, 2); // girado: sin bordes rectos de la rejilla
    }
  }
}

/** Fase A2: los ruidos interpolados a la rejilla de 8 unidades, el verde combinado y las casillas cerca de un borde. */
function camposFinos(e) {
  const { t, ox, oy, umbralBarro, umbralLluvia, m, mg, gTono, gHum, gNub, gCam, gMan, fTono, fHum, fNub, fCam, fMan, fVerde, fPav, cerca } = e;
  for (let j = 0; j < m; j += 1) {
    const jg = Math.min(mg - 2, j >> 1);
    const fy = (j - jg * 2) / 2;
    for (let i = 0; i < m; i += 1) {
      const ig = Math.min(mg - 2, i >> 1);
      const fx = (i - ig * 2) / 2;
      const kg = jg * mg + ig;
      const k = j * m + i;
      // Pesos de la interpolación bilineal (manchas de tono y manchas medias, humedad, nubes y caminos)
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const k1 = kg + 1;
      const k2 = kg + mg;
      const k3 = kg + mg + 1;
      fTono[k] = gTono[kg] * w00 + gTono[k1] * w10 + gTono[k2] * w01 + gTono[k3] * w11;
      const hum = gHum[kg] * w00 + gHum[k1] * w10 + gHum[k2] * w01 + gHum[k3] * w11;
      fHum[k] = hum;
      fNub[k] = gNub[kg] * w00 + gNub[k1] * w10 + gNub[k2] * w01 + gNub[k3] * w11;
      fCam[k] = gCam[kg] * w00 + gCam[k1] * w10 + gCam[k2] * w01 + gCam[k3] * w11;
      fMan[k] = gMan[kg] * w00 + gMan[k1] * w10 + gMan[k2] * w01 + gMan[k3] * w11;
      fPav[k] = hum > umbralBarro - 0.015 && pavimentado(t, ox + i * G, oy + j * G) ? 1 : 0;
    }
  }
  // Valor del verde (tono general + manchas), ya combinado para interpolar una sola vez por píxel
  for (let k = 0; k < m * m; k += 1) fVerde[k] = 1.2 + fTono[k] * 1.5 + (fMan[k] - 0.5) * 1.5;
  // Casillas cerca de un borde (camino, barro, lluvia): solo en ellas hace falta interpolar ese ruido
  for (let j = 0; j < m - 1; j += 1) {
    for (let i = 0; i < m - 1; i += 1) {
      const k = j * m + i;
      let f = 0;
      if (Math.min(fCam[k], fCam[k + 1], fCam[k + m], fCam[k + m + 1]) < 1.3) f |= 1;
      if (Math.max(fHum[k], fHum[k + 1], fHum[k + m], fHum[k + m + 1]) > umbralBarro - 0.014) f |= 2;
      if (Math.max(fNub[k], fNub[k + 1], fNub[k + m], fNub[k + m + 1]) > umbralLluvia - 0.006) f |= 4;
      cerca[k] = f;
    }
  }
}

/** Fase B: superficies (campos, plazas, explanadas…) en una rejilla de 4 unidades y niveles de las baldosas. */
function superficies(e) {
  const { t, c, L, n, ox, oy, B, NB, lote, ms, fSup, fArea } = e;
  // B) Superficies (campos, plazas, explanadas…) en una rejilla de 4 unidades
  const areas = c.suelo.filter((a) => a.tipo !== 'escalera' && a.tipo !== 'rampa');
  const escaleras = c.suelo.filter((a) => a.tipo === 'escalera' || a.tipo === 'rampa');
  const vecinoUrbano = {};
  for (const [lado, i, k] of [['n', 0, -1], ['s', 0, 1], ['o', -1, 0], ['e', 1, 0]]) {
    const v = loteDe(t, c.cx + i, c.cy + k).tipo;
    vecinoUrbano[lado] = v === 'grada' || v === 'estadio' || v === 'plaza';
  }
  // Borde ondulado de la explanada o del anillo (recto donde sigue la ciudad al lado)
  const onda = (v, f) => 36 + 15 * Math.sin(v * 0.019 + f) + 8 * Math.sin(v * 0.053 + f * 2.3);
  const fase = c.cx * 1.7 + c.cy * 2.9;
  const dentroBorde = (x, y, sx) => (vecinoUrbano.o || x - ox > onda(y, fase + sx)) && (vecinoUrbano.e || ox + L - x > onda(y, fase + sx + 1.1))
    && (vecinoUrbano.n || y - oy > onda(x, fase + sx + 2.2)) && (vecinoUrbano.s || oy + L - y > onda(x, fase + sx + 3.3));
  for (let j = 0; j < ms; j += 1) {
    for (let i = 0; i < ms; i += 1) {
      const x = ox + i * 4 + 2;
      const y = oy + j * 4 + 2;
      const k = j * ms + i;
      let v = S_NADA;
      let ar = 0;
      for (let ia = 0; ia < areas.length; ia += 1) {
        const a = areas[ia];
        if (a.tipo === 'campo' && Math.abs(x - a.x) < a.w / 2 && Math.abs(y - a.y) < a.h / 2) { v = S_CAMPO; ar = ia; } else if (a.tipo === 'pista' && Math.abs(x - a.x) < a.w / 2 + 6 && Math.abs(y - a.y) < a.h / 2 + 6) {
          v = Math.abs(x - a.x) < a.w / 2 - 14 && Math.abs(y - a.y) < a.h / 2 - 14 ? S_PISTA : S_PISTA_BORDE;
          ar = ia;
        } else if (a.tipo === 'plaza' && Math.abs(x - a.x) < a.r && Math.abs(y - a.y) < a.r && enPlaza(t, a, x, y)) { v = S_PLAZA; ar = ia; } else if (a.tipo === 'calle' && Math.abs(y - a.y) < a.h / 2) { v = Math.abs(y - a.y) > a.h / 2 - 30 ? S_ACERA : S_CALLE; ar = ia; } else if (a.tipo === 'explanada' && v === S_NADA) {
          if (dentroBorde(x, y, 0)) v = S_HORMIGON;
        } else if (a.tipo === 'tierra' && v === S_NADA && (x - a.x) ** 2 + (y - a.y) ** 2 < a.r * a.r) { v = S_TIERRA; ar = ia; }
      }
      if (lote === 'estadio' && v === S_NADA && dentroBorde(x, y, 5)) v = S_HORMIGON; // anillo del estadio
      fSup[k] = v;
      fArea[k] = ar;
    }
  }
  // Niveles de las baldosas de la celda y de su alrededor
  const nivRejilla = new Int8Array((NB + 2) * (NB + 2));
  for (let k = -1; k <= NB; k += 1) for (let i = -1; i <= NB; i += 1) nivRejilla[(k + 1) * (NB + 2) + i + 1] = nivelBaldosa(t, c.cx * NB + i, c.cy * NB + k);
  e.areas = areas;
  e.escaleras = escaleras;
  e.nivRejilla = nivRejilla;
  e.hayNiveles = nivRejilla.some((v) => v > 0);
}

/** Fase C: color base y material de las filas [desde, hasta) (d: color; mat: material; moja: lluvia; som: sombra). */
function pintarFilas(e, desde, hasta) {
  const { pal, n, ox, oy, gx0, gy0, B, umbralBarro, umbralLluvia, frente, verdes, franjas, agua, urbano, cuadros, m, ms, fHum, fNub, fCam, fMan, fVerde, fPav, cerca, fSup, fArea, mat, moja, som, d, areas, hayNiveles } = e;
  const niv = nivDe(e);
  const P = (o, col) => { d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; };
  for (let py = desde; py < hasta; py += 1) {
    const y = oy + py * PX + 1;
    const j0 = py >> 2;
    const fy = FR[py & 3];
    const bk = Math.floor((py * PX) / B);
    const enBY = (py * PX) % B;
    const gy = gy0 + py;
    for (let px = 0; px < n; px += 1) {
      const x = ox + px * PX + 1;
      const i0 = px >> 2;
      const fx = FR[px & 3];
      const k = j0 * m + i0;
      const fxy = fx * fy;
      const gx = gx0 + px;
      const o = (py * n + px) * 4;
      const io = py * n + px;
      const h1 = hash(gx, gy);
      const dit = BAYER[((py & 3) << 2) | (px & 3)];
      let material = CESPED;
      // 1) Césped: cinco verdes tramados según el ruido de tono
      const man = fMan[k];
      const ver = fVerde[k] + (fVerde[k + 1] - fVerde[k]) * fx + (fVerde[k + m] - fVerde[k]) * fy + (fVerde[k] - fVerde[k + 1] - fVerde[k + m] + fVerde[k + m + 1]) * fxy;
      let iv = Math.floor(ver + (dit - 0.5) * 0.95 + (h1 - 0.5) * 0.5);
      iv = iv < 0 ? 0 : iv > 4 ? 4 : iv;
      const vv = verdes[iv];
      d[o] = vv[0]; d[o + 1] = vv[1]; d[o + 2] = vv[2];
      const bi = Math.floor((px * PX) / B);
      const nivel = hayNiveles ? niv(bi, bk) : 0;
      const fc = cerca[k];
      // 2) Superficies
      const ks = (py >> 1) * ms + (px >> 1);
      const sup = fSup[ks];
      if (sup === S_CAMPO) {
        material = CAMPO;
        const a = areas[fArea[ks]];
        let fr = Math.floor((y - (a.y - a.h / 2)) / 40) & 1;
        if (cuadros && !a.entreno) fr ^= Math.floor((x - (a.x - a.w / 2)) / 40) & 1;
        const base = franjas[fr];
        const grano = h1 < 0.07 ? 0.94 : h1 > 0.95 ? 1.05 : 1;
        d[o] = base[0] * grano; d[o + 1] = base[1] * grano; d[o + 2] = base[2] * grano;
        // Desgaste: delante de las porterías y en el círculo central (más en los de entrenamiento)
        const dxg = (x - a.x) / (a.w * 0.16);
        const dyg = Math.min(Math.abs(y - (a.y - a.h / 2 + 34)), Math.abs(y - (a.y + a.h / 2 - 34))) / 46;
        let gasto = 1 - Math.sqrt(dxg * dxg + dyg * dyg);
        if (a.entreno) gasto = Math.max(gasto * 1.3, (man - 0.6) * 2.4); // zonas peladas por el uso
        else gasto = Math.max(gasto, 0.55 - Math.hypot(x - a.x, (y - a.y) * 1.3) / 70);
        if (gasto > dit * 0.9 + h1 * 0.2) {
          const kk = Math.min(0.7, 0.3 + gasto * 0.4);
          d[o] += (DESGASTE[0] - d[o]) * kk; d[o + 1] += (DESGASTE[1] - d[o + 1]) * kk; d[o + 2] += (DESGASTE[2] - d[o + 2]) * kk;
        }
      } else if (sup === S_PISTA) {
        material = PISTA;
        P(o, PISTA_C[h1 < 0.12 ? 1 : 0]);
      } else if (sup === S_PISTA_BORDE) {
        material = PISTA_BORDE;
        P(o, PISTA_FUERA[h1 < 0.15 ? 1 : 0]);
      } else if (sup === S_PLAZA) {
        material = PLAZA;
        // Adoquines al tresbolillo (4×3 píxeles) con luz arriba a la izquierda; anillos de color alrededor del centro
        const a = areas[fArea[ks]];
        const fila = Math.floor(gy / 3);
        const desf = (fila & 1) * 2;
        const col = Math.floor((gx + desf) / 4);
        const ex = (gx + desf) & 3;
        const ey = gy - fila * 3;
        const anillo = Math.floor(Math.hypot(x - a.x, (y - a.y) * 1.15) / 26);
        const paleta = anillo > 0 && anillo % 3 === 0 ? PIEDRAS_ANILLO : PIEDRAS;
        if (ex === 3 || ey === 2) P(o, JUNTA_PIEDRA);
        else {
          const base = paleta[Math.floor(hash(col, fila) * paleta.length)];
          const kk = ex === 0 && ey === 0 ? 1.07 : ex === 2 && ey === 1 ? 0.9 : 1;
          d[o] = base[0] * kk; d[o + 1] = base[1] * kk; d[o + 2] = base[2] * kk;
        }
      } else if (sup === S_CALLE) {
        material = CALLE;
        const a = areas[fArea[ks]];
        const ex = gx % 12;
        const ey = gy % 8;
        if (Math.abs(y - a.y) < 3) P(o, JUNTA_CALLE); // rigola en medio
        else if (ex === 0 || ey === 0) P(o, JUNTA_CALLE);
        else P(o, CALLES[Math.floor(hash(Math.floor(gx / 12), Math.floor(gy / 8)) * 3)]);
      } else if (sup === S_ACERA) {
        material = ACERA;
        if (gx % 5 === 0 || gy % 5 === 0) P(o, JUNTA_ACERA);
        else P(o, ACERAS[h1 < 0.5 ? 0 : 1]);
      } else if (sup === S_HORMIGON) {
        material = HORMIGON;
        const ex = gx & 15;
        const ey = gy & 15;
        if (ex === 0 || ey === 0) P(o, JUNTA_HORMIGON);
        else {
          const base = HORMIGONES[Math.floor(hash(gx >> 4, gy >> 4) * 3)];
          const mancha = hash(gx >> 2, gy >> 2) < 0.06 ? 0.94 : 1;
          const kk = (h1 < 0.08 ? 0.96 : 1) * mancha;
          d[o] = base[0] * kk; d[o + 1] = base[1] * kk; d[o + 2] = base[2] * kk;
        }
      } else if (sup === S_TIERRA) {
        // Tierra delante de las porterías de entrenamiento, que se funde con la hierba por el borde
        const a = areas[fArea[ks]];
        const dd = Math.hypot(x - a.x, y - a.y) / a.r;
        if (dd < 0.7 || dit > (dd - 0.7) / 0.3) {
          material = TIERRA;
          P(o, ARENA[1 + Math.floor(h1 * 3)]);
        }
      }
      const sobreSuperficie = material !== CESPED && material !== TIERRA;
      // 3) Caminos de tierra (en la ciudad, de piedra) con borde oscuro y piedrecitas
      if (!sobreSuperficie && fc & 1) {
        const e = fCam[k] + (fCam[k + 1] - fCam[k]) * fx + (fCam[k + m] - fCam[k]) * fy + (fCam[k] - fCam[k + 1] - fCam[k + m] + fCam[k + m + 1]) * fxy;
        if (e < 1) {
          material = CAMINO;
          if (urbano) P(o, PIEDRAS[Math.floor(hash(gx >> 2, gy >> 1) * 4)]);
          else if (e > 0.84) P(o, ARENA_BORDE);
          else if (h1 < 0.025) P(o, PIEDRAS[1]);
          else if (h1 > 0.975) P(o, TIERRAS[2]);
          else P(o, ARENA[e < 0.4 && dit > 0.35 ? 0 : 1 + Math.floor(h1 * 2.99)]);
        } else if (e < 1.22 && !urbano) {
          // Hierba algo más alta y oscura al borde del camino
          if (dit < (1.22 - e) / 0.22) P(o, verdes[iv > 1 ? iv - 1 : iv]);
        }
      }
      // 4) Barro (nunca sobre el asfalto): borde oscuro, terrones y charcos de agua sucia en lo más hondo
      const hum = fc & 2 ? fHum[k] + (fHum[k + 1] - fHum[k]) * fx + (fHum[k + m] - fHum[k]) * fy + (fHum[k] - fHum[k + 1] - fHum[k + m] + fHum[k + m + 1]) * fxy : 0;
      if (hum > umbralBarro - 0.012 && !fPav[k] && material !== CAMPO) {
        const dh = hum - umbralBarro;
        if (dh > 0) {
          material = BARRO;
          const juntoPav = fPav[k + 1] | fPav[k + m] | (i0 > 0 ? fPav[k - 1] : 0) | (j0 > 0 ? fPav[k - m] : 0);
          if (dh < 0.005 || (juntoPav && dit < 0.55)) P(o, BARRO_BORDE);
          else if (dh > 0.04 + (0.55 - man) * 0.06) { material = CHARCO_BARRO; P(o, CHARCO_BARRO_C[dit > 0.6 ? 1 : 0]); } else if (h1 > 0.972) P(o, BARRO_CLARO);
          else if (dh < 0.011 && dit > 0.5) P(o, BARROS[1]);
          else P(o, BARROS[Math.floor(h1 * 2.99)]);
        } else if (material === CESPED && dit < (dh + 0.012) / 0.012 * 0.45) {
          // Hierba pisoteada alrededor del barro
          P(o, h1 < 0.2 ? TIERRAS[1] : verdes[0]);
        }
      }
      // 5) Lluvia: suelo mojado y charcos que reflejan el cielo
      const nub = fc & 4 ? fNub[k] + (fNub[k + 1] - fNub[k]) * fx + (fNub[k + m] - fNub[k]) * fy + (fNub[k] - fNub[k + 1] - fNub[k + m] + fNub[k + m + 1]) * fxy : 0;
      if (nub > umbralLluvia - 0.004 && (nub > umbralLluvia || dit < (nub - umbralLluvia + 0.004) / 0.004)) moja[io] = 1;
      if (nub > umbralLluvia + 0.012 && man > 0.64 && Math.sin(x * 0.043 + man * 9) * Math.sin(y * 0.051 - man * 7) > 0.42 - Math.min(0.12, nub - umbralLluvia) && (material === CESPED || material === CAMINO || material === TIERRA)) {
        material = CHARCO;
        P(o, agua[0]);
      }
      // 6) Mesetas: frente sur de tierra con capas y piedras, labio de hierba arriba; bordes laterales de roca
      if (!hayNiveles) { mat[io] = material; continue; }
      if (nivel > 0 && niv(bi, bk + 1) < nivel && enBY >= B - frente) {
        material = TALUD;
        const prof = enBY - (B - frente); // 0..frente (unidades)
        const labio = 4 + Math.floor(hash(gx >> 1, 7) * 4) * 2; // la hierba cuelga un poco, irregular
        if (prof < labio) P(o, prof < 2 ? verdes[4] : verdes[2]);
        else if (prof < labio + 2) P(o, TALUDES[3]);
        else {
          const capa = Math.floor((prof + hash(gx >> 2, 3) * 6) / 9) % 3;
          P(o, TALUDES[capa]);
          if (h1 < 0.07) P(o, PIEDRA_TALUD[0]);
          else if (h1 < 0.1) P(o, PIEDRA_TALUD[1]);
          if (prof > frente - 6) { d[o] *= 0.8; d[o + 1] *= 0.8; d[o + 2] *= 0.8; }
        }
      } else if (enBY < 20 && niv(bi, bk - 1) > nivel) {
        som[io] = Math.max(som[io], Math.round(150 * (1 - enBY / 20) + (dit < 1 - enBY / 20 ? 40 : 0))); // pie del talud
      }
      if (nivel > 0 && material !== TALUD) {
        const enBX = (px * PX) % B;
        if (enBY < 2 && niv(bi, bk - 1) < nivel) P(o, verdes[4]); // canto iluminado arriba
        // Bordes laterales: roca con piedras (el de la izquierda, al sol; el de la derecha, a la sombra)
        if (enBX < 8 && niv(bi - 1, bk) < nivel) { material = TALUD; P(o, enBX < 2 ? TALUDES[3] : h1 < 0.12 ? PIEDRA_TALUD[0] : TALUDES[(gy >> 1) % 3 === 0 ? 1 : 0]); } else if (enBX >= B - 8 && niv(bi + 1, bk) < nivel) { material = TALUD; P(o, enBX >= B - 2 ? TALUDES[3] : h1 < 0.1 ? PIEDRA_TALUD[1] : TALUDES[(gy >> 1) % 3 === 0 ? 3 : 2]); }
      }
      // Sombra que echa hacia la derecha una meseta más alta
      const izq = niv(bi - 1, bk);
      if (izq > nivel && (px * PX) % B < (izq - nivel) * frente * pal.sol[0] + 6) som[io] = Math.max(som[io], 200);
      mat[io] = material;
    }
  }

}

/** Fase D1: escaleras, rampas y líneas de los campos. */
function escalerasYLineas(e) {
  const { n, ox, oy, mat, areas, escaleras } = e;
  const enCelda = (x, y) => x >= 0 && y >= 0 && x < n && y < n;
  const pon = ponDe(e);
  // Escaleras de piedra y rampas de tierra
  for (const esc of escaleras) {
    const x0 = Math.round((esc.x - esc.w / 2 - ox) / PX);
    const y0 = Math.round((esc.y - esc.h / 2 - oy) / PX);
    const w = Math.round(esc.w / PX);
    const h = Math.round(esc.h / PX);
    for (let yy = 0; yy < h; yy += 1) {
      for (let xx = 0; xx < w; xx += 1) {
        const X = x0 + xx;
        const Y = y0 + yy;
        if (!enCelda(X, Y)) continue;
        let col;
        if (esc.tipo === 'escalera') {
          if (xx < 2 || xx >= w - 2) col = ESCALONES[3]; // muretes
          else if (xx < 3 || xx >= w - 3) col = ESCALONES[2];
          else col = ESCALONES[[0, 1, 1, 2][yy & 3]]; // huella clara, tabica más oscura
        } else col = ARENA[(yy >> 1) & 1 ? 1 : 2];
        pon(X, Y, col);
        mat[Y * n + X] = ESCALON;
      }
    }
  }
  // Líneas de los campos y de la pista
  for (const a of areas) {
    if (a.tipo !== 'campo' && a.tipo !== 'pista') continue;
    lineasDeCampo(a, ox, oy, pon, a.tipo === 'pista');
  }
}

/** Fase D2: bordillos, briznas, flores, piedrecitas, hojas, setas, confeti y grietas. */
function detallesSobreHierba(e) {
  const { c, amb, pal, n, gx0, gy0, verdes, franjas, lote, mat } = e;
  const enCelda = (x, y) => x >= 0 && y >= 0 && x < n && y < n;
  const pon = ponDe(e);
  // Bordillos: donde un suelo duro toca hierba o tierra, canto claro arriba y sombra abajo
  for (let py = 1; py < n - 1; py += 1) {
    for (let px = 1; px < n - 1; px += 1) {
      const io = py * n + px;
      if (!DURO[mat[io]]) continue;
      if (!SIN_BORDILLO[mat[io - n]] || !SIN_BORDILLO[mat[io - 1]] || !SIN_BORDILLO[mat[io + 1]]) pon(px, py, BORDILLO_LUZ);
      else if (!SIN_BORDILLO[mat[io + n]]) pon(px, py, BORDILLO_SOMBRA);
    }
  }
  // Briznas, flores, piedrecitas, hojas y setas sobre la hierba (en una rejilla de 6×6 píxeles, con azar)
  const densFlores = { prado: 0.05, parque: 0.035, entrenamiento: 0.01 }[lote] ?? 0.004;
  const flores = pal.flores.map(C);
  const hojas = pal.hojas.map(C);
  const noche = pal.noche > 0;
  for (let by = 0; by < n; by += 6) {
    for (let bx = 0; bx < n; bx += 6) {
      const gbx = (gx0 + bx) / 6;
      const gby = (gy0 + by) / 6;
      const r = hash(gbx * 7 + 3, gby * 5 + 1);
      const x = bx + Math.floor(hash(gbx, gby + 99) * 5);
      const y = by + Math.floor(hash(gbx + 99, gby) * 5);
      if (!enCelda(x, y)) continue;
      const aqui = mat[y * n + x];
      if (aqui === CAMPO) {
        if (r < 0.05) { pon(x, y, verdes[0], CAMPO); pon(x, y - 1, franjas[0], CAMPO); }
        continue;
      }
      if (aqui !== CESPED) {
        if (aqui === CAMINO && r < 0.06) { pon(x, y, PIEDRAS[0], CAMINO); pon(x + 1, y, PIEDRAS[2], CAMINO); pon(x, y + 1, TIERRAS[2], CAMINO); }
        continue;
      }
      if (r < 0.2) { // mata de hierba: tres briznas con la punta clara
        for (const [dx, alto] of [[-1, 2], [0, 3], [1, 2]]) {
          pon(x + dx, y - alto, verdes[4], CESPED);
          for (let s = 1; s < alto; s += 1) pon(x + dx, y - alto + s, verdes[3], CESPED);
        }
        pon(x - 1, y, verdes[0], CESPED); pon(x, y, verdes[0], CESPED); pon(x + 1, y, verdes[0], CESPED);
      } else if (r < 0.2 + densFlores) { // ramillete de flores
        const col = flores[Math.floor(hash(gbx, gby * 3) * flores.length)];
        const centro = noche ? flores[1] : C('#ffd23f');
        const cuantas = 1 + Math.floor(hash(gby, gbx) * 3);
        for (let f = 0; f < cuantas; f += 1) {
          const fx2 = x + Math.floor((hash(gbx + f, gby) - 0.5) * 6);
          const fy2 = y + Math.floor((hash(gbx, gby + f) - 0.5) * 5);
          pon(fx2, fy2 + 2, verdes[0], CESPED);
          pon(fx2, fy2 + 1, verdes[1], CESPED);
          pon(fx2 - 1, fy2, col, CESPED); pon(fx2 + 1, fy2, col, CESPED); pon(fx2, fy2 - 1, col, CESPED);
          pon(fx2, fy2, centro, CESPED);
        }
      } else if (r < 0.215 + densFlores) { // piedrecita
        pon(x, y, PIEDRAS[0], CESPED); pon(x + 1, y, PIEDRAS[2], CESPED);
        pon(x, y + 1, PIEDRAS[3], CESPED); pon(x + 1, y + 1, JUNTA_PIEDRA, CESPED);
        pon(x + 2, y + 1, verdes[0], CESPED);
      } else if (r < 0.225 + densFlores + (amb.clave === 'liga' ? 0.02 : 0)) { // hoja caída
        const col = hojas[Math.floor(hash(gby, gbx * 3) * hojas.length)];
        pon(x, y, col, CESPED); pon(x + 1, y, col, CESPED); pon(x + 1, y - 1, col, CESPED);
      } else if (r < 0.228 + densFlores && (lote === 'prado' || lote === 'parque')) { // seta
        pon(x - 1, y - 1, C('#c8283a'), CESPED); pon(x, y - 1, C('#e04050'), CESPED); pon(x + 1, y - 1, C('#c8283a'), CESPED);
        pon(x, y - 2, C('#c8283a'), CESPED); pon(x, y - 1, C('#ffffff'), CESPED);
        pon(x, y, C('#efe6d0'), CESPED); pon(x + 1, y, verdes[0], CESPED);
      } else if (r > 0.985) { // trébol: mancha clara
        for (let yy = -1; yy <= 1; yy += 1) for (let xx = -2; xx <= 2; xx += 1) if (Math.abs(xx) + Math.abs(yy) < 3 && hash(x + xx, y + yy) > 0.3) pon(x + xx, y + yy, verdes[3], CESPED);
      }
    }
  }
  // Confeti caído en las finales con fiesta
  if (pal.confeti) {
    const conf = pal.confeti.map(C);
    for (let i = 0; i < 260; i += 1) {
      const x = Math.floor(hash(i, c.cx * 13 + c.cy * 7) * n);
      const y = Math.floor(hash(c.cy * 11 + i, c.cx) * n);
      const io = y * n + x;
      if (mat[io] === CHARCO || mat[io] === TALUD) continue;
      pon(x, y, conf[i % conf.length]);
      if (i & 1) pon(x + 1, y, conf[i % conf.length]);
    }
  }
  // Grietas en el hormigón
  for (let i = 0; i < 6; i += 1) {
    let x = Math.floor(hash(i, c.cx * 5 + c.cy) * n);
    let y = Math.floor(hash(c.cy * 3 + i, c.cx + 1) * n);
    if (mat[y * n + x] !== HORMIGON) continue;
    for (let s = 0; s < 10; s += 1) {
      pon(x, y, JUNTA_HORMIGON, HORMIGON);
      x += hash(x, y) < 0.5 ? 1 : 0;
      y += 1;
    }
  }
}

/** Fase D3: matorrales y piedras (también los de las vecinas que asoman) y orillas y reflejos de los charcos. */
function matasYCharcos(e) {
  const { t, c, pal, n, ox, oy, gx0, gy0, agua, mat, d } = e;
  const pon = ponDe(e);
  // Matorrales y piedras sueltas (de esta celda y de las vecinas, por si asoman) dibujados en el suelo
  const vecinas = [];
  e.vecinas = vecinas;
  for (let i = -1; i <= 1; i += 1) for (let k = -1; k <= 1; k += 1) vecinas.push(i === 0 && k === 0 ? c : celdaTerreno(t, c.cx + i, c.cy + k));
  for (const v of vecinas) {
    for (const a of v.decor) {
      if (a.tipo === 'mata') pintarMata(a, ox, oy, n, d, mat, pal, MATA);
      else if (a.tipo === 'piedras') pintarPiedras(a, ox, oy, pon);
    }
  }
  // Charcos: orilla oscura arriba (la sombra del borde) y brillo abajo; reflejos sueltos
  for (let py = 1; py < n - 1; py += 1) {
    for (let px = 0; px < n; px += 1) {
      const io = py * n + px;
      const mt = mat[io];
      if (mt !== CHARCO && mt !== CHARCO_BARRO) continue;
      const arriba = mat[io - n];
      const abajo = mat[io + n];
      if (arriba !== mt) pon(px, py, mt === CHARCO ? agua[2] : BARRO_BORDE);
      else if (abajo !== mt) pon(px, py, mt === CHARCO ? agua[1] : BARRO_CLARO);
      else if (hash(gx0 + px, (gy0 + py) * 3) < 0.012 && mat[io + 1] === mt && mat[io + 2] === mt) {
        const brillo = mt === CHARCO ? agua[1] : CHARCO_BARRO_C[1];
        pon(px, py, brillo); pon(px + 1, py, brillo);
      }
    }
  }
}

/** Fase E: sombras de todo lo que está de pie (de esta celda y de las de arriba y la izquierda). */
function sombrasCelda(e) {
  const { pal, n, ox, oy, som } = e;
  // E) Sombras de todo lo que está de pie (de esta celda y de las de arriba y la izquierda)
  const { vecinas } = e;
  for (const v of [vecinas[0], vecinas[1], vecinas[3], vecinas[4]]) {
    for (const o of v.obstaculos) sombrasDe(o, pal, (x0, y0, x1, y1, dentro, alfa) => sombrear(x0, y0, x1, y1, dentro, alfa, ox, oy, n, som));
    for (const a of v.decor) sombrasDe(a, pal, (x0, y0, x1, y1, dentro, alfa) => sombrear(x0, y0, x1, y1, dentro, alfa, ox, oy, n, som));
  }
}

/** Fase F: luz de las filas [desde, hasta): mesetas más claras, suelo mojado, sombras del color del ambiente y tinte. */
function luzFilas(e, desde, hasta) {
  const { pal, n, B, mat, moja, som, d, hayNiveles } = e;
  const niv = nivDe(e);
  // F) Luz: mesetas más claras arriba, suelo mojado, sombras del color del ambiente y tinte de la escena
  const [sr, sg, sb] = pal.sombra;
  const [lr, lg, lb] = pal.gradoLuz;
  for (let py = desde; py < hasta; py += 1) {
    const bk = Math.floor((py * PX) / B);
    for (let px = 0; px < n; px += 1) {
      const io = py * n + px;
      const o = io * 4;
      let r = d[o];
      let g = d[o + 1];
      let b = d[o + 2];
      const nivel = hayNiveles ? niv(Math.floor((px * PX) / B), bk) : 0;
      if (nivel > 0 && mat[io] !== TALUD) { const kk = (mat[io] >= BARRO && mat[io] <= CHARCO ? 0.03 : 0.07) * nivel; r += (255 - r) * kk; g += (255 - g) * kk; b += (225 - b) * kk; }
      if (moja[io] && mat[io] !== CHARCO) { r = r * 0.8 + 6; g = g * 0.84 + 12; b = b * 0.9 + 26; }
      const s = som[io];
      if (s) {
        const kk = s / 255;
        r *= 1 - (1 - sr) * kk; g *= 1 - (1 - sg) * kk; b *= 1 - (1 - sb) * kk;
      }
      d[o] = r * lr; d[o + 1] = g * lg; d[o + 2] = b * lb; d[o + 3] = 255;
    }
  }
}

/**
 * Pinta la textura de una celda. Es un generador que cede el control entre fases (y cada pocas filas), para
 * repartir el trabajo entre fotogramas; cada fase es una función normal, que el navegador optimiza bien.
 */
function* pintarCelda(t, c, amb) {
  const e = prepararCelda(t, c, amb);
  camposGruesos(e);
  yield;
  camposFinos(e);
  yield;
  superficies(e);
  yield;
  for (let py = 0; py < e.n; py += 32) {
    pintarFilas(e, py, Math.min(e.n, py + 32));
    yield;
  }
  escalerasYLineas(e);
  yield;
  detallesSobreHierba(e);
  yield;
  matasYCharcos(e);
  yield;
  sombrasCelda(e);
  yield;
  for (let py = 0; py < e.n; py += 64) {
    luzFilas(e, py, Math.min(e.n, py + 64));
    yield;
  }
  e.cx2.putImageData(e.imagen, 0, 0);
  devolverBuferes(e.buf);
  return e.lienzo;
}

/** Marca como sombra (con `alfa`) los píxeles de la celda dentro de la caja [x0,x1]×[y0,y1] que cumplen `dentro(x, y)`. */
function sombrear(x0, y0, x1, y1, dentro, alfa, ox, oy, n, som) {
  const a = Math.round(alfa * 255);
  const px0 = Math.max(0, Math.floor((x0 - ox) / PX));
  const py0 = Math.max(0, Math.floor((y0 - oy) / PX));
  const px1 = Math.min(n - 1, Math.ceil((x1 - ox) / PX));
  const py1 = Math.min(n - 1, Math.ceil((y1 - oy) / PX));
  for (let py = py0; py <= py1; py += 1) {
    const y = oy + py * PX + 1;
    for (let px = px0; px <= px1; px += 1) {
      const io = py * n + px;
      if (som[io] >= a) continue;
      if (dentro(ox + px * PX + 1, y)) som[io] = a;
    }
  }
}

/** Líneas de un campo (o de la pista de fútbol sala) pintadas en el búfer, de 2 píxeles de grueso. */
function lineasDeCampo(a, ox, oy, pon, pista) {
  const x0 = Math.round((a.x - a.w / 2 - ox) / PX) + (pista ? 8 : 2);
  const y0 = Math.round((a.y - a.h / 2 - oy) / PX) + (pista ? 8 : 2);
  const w = Math.round(a.w / PX) - (pista ? 16 : 4);
  const h = Math.round(a.h / PX) - (pista ? 16 : 4);
  const rect = (x, y, ww, hh) => { for (let yy = y; yy < y + hh; yy += 1) for (let xx = x; xx < x + ww; xx += 1) pon(xx, yy, BLANCO); };
  const arco = (cx, cy, r, desde, hasta, grueso = 1.6) => {
    for (let yy = Math.floor(cy - r - 2); yy <= cy + r + 2; yy += 1) {
      for (let xx = Math.floor(cx - r - 2); xx <= cx + r + 2; xx += 1) {
        const dd = Math.hypot(xx + 0.5 - cx, yy + 0.5 - cy);
        if (Math.abs(dd - r) > grueso / 2) continue;
        const ang = Math.atan2(yy + 0.5 - cy, xx + 0.5 - cx);
        if (ang >= desde && ang <= hasta) pon(xx, yy, BLANCO);
      }
    }
  };
  // Banda, fondo y medio campo
  rect(x0, y0, w, 2); rect(x0, y0 + h - 2, w, 2); rect(x0, y0, 2, h); rect(x0 + w - 2, y0, 2, h);
  const cym = y0 + Math.floor(h / 2);
  const cxm = x0 + Math.floor(w / 2);
  rect(x0, cym - 1, w, 2);
  const rc = pista ? 14 : a.entreno ? 18 : 24;
  arco(cxm, cym, rc, -Math.PI, Math.PI);
  rect(cxm - 1, cym - 1, 2, 2);
  // Áreas grande y pequeña, punto de penalti, la media luna y los córners
  const aw = Math.round(w * (pista ? 0.5 : 0.56));
  const ah = Math.round(h * (pista ? 0.14 : 0.16));
  const pw = Math.round(w * 0.27);
  const ph = Math.round(h * 0.055);
  for (const arriba of [true, false]) {
    const yA = arriba ? y0 : y0 + h - ah;
    rect(cxm - aw / 2, arriba ? yA + ah - 2 : yA, aw, 2);
    rect(cxm - aw / 2, yA, 2, ah); rect(cxm + aw / 2 - 2, yA, 2, ah);
    if (!pista) {
      const yP = arriba ? y0 : y0 + h - ph;
      rect(cxm - pw / 2, arriba ? yP + ph - 2 : yP, pw, 2);
      rect(cxm - pw / 2, yP, 2, ph); rect(cxm + pw / 2 - 2, yP, 2, ph);
      const yPen = arriba ? y0 + Math.round(ah * 0.7) : y0 + h - Math.round(ah * 0.7);
      rect(cxm - 1, yPen - 1, 2, 2);
      const rm = Math.round(ah * 0.45);
      if (arriba) arco(cxm, yPen, rm, 0.25 * Math.PI, 0.75 * Math.PI);
      else arco(cxm, yPen, rm, -0.75 * Math.PI, -0.25 * Math.PI);
      for (const [ex, ey, d0, d1] of [[x0, y0, 0, Math.PI / 2], [x0 + w, y0, Math.PI / 2, Math.PI], [x0, y0 + h, -Math.PI / 2, 0], [x0 + w, y0 + h, -Math.PI, -Math.PI / 2]]) arco(ex, ey, 4, d0, d1);
    }
  }
}

/** Matorral dibujado en el suelo: tres o cuatro bolas de hojas con luz arriba a la izquierda y contorno verde oscuro. */
function pintarMata(a, ox, oy, n, d, mat, pal, MATA_) {
  const rr = Math.max(4, (a.r || 14) / PX); // radio en píxeles
  const W = Math.ceil(rr * 2.3) + 2;
  const H = Math.ceil(rr * 1.7) + 2;
  const bx = Math.round((a.x - ox) / PX) - Math.floor(W / 2); // esquina en la textura
  const by = Math.round((a.y + 4 - oy) / PX) - H;
  if (bx > n || by > n || bx + W < 0 || by + H < 0) return;
  const s = a.semilla;
  const bolas = [
    [W / 2, H * 0.52, rr * 0.72], [W / 2 - rr * 0.55, H * 0.66, rr * 0.55], [W / 2 + rr * 0.55, H * 0.64, rr * 0.58], [W / 2 + (s % 2 ? 0.25 : -0.25) * rr, H * 0.32, rr * 0.5],
  ];
  const verdes = pal.arbol.map(C);
  const borde = [verdes[0][0] * 0.55, verdes[0][1] * 0.55, verdes[0][2] * 0.6];
  if (mataDentro.length < W * H) { mataDentro = new Uint8Array(W * H * 2); mataTono = new Uint8Array(W * H * 2); }
  const dentro = mataDentro; // 1 si hay hoja
  const col = mataTono; // qué verde (0..4)
  dentro.fill(0, 0, W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let mejor = -1;
      for (const [cx, cy, r] of bolas) {
        const dx = (x + 0.5 - cx) / r;
        const dy = (y + 0.5 - cy) / r;
        const q = dx * dx + dy * dy - 0.12 * hash(x + s, y);
        if (q < 1) {
          const luz = -dx * 0.55 - dy * 0.85 + (y / H < 0.85 ? 0 : -0.6);
          mejor = Math.max(mejor, luz + 1);
        }
      }
      if (mejor < 0) continue;
      dentro[y * W + x] = 1;
      const v = mejor + (BAYER[((y & 3) << 2) | (x & 3)] - 0.5) * 0.5;
      col[y * W + x] = v > 1.75 ? 4 : v > 1.25 ? 3 : v > 0.75 ? 2 : v > 0.35 ? 1 : 0;
    }
  }
  const flor = s % 3 === 0 ? C(pal.flores[s % pal.flores.length]) : null;
  for (let y = -1; y <= H; y += 1) {
    for (let x = -1; x <= W; x += 1) {
      const X = bx + x;
      const Y = by + y;
      if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
      const dentroAqui = x >= 0 && y >= 0 && x < W && y < H && dentro[y * W + x];
      let c2 = null;
      if (dentroAqui) {
        c2 = verdes[col[y * W + x]];
        if (flor && hash(x * 7 + s, y * 3) < 0.07) c2 = flor;
      } else {
        const toca = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && dentro[yy * W + xx];
        if (toca(x - 1, y) || toca(x + 1, y) || toca(x, y - 1) || toca(x, y + 1)) c2 = borde;
      }
      if (!c2) continue;
      const io = Y * n + X;
      const o = io * 4;
      d[o] = c2[0]; d[o + 1] = c2[1]; d[o + 2] = c2[2];
      mat[io] = MATA_;
    }
  }
}

/** Piedras sueltas al pie de los taludes. */
function pintarPiedras(a, ox, oy, pon) {
  const x = Math.round((a.x - ox) / PX);
  const y = Math.round((a.y - oy) / PX);
  const roca = (x0, y0, w, h) => {
    for (let yy = 0; yy < h; yy += 1) {
      for (let xx = 0; xx < w; xx += 1) {
        if ((xx === 0 || xx === w - 1) && (yy === 0 || yy === h - 1)) continue;
        pon(x0 + xx, y0 + yy, yy === 0 || xx === 0 ? PIEDRAS[0] : yy === h - 1 || xx === w - 1 ? JUNTA_PIEDRA : PIEDRAS[2]);
      }
    }
  };
  roca(x - 5, y - 3, 5, 4);
  roca(x + 2, y - 1, 4, 3);
  roca(x - 1, y + 2, 3, 2);
}

// ---------------------------------------------------------------------------------------------
// Caché de texturas y reparto del trabajo entre fotogramas
// ---------------------------------------------------------------------------------------------

const MAX_TEXTURAS = 64;
const texturas = new Map(); // `${semilla}:${cx},${cy}:${ambiente}` → lienzo
const ultimaTextura = new Map(); // la última textura de cada celda (sirve mientras se pinta la nueva)
const trabajos = new Map(); // texturas a medio pintar → generador
const PRESUPUESTO_VISIBLE = 6; // ms por fotograma para las celdas que se ven
const PRESUPUESTO_ADELANTO = 3; // ms por fotograma para adelantar las de alrededor
const ahora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function guardar(clave, celdaClave, lienzo) {
  if (texturas.size >= MAX_TEXTURAS) texturas.delete(texturas.keys().next().value);
  texturas.set(clave, lienzo);
  ultimaTextura.delete(celdaClave);
  if (ultimaTextura.size >= MAX_TEXTURAS) ultimaTextura.delete(ultimaTextura.keys().next().value);
  ultimaTextura.set(celdaClave, lienzo);
}

/** Sigue pintando la textura de la celda hasta el instante `limite` (Infinity: hasta acabar). Devuelve el lienzo si está. */
function avanzar(t, c, amb, limite) {
  const celdaClave = `${t.semilla}:${c.cx},${c.cy}`;
  const clave = `${celdaClave}:${amb.clave}`;
  let gen = trabajos.get(clave);
  if (!gen) {
    if (trabajos.size >= 6) trabajos.delete(trabajos.keys().next().value); // las que ya no hacen falta se olvidan
    gen = pintarCelda(t, c, amb);
    trabajos.set(clave, gen);
  }
  for (;;) {
    const r = gen.next();
    if (r.done) {
      trabajos.delete(clave);
      guardar(clave, celdaClave, r.value);
      return r.value;
    }
    if (ahora() >= limite) return null;
  }
}

/** Dibuja el suelo de las celdas visibles (en coordenadas del mundo) y adelanta el de alrededor. */
export function dibujarSuelo(ctx, mundo, celdas, amb, alrededor = []) {
  const L = TERRENO.celda;
  const t = mundo.terreno;
  const forzar = !mundo.yaPintado;
  const inicio = ahora();
  ctx.imageSmoothingEnabled = false;
  let pendientes = false;
  for (const c of celdas) {
    const celdaClave = `${t.semilla}:${c.cx},${c.cy}`;
    let tex = texturas.get(`${celdaClave}:${amb.clave}`);
    if (!tex) {
      if (forzar || ahora() - inicio < PRESUPUESTO_VISIBLE) tex = avanzar(t, c, amb, forzar ? Infinity : inicio + PRESUPUESTO_VISIBLE);
      if (!tex) { pendientes = true; tex = ultimaTextura.get(celdaClave); }
    }
    if (tex) ctx.drawImage(tex, c.cx * L, c.cy * L, L + 0.5, L + 0.5);
    else {
      ctx.fillStyle = PALETAS[amb.clave].cesped[2];
      ctx.fillRect(c.cx * L, c.cy * L, L + 0.5, L + 0.5);
    }
  }
  // Si sobra tiempo, se adelanta la textura de alguna celda de alrededor
  if (!pendientes) {
    const limite = ahora() + PRESUPUESTO_ADELANTO;
    for (const c of alrededor) {
      if (texturas.has(`${t.semilla}:${c.cx},${c.cy}:${amb.clave}`)) continue;
      avanzar(t, c, amb, limite);
      if (ahora() >= limite) break;
    }
  }
  mundo.yaPintado = true;
}

/** Olvida las texturas (al cambiar de ambiente se repintan con la nueva paleta). */
export function vaciarTexturas() {
  texturas.clear();
  ultimaTextura.clear();
  trabajos.clear();
}

export const numeroTexturas = () => texturas.size;
