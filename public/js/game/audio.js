// Sonido del juego, todo sintetizado con Web Audio (sin ficheros): efectos chiptune, música de fondo por
// pantalla con fanfarria en cada cambio (ver musica.js) y la grada, que murmura y canta cuando te acercas.
import {
  CANCIONES, FANFARRIAS, BAJOS, ARPEGIOS, BATERIAS, CANTICOS, VOCALES,
  CANCION_DE_AMBIENTE, FANFARRIA_DE_AMBIENTE, notasDe, pasos, notasDeAcorde, acordeDe, midiDe, frecuencia, duracion,
} from './musica.js';

const CLAVE_SILENCIO = 'grada.silencio';

function leerSilencio() {
  try { return localStorage.getItem(CLAVE_SILENCIO) === '1'; } catch { return false; }
}

/** Intervalo mínimo entre dos sonidos iguales (ms), para que cien balones no saturen. */
const CADA = {
  chute: 90, latigazo: 120, cantico: 300, golpe: 45, baja: 50, gema: 40, cura: 200, dano: 150, nivel: 400, oleada: 800,
  'jefe-derrotado': 600, sinergia: 600, ultra: 1500, ambiente: 2000, escudo: 120, fin: 1000, logro: 500, aviso: 700,
  jefe: 1500, ulti: 800,
};

