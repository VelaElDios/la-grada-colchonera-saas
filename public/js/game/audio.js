// Efectos de sonido sintetizados con Web Audio (sin ficheros de audio). Se puede silenciar.

const CLAVE_SILENCIO = 'grada.silencio';

function leerSilencio() {
  try { return localStorage.getItem(CLAVE_SILENCIO) === '1'; } catch { return false; }
}

// freq inicial → final, duración (s), tipo de onda, volumen, intervalo mínimo entre sonidos iguales (ms)
const SONIDOS = {
  chute: { de: 220, a: 120, dur: 0.07, onda: 'triangle', vol: 0.05, cada: 90 },
  latigazo: { de: 320, a: 90, dur: 0.14, onda: 'sawtooth', vol: 0.04, cada: 120 },
  cantico: { de: 140, a: 60, dur: 0.35, onda: 'square', vol: 0.05, cada: 300 },
  golpe: { de: 180, a: 100, dur: 0.05, onda: 'square', vol: 0.025, cada: 45 },
  baja: { de: 260, a: 520, dur: 0.06, onda: 'triangle', vol: 0.035, cada: 50 },
  gema: { de: 700, a: 1100, dur: 0.05, onda: 'sine', vol: 0.03, cada: 50 },
  cura: { de: 400, a: 800, dur: 0.18, onda: 'sine', vol: 0.06, cada: 200 },
  dano: { de: 160, a: 50, dur: 0.22, onda: 'sawtooth', vol: 0.08, cada: 150 },
  nivel: { de: 440, a: 880, dur: 0.35, onda: 'triangle', vol: 0.07, cada: 400 },
  oleada: { de: 200, a: 400, dur: 0.4, onda: 'square', vol: 0.05, cada: 500 },
  'jefe-derrotado': { de: 120, a: 800, dur: 0.6, onda: 'sawtooth', vol: 0.07, cada: 500 },
  sinergia: { de: 520, a: 1040, dur: 0.5, onda: 'triangle', vol: 0.08, cada: 600 },
  ultra: { de: 220, a: 1320, dur: 1.1, onda: 'sawtooth', vol: 0.09, cada: 1500 },
  escudo: { de: 600, a: 300, dur: 0.1, onda: 'sine', vol: 0.04, cada: 120 },
  fin: { de: 300, a: 40, dur: 0.9, onda: 'sawtooth', vol: 0.08, cada: 1000 },
};

export function crearAudio() {
  let ctx = null;
  let silenciado = leerSilencio();
  let volumen = 0.7; // 0..1
  const ultimo = {};

  function asegurarContexto() {
    if (!ctx) {
      const Clase = window.AudioContext || window.webkitAudioContext;
      if (!Clase) return null;
      ctx = new Clase();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  return {
    get silenciado() { return silenciado; },
    get volumen() { return volumen; },
    set volumen(v) { volumen = Math.max(0, Math.min(1, v)); },
    /** Debe llamarse tras un gesto del usuario (el navegador no deja sonar antes). */
    activar: asegurarContexto,
    alternar() {
      silenciado = !silenciado;
      try { localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0'); } catch { /* sin almacenamiento */ }
      return silenciado;
    },
    reproducir(nombre) {
      const s = SONIDOS[nombre];
      if (!s || silenciado) return;
      const ahora = performance.now();
      if (ahora - (ultimo[nombre] || 0) < s.cada) return;
      ultimo[nombre] = ahora;
      const c = asegurarContexto();
      if (!c) return;
      const osc = c.createOscillator();
      const ganancia = c.createGain();
      osc.type = s.onda;
      osc.frequency.setValueAtTime(s.de, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, s.a), c.currentTime + s.dur);
      ganancia.gain.setValueAtTime(Math.max(0.0002, s.vol * volumen * 1.4), c.currentTime);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + s.dur);
      osc.connect(ganancia).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + s.dur + 0.02);
    },
  };
}
