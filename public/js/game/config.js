// Datos de equilibrio del juego: todo lo que se puede "tocar" para retocar la dificultad está aquí.
// Los personajes, nombres y dibujos son originales: no se usan escudos ni jugadores reales.

export const MUNDO = {
  duracionOleada: 30, // segundos por oleada
  distanciaAparicion: 470, // los enemigos aparecen fuera de la pantalla, a esta distancia del jugador
  distanciaDescarte: 900, // si un enemigo se queda atrás, se recoloca delante
  maxEnemigos: 320,
  maxGemas: 450,
  paso: 1 / 60, // tamaño del paso de simulación
};

export const JUGADOR = {
  radio: 14,
  vida: 100,
  velocidad: 150,
  invulnerabilidad: 0.6, // segundos sin recibir daño tras un golpe
  radioImanBase: 70,
};

/** Tipos de rival. `desdeOleada`: primera oleada en la que pueden aparecer. */
export const ENEMIGOS = {
  rival: { nombre: 'Rival', vida: 10, velocidad: 55, radio: 12, dano: 4, xp: 1, peso: 1, desdeOleada: 1, color: '#6d5bd0' },
  velocista: { nombre: 'Velocista', vida: 6, velocidad: 98, radio: 10, dano: 3, xp: 1, peso: 0.45, desdeOleada: 2, color: '#e0a526' },
  central: { nombre: 'Central', vida: 48, velocidad: 38, radio: 20, dano: 8, xp: 5, peso: 0.22, desdeOleada: 3, color: '#2b9a8f' },
  jefe: { nombre: 'Míster Rival', vida: 650, velocidad: 48, radio: 34, dano: 14, xp: 40, peso: 0, desdeOleada: 5, color: '#a3283f' },
};

/** Niveles de cada arma (índice 0 = nivel 1). */
export const ARMAS = {
  balon: {
    nombre: 'Balón de reglamento',
    descripcion: 'Chuta balones a los rivales más cercanos.',
    icono: 'balon',
    niveles: [
      { cd: 1.0, n: 1, dano: 8, perfora: 1 },
      { cd: 0.9, n: 2, dano: 8, perfora: 1 },
      { cd: 0.85, n: 2, dano: 11, perfora: 2 },
      { cd: 0.75, n: 3, dano: 11, perfora: 2 },
      { cd: 0.6, n: 4, dano: 14, perfora: 3 },
    ],
    mejoras: ['Un balón más', 'Más daño y atraviesa un rival más', 'Un balón más', 'Más daño, atraviesa y chuta más rápido'],
  },
  bufanda: {
    nombre: 'Bufanda rojiblanca',
    descripcion: 'Un latigazo de bufanda golpea a todos los que tengas delante.',
    icono: 'bufanda',
    niveles: [
      { cd: 1.5, largo: 95, ancho: 1.05, dano: 12, ambos: false },
      { cd: 1.35, largo: 108, ancho: 1.1, dano: 15, ambos: false },
      { cd: 1.2, largo: 120, ancho: 1.2, dano: 18, ambos: false },
      { cd: 1.05, largo: 135, ancho: 1.3, dano: 21, ambos: true },
      { cd: 0.9, largo: 150, ancho: 1.4, dano: 26, ambos: true },
    ],
    mejoras: ['Más alcance y daño', 'Más alcance y daño', 'Golpea a los dos lados', 'Más alcance, daño y velocidad'],
  },
  banderines: {
    nombre: 'Banderines de córner',
    descripcion: 'Banderines que giran a tu alrededor y empujan a quien se acerca.',
    icono: 'banderin',
    niveles: [
      { n: 1, radio: 70, dano: 6, vel: 2.4 },
      { n: 2, radio: 76, dano: 7, vel: 2.5 },
      { n: 2, radio: 86, dano: 9, vel: 2.7 },
      { n: 3, radio: 96, dano: 10, vel: 2.9 },
      { n: 4, radio: 108, dano: 12, vel: 3.2 },
    ],
    mejoras: ['Un banderín más', 'Más daño y radio', 'Un banderín más', 'Un banderín más y más rápidos'],
  },
  canticos: {
    nombre: 'Cántico de la grada',
    descripcion: 'La grada canta y una onda sonora aparta y daña a los rivales.',
    icono: 'megafono',
    niveles: [
      { cd: 6.0, radio: 120, dano: 10, empuje: 300 },
      { cd: 5.4, radio: 140, dano: 14, empuje: 330 },
      { cd: 4.9, radio: 165, dano: 18, empuje: 360 },
      { cd: 4.3, radio: 190, dano: 24, empuje: 390 },
      { cd: 3.5, radio: 225, dano: 32, empuje: 430 },
    ],
    mejoras: ['Más radio y daño', 'Más radio y daño', 'Más radio, daño y frecuencia', 'Mucho más radio y daño'],
  },
};

/** Mejoras pasivas: cada nivel suma `porNivel` a su atributo. Máximo 5 niveles. */
export const PASIVAS = {
  botas: { nombre: 'Botas de tacos', descripcion: '+8 % de velocidad de movimiento por nivel.', icono: 'bota', porNivel: 0.08 },
  iman: { nombre: 'Imán de balones', descripcion: '+30 % de radio para recoger experiencia por nivel.', icono: 'iman', porNivel: 0.3 },
  pasion: { nombre: 'Pasión rojiblanca', descripcion: '+20 de vida máxima por nivel y te cura 20.', icono: 'corazon', porNivel: 20 },
  tactica: { nombre: 'Pizarra del míster', descripcion: '+12 % de daño de todas las armas por nivel.', icono: 'pizarra', porNivel: 0.12 },
  cantera: { nombre: 'Cantera', descripcion: '+12 % de experiencia por nivel.', icono: 'estrella', porNivel: 0.12 },
  masaje: { nombre: 'Masajista', descripcion: 'Recuperas 0,5 de vida por segundo y nivel.', icono: 'cruz', porNivel: 0.5 },
};

export const NIVEL_MAXIMO = 5;

/** Experiencia necesaria para pasar del nivel `n` al siguiente. */
export function xpParaSubir(n) {
  return Math.round(5 + (n - 1) * 4 + (n - 1) ** 1.5);
}