export function crearAudio() {
  let ctx = null;
  let silenciado = leerSilencio();
  let volumen = 0.7; // efectos 0..1
  let volumenMusica = 0.5; // música y grada 0..1
  const ultimo = {};
  let nodos = null; // buses y recursos compartidos (se crean con el contexto)

  // Estado de la música
  const musica = {
    cancion: null, // clave de CANCIONES que suena
    deseada: null,
    paso: 0,
    siguiente: 0, // tiempo (s) del siguiente paso por programar
    nivel: 1,
    callaHasta: 0, // mientras suena una fanfarria, el fondo espera
    apagada: false,
  };
  const grada = { cerca: 0, proximoCantico: 0, base: 0 };
  let gemas = { n: 0, t: 0 };

  function asegurarContexto() {
    if (!ctx) {
      const Clase = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!Clase) return null;
      ctx = new Clase();
      nodos = crearNodos(ctx);
      aplicarVolumenes();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function aplicarVolumenes() {
    if (!nodos) return;
    const t = ctx.currentTime;
    nodos.maestro.gain.setTargetAtTime(silenciado ? 0 : 1, t, 0.05);
    nodos.efectos.gain.setTargetAtTime(volumen * 0.9, t, 0.05);
    nodos.musica.gain.setTargetAtTime(volumenMusica * 0.32, t, 0.1);
    nodos.grada.gain.setTargetAtTime(volumenMusica * 0.9, t, 0.1);
  }

  // --- Piezas básicas -----------------------------------------------------------------------

  /** Una nota con envolvente sencilla (ataque corto, cae un poco y se suelta). */
  function nota(destino, { f, t, dur, onda = 'square', vol = 0.1, ataque = 0.004, sostener = 0.7, deslizar = null, vibrato = 0 }) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    if (nodos.ondas[onda]) osc.setPeriodicWave(nodos.ondas[onda]);
    else osc.type = onda;
    osc.frequency.setValueAtTime(f, t);
    if (deslizar) osc.frequency.exponentialRampToValueAtTime(Math.max(20, deslizar), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + ataque);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * sostener), t + Math.max(ataque + 0.01, dur * 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    let lfo = null;
    if (vibrato && dur > 0.25) {
      lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(vibrato, t + Math.min(0.3, dur * 0.6));
      lfo.connect(lg).connect(osc.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    osc.connect(g).connect(destino);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Ráfaga de ruido filtrado (caja, charles, palmas, impactos, la grada). */
  function ruido(destino, { t, dur, vol = 0.1, filtro = 'bandpass', f = 1000, q = 1, hasta = null, ataque = 0.002 }) {
    const src = ctx.createBufferSource();
    src.buffer = nodos.ruido;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = filtro;
    filt.frequency.setValueAtTime(f, t);
    if (hasta) filt.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(destino);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.02);
  }

  const midi = (n) => frecuencia(typeof n === 'number' ? n : midiDe(n));

  /** Arpegio rápido de notas (para niveles, logros, combinaciones…). */
  function arpegio(destino, notas, t, { paso = 0.06, dur = 0.09, onda = 'pulso25', vol = 0.06, ultimaLarga = 0 } = {}) {
    notas.forEach((n, i) => {
      const larga = ultimaLarga && i === notas.length - 1;
      nota(destino, { f: midi(n), t: t + i * paso, dur: larga ? ultimaLarga : dur, onda, vol, vibrato: larga ? 18 : 0 });
    });
  }

  /** Silbato de árbitro: tono agudo con un trino rápido. */
  function silbato(destino, t, dur = 0.35, vol = 0.05) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 2650;
    lfo.frequency.value = 28;
    lg.gain.value = 140;
    lfo.connect(lg).connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(destino);
    osc.start(t); lfo.start(t);
    osc.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
    ruido(destino, { t, dur, vol: vol * 0.25, filtro: 'bandpass', f: 2700, q: 4 });
  }

  // --- Batería ------------------------------------------------------------------------------

  function golpeBateria(destino, letra, t, vol = 1) {
    if (letra.includes('k')) nota(destino, { f: 150, deslizar: 42, t, dur: 0.13, onda: 'sine', vol: 0.5 * vol, sostener: 0.5 });
    if (letra.includes('s')) {
      ruido(destino, { t, dur: 0.12, vol: 0.18 * vol, filtro: 'bandpass', f: 1900, q: 0.8 });
      nota(destino, { f: 190, deslizar: 120, t, dur: 0.06, onda: 'triangle', vol: 0.16 * vol });
    }
    if (letra.includes('h')) ruido(destino, { t, dur: 0.035, vol: 0.06 * vol, filtro: 'highpass', f: 7500, q: 0.7 });
    if (letra.includes('o')) ruido(destino, { t, dur: 0.18, vol: 0.06 * vol, filtro: 'highpass', f: 6500, q: 0.7 });
    if (letra.includes('c')) palmas(destino, t, 0.16 * vol);
    if (letra.includes('t')) nota(destino, { f: 720, deslizar: 650, t, dur: 0.045, onda: 'pulso12', vol: 0.05 * vol });
  }

  function palmas(destino, t, vol = 0.15, gente = 3) {
    for (let i = 0; i < gente; i += 1) {
      ruido(destino, { t: t + i * 0.011 + Math.random() * 0.006, dur: 0.06, vol: vol / gente * 1.6, filtro: 'bandpass', f: 1100 + Math.random() * 500, q: 1.3 });
    }
  }

  // --- Música de fondo ------------------------------------------------------------------------

  function prepararCancion(clave) {
    const c = CANCIONES[clave];
    if (!c.cache) {
      const total = c.acordes.length * 16;
      c.cache = {
        total,
        melodia: new Map(notasDe(c.melodia).map((n) => [n.paso, n])),
        bateria: BATERIAS[c.bateria].map((b) => pasos(b)),
      };
    }
    return c;
  }

  /** Programa un paso (semicorchea) de la canción que suena. */
  function programarPaso(c, i, t) {
    const seg = duracion(1, c.bpm);
    const compas = Math.floor(i / 16) % c.acordes.length;
    const enCompas = i % 16;
    const acorde = c.acordes[compas];
    const nivel = musica.nivel;
    const bus = nodos.fondo;
    // Bajo (siempre)
    const b = BAJOS[c.bajo][enCompas];
    if (b) {
      const a = acordeDe(acorde);
      const base = 12 * 3 + a.raiz; // octava 2
      const n = base + (a.intervalos[b[0]] ?? 0) + 12 * b[1];
      nota(bus, { f: frecuencia(n), t, dur: seg * 1.7, onda: 'triangle', vol: 0.32, sostener: 0.8 });
    }
    // Arpegio (desde el nivel 1)
    if (nivel >= 1) {
      const p = ARPEGIOS[c.arpegio][enCompas];
      if (p === 'acorde') {
        notasDeAcorde(acorde, 4).slice(0, 3).forEach((n) => nota(bus, { f: frecuencia(n), t, dur: seg * 0.9, onda: 'pulso12', vol: 0.05 }));
      } else if (p !== null && p !== undefined) {
        const n = notasDeAcorde(acorde, 4)[p];
        nota(bus, { f: frecuencia(n), t, dur: seg * 0.8, onda: 'pulso12', vol: 0.055 });
      }
    }
    // Melodía (desde el nivel 2); en el 3, doblada una octava por debajo
    if (nivel >= 2) {
      const m = c.cache.melodia.get(i % c.cache.total);
      if (m) {
        const dur = seg * m.largo * 0.92;
        nota(bus, { f: frecuencia(m.midi), t, dur, onda: c.lider, vol: 0.12, vibrato: 14 });
        if (nivel >= 3) nota(bus, { f: frecuencia(m.midi - 12), t, dur, onda: 'pulso50', vol: 0.045 });
      }
    }
    // Batería según el nivel
    const golpe = c.cache.bateria[Math.min(nivel, 3)][enCompas];
    if (golpe && golpe !== '.') golpeBateria(bus, golpe, t, 0.75);
  }

  function actualizarMusica() {
    const ahora = ctx.currentTime;
    if (musica.cancion !== musica.deseada && ahora >= musica.callaHasta) {
      musica.cancion = musica.deseada;
      musica.paso = 0;
      musica.siguiente = Math.max(ahora + 0.05, musica.callaHasta);
    }
    if (!musica.cancion || musica.apagada || ahora < musica.callaHasta) return;
    const c = prepararCancion(musica.cancion);
    if (musica.siguiente < ahora - 0.25) musica.siguiente = ahora + 0.05; // la pestaña estuvo en segundo plano
    const seg = duracion(1, c.bpm);
    while (musica.siguiente < ahora + 0.18) {
      programarPaso(c, musica.paso, musica.siguiente);
      musica.paso = (musica.paso + 1) % c.cache.total;
      musica.siguiente += seg;
    }
  }

  /** Fanfarria de cambio de pantalla: más fuerte y con acordes; el fondo se calla mientras suena. */
  function fanfarria(clave) {
    const fz = FANFARRIAS[clave];
    if (!fz) return;
    const t0 = ctx.currentTime + 0.06;
    const seg = duracion(1, fz.bpm);
    const bus = nodos.fanfarria;
    notasDe(fz.melodia).forEach((n) => {
      const t = t0 + n.paso * seg;
      const dur = seg * n.largo * 0.95;
      nota(bus, { f: frecuencia(n.midi), t, dur, onda: 'pulso25', vol: 0.15, vibrato: 20 });
      nota(bus, { f: frecuencia(n.midi + 12), t, dur, onda: 'pulso12', vol: 0.04 });
    });
    fz.acordes.forEach((ac, i) => {
      const t = t0 + i * 16 * seg;
      const notas = notasDeAcorde(ac, 4).slice(0, 3);
      notas.forEach((n) => nota(bus, { f: frecuencia(n), t, dur: 16 * seg * 0.95, onda: 'triangle', vol: 0.07, sostener: 0.6, ataque: 0.05 }));
      nota(bus, { f: frecuencia(notas[0] - 24), t, dur: 16 * seg * 0.9, onda: 'triangle', vol: 0.28, sostener: 0.6 });
    });
    pasos(fz.bateria).forEach((g, i) => { if (g !== '.') golpeBateria(bus, g, t0 + i * seg, 1); });
    const total = Math.max(fz.acordes.length * 16, pasos(fz.bateria).length) * seg;
    musica.callaHasta = t0 + total + 0.35;
    musica.cancion = null; // al acabar entra la canción deseada desde el principio
    // La grada ruge con la fanfarria
    rugido(t0, 2.6, 0.12 + grada.cerca * 0.12);
  }

  // --- La grada ------------------------------------------------------------------------------

  /** Una sílaba cantada por mucha gente: varias voces desafinadas con los formantes de la vocal. */
  function silaba(t, vocal, nombreNota, dur, consonante, vol) {
    const [f1, f2] = VOCALES[vocal];
    const voces = 7;
    const base = midiDe(nombreNota);
    const salida = ctx.createGain();
    salida.gain.value = 1;
    const filtro1 = ctx.createBiquadFilter();
    filtro1.type = 'bandpass'; filtro1.frequency.value = f1; filtro1.Q.value = 5;
    const filtro2 = ctx.createBiquadFilter();
    filtro2.type = 'bandpass'; filtro2.frequency.value = f2; filtro2.Q.value = 7;
    const g2 = ctx.createGain(); g2.gain.value = 0.6;
    filtro1.connect(salida);
    filtro2.connect(g2).connect(salida);
    salida.connect(nodos.grada);
    for (let v = 0; v < voces; v += 1) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const octava = v % 3 === 0 ? 12 : 0; // algunas voces más agudas
      const f = frecuencia(base + octava) * (1 + (Math.random() - 0.5) * 0.035);
      const tv = t + Math.random() * 0.045;
      osc.frequency.setValueAtTime(f * 0.97, tv);
      osc.frequency.linearRampToValueAtTime(f, tv + 0.06);
      g.gain.setValueAtTime(0.0001, tv);
      g.gain.exponentialRampToValueAtTime(vol / voces, tv + 0.04);
      g.gain.setValueAtTime(vol / voces, tv + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, tv + dur);
      osc.connect(g);
      g.connect(filtro1); g.connect(filtro2);
      osc.start(tv);
      osc.stop(tv + dur + 0.05);
    }
    if (consonante) ruido(nodos.grada, { t, dur: 0.05, vol: vol * 0.5, filtro: 'highpass', f: 3500, q: 0.7 });
  }

  function cantico(vol) {
    const c = CANTICOS[Math.floor(Math.random() * CANTICOS.length)];
    const pulso = 60 / c.bpm;
    let t = ctx.currentTime + 0.05;
    c.silabas.forEach(([vocal, n, pulsos, cons]) => {
      const dur = pulsos * pulso;
      if (vocal === '*') palmas(nodos.grada, t, vol * 0.9, 6);
      else silaba(t, vocal, n, dur * 0.95, cons, vol);
      t += dur;
    });
  }

  /** La grada ruge (goles, fanfarrias, jefes eliminados). */
  function rugido(t, dur, vol) {
    const src = ctx.createBufferSource();
    src.buffer = nodos.ruido;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.4);
    g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(nodos.grada);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  function actualizarGrada(enPartida) {
    const ahora = ctx.currentTime;
    const objetivo = enPartida ? Math.min(0.25, 0.02 + grada.base + grada.cerca * 0.16) : 0.01;
    nodos.murmullo.gain.setTargetAtTime(objetivo, ahora, 0.6);
    if (!enPartida || grada.cerca < 0.18) return;
    if (ahora >= grada.proximoCantico) {
      cantico(0.08 + grada.cerca * 0.24);
      grada.proximoCantico = ahora + 7 + Math.random() * 6;
    }
  }

  // --- Efectos ------------------------------------------------------------------------------

  const EFECTOS = {
    chute(b, t) {
      nota(b, { f: 230, deslizar: 110, t, dur: 0.07, onda: 'triangle', vol: 0.09 });
      ruido(b, { t, dur: 0.035, vol: 0.05, filtro: 'lowpass', f: 1600 });
    },
    latigazo(b, t) {
      ruido(b, { t, dur: 0.13, vol: 0.06, filtro: 'bandpass', f: 3200, hasta: 700, q: 2 });
      nota(b, { f: 340, deslizar: 90, t, dur: 0.12, onda: 'pulso25', vol: 0.03 });
    },
    cantico(b, t) {
      nota(b, { f: midi('A3'), t, dur: 0.22, onda: 'pulso50', vol: 0.04 });
      nota(b, { f: midi('E4'), t, dur: 0.22, onda: 'pulso25', vol: 0.03 });
      ruido(b, { t, dur: 0.25, vol: 0.03, filtro: 'bandpass', f: 700, q: 1 });
    },
    golpe(b, t) {
      ruido(b, { t, dur: 0.03, vol: 0.05, filtro: 'highpass', f: 2200 });
      nota(b, { f: 180, deslizar: 95, t, dur: 0.05, onda: 'pulso50', vol: 0.03 });
    },
    baja(b, t) {
      nota(b, { f: 300, deslizar: 640, t, dur: 0.055, onda: 'pulso25', vol: 0.035 });
      ruido(b, { t, dur: 0.04, vol: 0.025, filtro: 'bandpass', f: 1500, q: 2 });
    },
    gema(b, t) {
      // Si coges varias seguidas, cada una suena un poco más aguda (hasta una octava)
      const ahora = performance.now();
      gemas = ahora - gemas.t < 450 ? { n: Math.min(12, gemas.n + 1), t: ahora } : { n: 0, t: ahora };
      const n = midiDe('E6') + [0, 2, 4, 5, 7, 9, 11, 12, 12, 12, 12, 12, 12][gemas.n];
      nota(b, { f: frecuencia(n), t, dur: 0.05, onda: 'pulso25', vol: 0.03 });
      nota(b, { f: frecuencia(n + 7), t: t + 0.035, dur: 0.05, onda: 'triangle', vol: 0.03 });
    },
    cura(b, t) { arpegio(b, ['C5', 'E5', 'G5', 'C6'], t, { paso: 0.05, onda: 'triangle', vol: 0.07, ultimaLarga: 0.2 }); },
    dano(b, t) {
      nota(b, { f: 170, deslizar: 55, t, dur: 0.2, onda: 'pulso50', vol: 0.08 });
      ruido(b, { t, dur: 0.12, vol: 0.07, filtro: 'lowpass', f: 900 });
    },
    nivel(b, t) { arpegio(b, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], t, { paso: 0.055, vol: 0.06, ultimaLarga: 0.28 }); },
    oleada(b, t) { silbato(b, t, 0.22, 0.045); silbato(b, t + 0.3, 0.42, 0.05); },
    'jefe-derrotado': (b, t) => {
      nota(b, { f: 110, deslizar: 40, t, dur: 0.5, onda: 'sine', vol: 0.3 });
      ruido(b, { t, dur: 0.6, vol: 0.14, filtro: 'lowpass', f: 1800, hasta: 200 });
      arpegio(b, ['G4', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], t + 0.25, { paso: 0.06, vol: 0.06, ultimaLarga: 0.5 });
      rugido(t + 0.2, 2.4, 0.3);
    },
    sinergia(b, t) { arpegio(b, ['A4', 'C#5', 'E5', 'A5', 'C#6', 'E6'], t, { paso: 0.05, onda: 'pulso12', vol: 0.06, ultimaLarga: 0.35 }); },
    ultra(b, t) {
      ruido(b, { t, dur: 0.9, vol: 0.08, filtro: 'bandpass', f: 400, hasta: 5000, q: 1.5, ataque: 0.6 });
      arpegio(b, ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6', 'D7'], t + 0.55, { paso: 0.045, vol: 0.06, ultimaLarga: 0.6 });
      nota(b, { f: midi('D3'), t: t + 0.85, dur: 0.6, onda: 'triangle', vol: 0.25 });
    },
    escudo(b, t) {
      nota(b, { f: 1250, t, dur: 0.14, onda: 'sine', vol: 0.04, sostener: 0.3 });
      nota(b, { f: 1890, t, dur: 0.1, onda: 'sine', vol: 0.025, sostener: 0.3 });
    },
    fin(b, t) {
      arpegio(b, ['G4', 'F#4', 'F4', 'E4'], t, { paso: 0.28, dur: 0.25, onda: 'pulso50', vol: 0.07, ultimaLarga: 0.7 });
      silbato(b, t + 1.7, 0.18, 0.05); silbato(b, t + 1.95, 0.18, 0.05); silbato(b, t + 2.2, 0.6, 0.055); // final del partido
    },
    logro(b, t) {
      arpegio(b, ['E6', 'G#6', 'B6', 'E7'], t, { paso: 0.07, onda: 'triangle', vol: 0.06, ultimaLarga: 0.4 });
      nota(b, { f: midi('E5'), t, dur: 0.5, onda: 'pulso25', vol: 0.03 });
      nota(b, { f: midi('B5'), t: t + 0.14, dur: 0.4, onda: 'pulso25', vol: 0.025 });
    },
    aviso(b, t) {
      nota(b, { f: midi('A5'), t, dur: 0.1, onda: 'pulso50', vol: 0.045 });
      nota(b, { f: midi('E5'), t: t + 0.12, dur: 0.14, onda: 'pulso50', vol: 0.045 });
    },
    jefe(b, t) {
      // Bocina grave: entra un jefe o se enfada
      [0, 0.32].forEach((d) => {
        nota(b, { f: midi('D3'), t: t + d, dur: 0.26, onda: 'pulso50', vol: 0.09 });
        nota(b, { f: midi('Ab3'), t: t + d, dur: 0.26, onda: 'pulso25', vol: 0.06 });
      });
      nota(b, { f: 75, deslizar: 40, t, dur: 0.6, onda: 'sine', vol: 0.25 });
    },
    ulti(b, t) {
      nota(b, { f: 90, deslizar: 600, t, dur: 0.35, onda: 'pulso50', vol: 0.06 });
      ruido(b, { t, dur: 0.5, vol: 0.09, filtro: 'lowpass', f: 3000, hasta: 300 });
      arpegio(b, ['C5', 'G5', 'C6'], t + 0.2, { paso: 0.05, vol: 0.05, ultimaLarga: 0.3 });
    },
  };

  // --- API ------------------------------------------------------------------------------------

  return {
    get silenciado() { return silenciado; },
    get volumen() { return volumen; },
    set volumen(v) { volumen = Math.max(0, Math.min(1, v)); aplicarVolumenes(); },
    get volumenMusica() { return volumenMusica; },
    set volumenMusica(v) { volumenMusica = Math.max(0, Math.min(1, v)); aplicarVolumenes(); },
    /** Debe llamarse tras un gesto del usuario (el navegador no deja sonar antes). */
    activar: asegurarContexto,
    alternar() {
      silenciado = !silenciado;
      try { localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0'); } catch { /* sin almacenamiento */ }
      aplicarVolumenes();
      return silenciado;
    },
    /** Efecto de sonido (por nombre del evento de la simulación). */
    reproducir(nombre, ev = {}) {
      if (silenciado || !ctx || ctx.state !== 'running') return;
      let clave = nombre;
      if (nombre === 'aviso' && ev.jefe) clave = 'jefe';
      if (nombre === 'ambiente') { // el cambio de pantalla lo anuncia su fanfarria
        const ahora = performance.now();
        if (ahora - (ultimo.ambiente || 0) < CADA.ambiente) return;
        ultimo.ambiente = ahora;
        fanfarria(FANFARRIA_DE_AMBIENTE[ev.indice ?? 0]);
        return;
      }
      const efecto = EFECTOS[clave];
      if (!efecto) return;
      const ahora = performance.now();
      if (ahora - (ultimo[clave] || 0) < (CADA[clave] ?? 60)) return;
      ultimo[clave] = ahora;
      efecto(nodos.efectos, ctx.currentTime + 0.005);
    },
    /**
     * Cada fotograma: qué música toca y cuánto se oye la grada.
     * `estado`: { fase: 'hub'|'jugando'|'pausa'|'mejora'|'fin', ambiente, intensidad 0..3, cercaGrada 0..1 }
     */
    actualizar(estado) {
      if (!ctx || ctx.state !== 'running' || !nodos) return;
      const { fase, ambiente = 0, intensidad = 1, cercaGrada = 0 } = estado;
      const enPartida = fase === 'jugando' || fase === 'pausa' || fase === 'mejora';
      musica.deseada = fase === 'hub' ? 'hub' : enPartida ? CANCION_DE_AMBIENTE[ambiente] : null;
      musica.nivel = fase === 'hub' ? 2 : intensidad;
      // En pausa o eligiendo mejora la música suena apagada, como desde el túnel de vestuarios
      const apagar = fase === 'pausa' || fase === 'mejora';
      nodos.filtroMusica.frequency.setTargetAtTime(apagar ? 650 : 16000, ctx.currentTime, 0.12);
      grada.cerca = enPartida && !apagar ? cercaGrada : 0;
      grada.base = enPartida ? ambiente * 0.012 : 0;
      if (silenciado) return;
      actualizarMusica();
      actualizarGrada(enPartida && !apagar);
    },
    /** Empieza la partida: fanfarria de saque inicial. */
    saqueInicial() {
      if (silenciado || !ctx || ctx.state !== 'running') return;
      musica.deseada = CANCION_DE_AMBIENTE[0];
      fanfarria('inicio');
    },
    /** Al salir del juego. */
    cerrar() {
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      nodos = null;
    },
  };
}

/** Buses (efectos, música, fanfarria y grada), formas de onda de pulso y el ruido compartido. */
function crearNodos(ctx) {
  const maestro = ctx.createGain();
  const compresor = ctx.createDynamicsCompressor();
  compresor.threshold.value = -14;
  compresor.ratio.value = 4;
  maestro.connect(compresor).connect(ctx.destination);

  const efectos = ctx.createGain();
  efectos.connect(maestro);

  // Música: filtro (para apagarla en pausa) y un eco corto que le da cuerpo
  const musica = ctx.createGain();
  const filtroMusica = ctx.createBiquadFilter();
  filtroMusica.type = 'lowpass';
  filtroMusica.frequency.value = 16000;
  const eco = ctx.createDelay(1);
  eco.delayTime.value = 0.27;
  const realimenta = ctx.createGain();
  realimenta.gain.value = 0.22;
  const mezclaEco = ctx.createGain();
  mezclaEco.gain.value = 0.25;
  const fondo = ctx.createGain(); // entrada común de canciones y fanfarrias
  fondo.connect(filtroMusica);
  filtroMusica.connect(musica);
  filtroMusica.connect(eco);
  eco.connect(realimenta).connect(eco);
  eco.connect(mezclaEco).connect(musica);
  musica.connect(maestro);
  const fanfarria = ctx.createGain();
  fanfarria.gain.value = 1.35; // la fanfarria, más fuerte que el fondo
  fanfarria.connect(fondo);

  // Grada: murmullo continuo (ruido filtrado que respira) y los cánticos
  const grada = ctx.createGain();
  grada.connect(maestro);
  const datos = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const canal = datos.getChannelData(0);
  let rosa = 0;
  for (let i = 0; i < canal.length; i += 1) { // ruido algo «rosa»: menos chillón que el blanco
    rosa = 0.97 * rosa + 0.03 * (Math.random() * 2 - 1);
    canal[i] = (Math.random() * 2 - 1) * 0.55 + rosa * 3;
  }
  const murmullo = ctx.createGain();
  murmullo.gain.value = 0;
  const fuente = ctx.createBufferSource();
  fuente.buffer = datos;
  fuente.loop = true;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 0.8;
  const respira = ctx.createGain();
  respira.gain.value = 0.8;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.17;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.25;
  lfo.connect(lfoG).connect(respira.gain);
  fuente.connect(f1).connect(respira).connect(murmullo).connect(grada);
  fuente.start();
  lfo.start();

  // Ondas de pulso (las del chiptune clásico): 12,5 %, 25 % y 50 %
  const pulso = (d) => {
    const n = 40;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k += 1) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * d);
    return ctx.createPeriodicWave(real, imag);
  };
  const ondas = { pulso12: pulso(0.125), pulso25: pulso(0.25), pulso50: pulso(0.5) };

  return { maestro, efectos, musica, fondo, fanfarria, filtroMusica, grada, murmullo, ondas, ruido: datos };
}
