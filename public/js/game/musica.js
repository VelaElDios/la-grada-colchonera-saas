// Música chiptune ORIGINAL del juego (no copia ningún himno): una canción de fondo por pantalla, más suave
// que la fanfarria que suena al cambiar de pantalla, y que se va animando (más capas) cuanto más aguantas.
// Solo datos y funciones puras (sin Web Audio), así se puede probar con node:test.
//
// Formato: cada compás son 16 pasos (semicorcheas). En las melodías cada paso es una nota ('A4', 'C#5', 'Bb3'),
// '-' (sigue sonando la anterior) o '.' (silencio). En la batería: k bombo, s caja, h charles, o charles abierto,
// c palmas, t tamboril, combinables ('kh'), o '.'.

const NOTAS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' → 69 (MIDI). Admite sostenidos y bemoles ('C#5', 'Bb3'). */
export function midiDe(nombre) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(nombre);
  if (!m) return null;
  const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTAS[m[1]] + alter;
}

export const frecuencia = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** 'Am', 'F#m', 'Bb', 'E7', 'Gsus4' → { raiz (semitono 0..11), notas: intervalos } */
export function acordeDe(simbolo) {
  const m = /^([A-G])([#b]?)(m|7|m7|maj7|sus4)?$/.exec(simbolo);
  if (!m) return null;
  const raiz = (NOTAS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const intervalos = { m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7] }[m[3]] ?? [0, 4, 7];
  return { raiz, intervalos };
}

/** Separa una pista en pasos. */
export const pasos = (texto) => texto.trim().split(/\s+/);

/**
 * Convierte una melodía en notas { paso, midi, largo } (largo en pasos, sumando los '-').
 */
export function notasDe(texto) {
  const p = pasos(texto);
  const notas = [];
  for (let i = 0; i < p.length; i += 1) {
    const midi = midiDe(p[i]);
    if (midi === null) continue;
    let largo = 1;
    while (p[i + largo] === '-') largo += 1;
    notas.push({ paso: i, midi, largo });
  }
  return notas;
}

// ---------------------------------------------------------------------------------------------
// Ritmos del bajo y del arpegio (se generan desde los acordes)
// ---------------------------------------------------------------------------------------------

/** Por cada paso del compás: [grado del acorde, octava extra] o null. El grado 0 es la raíz. */
export const BAJOS = {
  pulso: [[0, 0], null, [0, 0], null, [0, 0], null, [0, 0], null, [0, 0], null, [0, 0], null, [0, 0], null, [2, 0], null],
  octavas: [[0, 0], null, [0, 1], null, [0, 0], null, [0, 1], null, [0, 0], null, [0, 1], null, [0, 0], null, [0, 1], null],
  galope: [[0, 0], null, [0, 0], [0, 0], [0, 1], null, [0, 0], [0, 0], [0, 0], null, [0, 0], [0, 0], [2, 0], null, [1, 0], [0, 0]],
  pasodoble: [[0, 0], null, null, null, [2, -1], null, null, null, [0, 0], null, null, null, [2, -1], null, [1, 0], null],
  samba: [[0, 0], null, null, [0, 0], [2, 0], null, [0, 1], null, [0, 0], null, null, [0, 0], [2, 0], null, [1, 0], null],
  tranquilo: [[0, 0], null, null, null, null, null, [2, 0], null, [0, 1], null, null, null, [2, 0], null, null, null],
};

export const ARPEGIOS = {
  sube: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
  ola: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1],
  saltos: [0, null, 2, null, 1, null, 3, null, 0, null, 2, null, 1, null, 3, null],
  golpes: [null, null, 'acorde', null, null, null, 'acorde', null, null, null, 'acorde', null, null, null, 'acorde', null],
};

/** Notas MIDI del arpegio de un acorde a partir de una octava: 1-3-5-8 (o 1-3-5-7 si es de séptima). */
export function notasDeAcorde(simbolo, octava = 4) {
  const a = acordeDe(simbolo);
  const base = 12 * (octava + 1) + a.raiz;
  const n = a.intervalos.map((i) => base + i);
  if (n.length === 3) n.push(base + 12);
  return n;
}

// ---------------------------------------------------------------------------------------------
// Baterías por nivel de intensidad (0 tranquilo … 3 a tope)
// ---------------------------------------------------------------------------------------------

export const BATERIAS = {
  base: [
    '. . . . h . . . . . . . h . . .',
    'h . h . h . h . h . h . h . h .',
    'k . h . s . h . k . h k s . h .',
    'kh . h h sh . h k kh . h kh sh . o h',
  ],
  pasodoble: [
    'k . . . h . . . k . . . h . . .',
    'k . h . s . h . k . h . s . h .',
    'k . h . s . h h k . h . s . h h',
    'kh . h h sh . h h kh . h h sh c sh sh',
  ],
  samba: [
    '. . t . . t . . . . t . . t . .',
    'k . t t h t . t k t . t h t t .',
    'k t h t s t h k k t h t s t h t',
    'kh t ht t sh t ht kc kh t ht t sh c sh t',
  ],
  himno: [
    '. . . . . . . . h . . . . . . .',
    'k . . . h . . . k . . . h . h .',
    'k . h . s . h . k . h . s . h k',
    'kh . h k sh . h k kh . h k sh h sh o',
  ],
};

// ---------------------------------------------------------------------------------------------
// Canciones de fondo (4 compases que se repiten). Cada pantalla, un poco más rápida y más emocionante.
// ---------------------------------------------------------------------------------------------

export const CANCIONES = {
  hub: {
    nombre: 'Vestuario', bpm: 96, bajo: 'tranquilo', arpegio: 'ola', bateria: 'base', lider: 'triangle',
    acordes: ['C', 'Am', 'F', 'G'],
    melodia: `E5 - G5 - C6 - - - B5 - G5 - E5 - - -
              C5 - E5 - A5 - - - G5 - E5 - C5 - - -
              A4 - C5 - F5 - - - E5 - F5 - A5 - - -
              G5 - - - F5 - D5 - B4 - - - . . . .`,
  },
  inicio: {
    nombre: 'Pretemporada', bpm: 112, bajo: 'pulso', arpegio: 'sube', bateria: 'base', lider: 'pulso25',
    acordes: ['D', 'Bm', 'G', 'A'],
    melodia: `F#5 - A5 - D6 - A5 - F#5 - A5 - B5 - A5 -
              F#5 - D5 - F#5 - B5 - - - A5 - F#5 - D5 -
              G5 - B5 - D6 - B5 - G5 - - - E5 - G5 -
              A5 - - - E5 - C#6 - - - B5 - A5 - . .`,
  },
  copa: {
    nombre: 'Final de Copa', bpm: 120, bajo: 'pasodoble', arpegio: 'saltos', bateria: 'pasodoble', lider: 'pulso25',
    acordes: ['Am', 'G', 'F', 'E'],
    melodia: `E5 - - - A5 - B5 - C6 - B5 - A5 - - -
              D6 - - - C6 - B5 - G5 - - - B5 - D6 -
              C6 - - - A5 - - - F5 - A5 - C6 - A5 -
              B5 - - - G#5 - A5 - B5 - - - E5 - - -`,
  },
  liga: {
    nombre: 'Final de Liga', bpm: 128, bajo: 'galope', arpegio: 'sube', bateria: 'base', lider: 'pulso50',
    acordes: ['Em', 'C', 'G', 'D'],
    melodia: `E5 . E5 . G5 - B5 - E6 - - - D6 - B5 -
              C6 - - - G5 - E5 - G5 - C6 - B5 - G5 -
              B5 - - - D6 - B5 - G5 - D5 - G5 - B5 -
              A5 - - - F#5 - A5 - D6 - - - . . A5 -`,
  },
  champions: {
    nombre: 'Noche europea', bpm: 132, bajo: 'octavas', arpegio: 'ola', bateria: 'himno', lider: 'pulso25',
    acordes: ['Dm', 'Bb', 'Gm', 'A'],
    melodia: `D5 - - - - - F5 - A5 - - - - - D6 -
              D6 - - - C6 - Bb5 - F5 - - - - - Bb5 -
              Bb5 - - - A5 - G5 - D5 - - - G5 - Bb5 -
              A5 - - - - - - - C#6 - - - E6 - - -`,
  },
  mundial: {
    nombre: 'Final del Mundial', bpm: 140, bajo: 'samba', arpegio: 'golpes', bateria: 'samba', lider: 'pulso25',
    acordes: ['C', 'F', 'G7', 'C'],
    melodia: `G5 . E5 G5 - C6 - . E6 - D6 C6 - G5 - .
              A5 . F5 A5 - C6 - . F6 - E6 C6 - A5 - .
              B5 . G5 B5 - D6 - . G6 - F6 D6 - B5 - .
              C6 - - - G5 . E5 . C5 - - - . . . .`,
  },
};

/** Canción de fondo de cada ambiente (por índice de AMBIENTES). */
export const CANCION_DE_AMBIENTE = ['inicio', 'copa', 'liga', 'champions', 'mundial'];

// ---------------------------------------------------------------------------------------------
// Fanfarrias al cambiar de pantalla (más fuertes y cortas). Una por competición.
// ---------------------------------------------------------------------------------------------

export const FANFARRIAS = {
  inicio: {
    nombre: 'Saque inicial', bpm: 140, acordes: ['D'], bateria: 'k . . . s . . . k . k . sh . o .',
    melodia: 'D5 . F#5 . A5 . D6 - - - - - . . . .',
  },
  copa: {
    nombre: 'Pasodoble de Copa', bpm: 120, acordes: ['E', 'Am'],
    bateria: 'k . h . s . h . k . h . s . h h  k . h h sh . h h kh . . . sh . o .',
    melodia: `E5 . A5 B5 C6 - B5 A5 G#5 - A5 B5 E5 - - -
              A5 - C6 - E6 - - - A6 - - - - - . .`,
  },
  liga: {
    nombre: 'Alirón', bpm: 132, acordes: ['Em', 'G'],
    bateria: 'k . h . s . h . k . h k s . s s  kh . h . sh . h . kh . . . sh c sh o',
    melodia: `B4 . E5 . G5 . B5 - - . A5 . G5 . F#5 .
              G5 - - - B5 - D6 - G6 - - - - - . .`,
  },
  champions: {
    nombre: 'Himno de la noche', bpm: 100, acordes: ['Dm', 'Gm', 'D'],
    bateria: 'k . . . . . . . s . . . . . . .  k . . . . . . . s . . . k . s .  kh . . . o . . . . . . . . . . .',
    melodia: `D5 - - - A5 - - - F5 - G5 - A5 - - -
              Bb5 - - - A5 - G5 - A5 - - - D6 - - -
              F#6 - - - - - - - - - - - . . . .`,
  },
  mundial: {
    nombre: 'Fiesta mundial', bpm: 150, acordes: ['C', 'G', 'C'],
    bateria: 'k t h t s t h k k t h t s t h t  kh t ht t sh t ht kc kh t ht t sh c sh t  kh . . . o . . . . . . . . . . .',
    melodia: `C5 . E5 . G5 . C6 . E6 - D6 C6 D6 - E6 -
              D6 . B5 . G5 . B5 . D6 - - - F6 - - -
              G6 - - - - - E6 . G6 - - - - - . .`,
  },
};

/** Fanfarria del ambiente `i`. */
export const FANFARRIA_DE_AMBIENTE = ['inicio', 'copa', 'liga', 'champions', 'mundial'];

/** Duración en segundos de una pieza de `n` pasos a `bpm` (4 pasos por pulso). */
export const duracion = (n, bpm) => (n * 60) / bpm / 4;

/**
 * Intensidad de la música de fondo (0..3) según el minuto dentro del ambiente y si hay un jefe vivo:
 * empieza suave tras la fanfarria y se va animando.
 */
export function intensidadMusica(minutoEnAmbiente, jefe = false) {
  if (jefe) return 3;
  if (minutoEnAmbiente < 1) return 1;
  if (minutoEnAmbiente < 2.5) return 2;
  return 3;
}

// ---------------------------------------------------------------------------------------------
// Cántico de la grada: «¡A-tle-ti!» (vocales con formantes) y palmas
// ---------------------------------------------------------------------------------------------

/** Formantes aproximados (Hz) de cada vocal para la voz de la grada. */
export const VOCALES = { a: [800, 1200], e: [450, 1900], i: [300, 2300], o: [480, 850] };

/**
 * Cánticos: sílabas con vocal, nota, duración en pulsos y si empieza con consonante; '*' son palmas.
 * Son ritmos de grada genéricos, no letras de ninguna canción.
 */
export const CANTICOS = [
  {
    nombre: 'Atleti', bpm: 132,
    silabas: [
      ['a', 'G3', 0.75], ['e', 'G3', 0.5, true], ['i', 'C4', 1.25, true], ['*', null, 0.5], ['*', null, 0.5], ['*', null, 1],
      ['a', 'G3', 0.75], ['e', 'G3', 0.5, true], ['i', 'C4', 1.25, true], ['*', null, 0.5], ['*', null, 0.5], ['*', null, 1],
    ],
  },
  {
    nombre: 'Ooooe', bpm: 120,
    silabas: [['o', 'E3', 1], ['e', 'A3', 2], ['o', 'G3', 1], ['e', 'C4', 2], ['*', null, 0.5], ['*', null, 0.5], ['*', null, 0.5], ['*', null, 0.5]],
  },
  {
    nombre: 'Palmas', bpm: 140,
    silabas: [['*', null, 1], ['*', null, 1], ['*', null, 0.5], ['*', null, 0.5], ['*', null, 1], ['a', 'A3', 0.5], ['e', 'A3', 0.5, true], ['i', 'D4', 1, true]],
  },
];

/**
 * Cuánto se oye la grada (0..1) a `d` píxeles de una grada. A más de `alcance` ya no se oye.
 */
export function cercaniaGrada(d, alcance = 700) {
  if (!Number.isFinite(d)) return 0;
  const p = Math.max(0, Math.min(1, 1 - d / alcance));
  return p * p;
}
