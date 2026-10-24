// Datos de equilibrio del juego: todo lo que se puede "tocar" para retocar la dificultad está aquí.
// Proyecto de aficionado sin relación oficial con ningún club ni jugador: los dibujos son originales
// (muñecos «chibi» de píxeles) y no se usan escudos ni imágenes oficiales.

export const MUNDO = {
  duracionOleada: 30, // segundos por oleada
  distanciaAparicion: 470, // los enemigos aparecen fuera de la pantalla, a esta distancia del jugador
  distanciaDescarte: 900, // si un enemigo se queda atrás, se recoloca delante
  maxEnemigos: 320,
  maxGemas: 450,
  paso: 1 / 60, // tamaño del paso de simulación
  velRivales: 1.2, // multiplicador global de la velocidad de todos los rivales
};

// Cámara en 3/4: el suelo se ve algo más aplastado que un plano cenital puro y los muñecos se quedan de pie.
export const CAMARA = {
  inclinacion: 0.8, // 1 = cenital puro; menos = más inclinada
  suavizado: 8, // cuánto tarda la cámara en alcanzarte (mayor = más pegada)
  adelanto: 70, // la cámara mira un poco hacia donde corres (a ritmo máximo)
  profundidad: 0.14, // los de abajo en pantalla se ven un poco más grandes
};

// Cómo se siente el movimiento: el jugador acelera y frena con algo de inercia.
export const FISICA = { aceleracion: 15, frenada: 22 };

// Moverse tiene premio y quedarse quieto, castigo: el «ritmo» sube mientras corres y baja cuando paras.
export const MOVIMIENTO = {
  rampa: 1.1, // segundos corriendo seguidos para llegar al ritmo máximo
  caida: 0.7, // segundos parado para perderlo del todo
  bonoDano: 0.25, // +25 % de daño con el ritmo al máximo
  bonoXp: 0.2, // +20 % de experiencia con el ritmo al máximo
  cargaUlti: 0.005, // puntos de ulti por unidad de mundo recorrida
  quietoPresion: 1.5, // segundos parado hasta que la grada rival aprieta
  presionVel: 1.35, // los rivales cercanos corren un 35 % más si estás quieto
  presionRadio: 440,
};

// Campo infinito con zonas fijas (siempre las mismas para una partida): barro, lluvia y gradas.
export const TERRENO = {
  celda: 640,
  barro: 0.5, // multiplicador de tu velocidad dentro del barro
  lluvia: 1.7, // multiplicador de la velocidad de los balones (tuyos y de los rivales) bajo la lluvia
  probLluvia: 0.2,
  probBarro: 0.18,
  probGrada: 0.42,
  claroInicial: 320, // radio alrededor del inicio sin gradas
};

// Premios repartidos por el campo: hay que ir a por ellos.
export const PREMIOS = {
  cada: 7, // segundos entre apariciones
  max: 4,
  distMin: 380,
  distMax: 640,
  distBorrado: 1100,
  tipos: {
    cura: { nombre: 'Botiquín', peso: 0.28 },
    xp: { nombre: 'Balón de Oro', peso: 0.34 },
    energia: { nombre: 'Energía', peso: 0.24 },
    iman: { nombre: 'Imán', peso: 0.14 },
  },
};

export const JUGADOR = {
  radio: 14,
  invulnerabilidad: 0.6, // segundos sin recibir daño tras un golpe
  radioImanBase: 70,
};

/**
 * Cómo crecen los rivales con el tiempo. `m` son los minutos de partida (una oleada = 0,5 min).
 * Pensado para que a la media hora sobrevivir sea muy difícil y a los 40 minutos casi imposible.
 */
export const ESCALADO = {
  vida: (m) => 1 + 0.45 * m + 0.02 * m * m,
  dano: (m) => 1 + 0.12 * m + 0.006 * m * m,
  velocidad: (m) => Math.min(2.1, 1 + 0.026 * m),
  xp: (m) => 1 + 0.08 * m,
};
export const minutosDeOleada = (oleada) => (oleada - 1) / 2;

// ---------------------------------------------------------------------------------------------
// Personajes jugables. Las estadísticas dependen SOLO de la posición (todos los porteros son iguales,
// todos los delanteros son iguales...). Más adelante se podrán diferenciar por jugador.
// ---------------------------------------------------------------------------------------------

export const POSICIONES = {
  portero: {
    nombre: 'Portero', vida: 170, vel: 163, cuerpo: 1.4, disparo: 0, armaInicial: 'bufanda',
    resumen: 'Muy resistente. Solo ataca cuerpo a cuerpo.',
  },
  defensa: {
    nombre: 'Defensa', vida: 135, vel: 170, cuerpo: 1.25, disparo: 0.7, armaInicial: 'bufanda',
    resumen: 'Duro y fuerte de cerca. Dispara algo.',
  },
  medio: {
    nombre: 'Mediocentro', vida: 110, vel: 177, cuerpo: 1.0, disparo: 1.0, armaInicial: 'balon',
    resumen: 'Equilibrado: cuerpo a cuerpo y disparo.',
  },
  delantero: {
    nombre: 'Delantero', vida: 90, vel: 184, cuerpo: 0.7, disparo: 1.35, armaInicial: 'balon',
    resumen: 'Frágil pero con el mejor disparo.',
  },
};

const ROJO = '#c8102e';
const BLANCO = '#ffffff';
const AZUL = '#1b2a5c';

export const PERSONAJES = {
  oblak: {
    nombre: 'Oblak', posicion: 'portero',
    aspecto: {
      piel: '#f2c6a0', pelo: { c: '#2b1b12', e: 'corto' },
      camiseta: { c: '#d8e43a', c2: '#111111', p: 'cuello' }, pantalon: '#111111', medias: '#111111', botas: '#ff7bb0', guantes: '#ff7a1a',
    },
  },
  godin: {
    nombre: 'Godín', posicion: 'defensa',
    aspecto: {
      piel: '#e0ac84', pelo: { c: '#3a2214', e: 'largo' }, barba: '#3a2214',
      camiseta: { c: ROJO, c2: BLANCO, p: 'franjas' }, pantalon: AZUL, medias: ROJO, botas: '#1d1d1d',
    },
  },
  koke: {
    nombre: 'Koke', posicion: 'medio',
    aspecto: {
      piel: '#f2c6a0', pelo: { c: '#6b4423', e: 'corto' },
      camiseta: { c: ROJO, c2: BLANCO, p: 'franjas' }, pantalon: AZUL, medias: ROJO, botas: '#f4f4f4',
    },
  },
  griezmann: {
    nombre: 'Griezmann', posicion: 'delantero',
    aspecto: {
      piel: '#f7d2b0', pelo: { c: '#d9b24c', e: 'tupe' },
      camiseta: { c: ROJO, c2: BLANCO, p: 'franjas' }, pantalon: AZUL, medias: ROJO, botas: '#ff8a00',
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Entrenadores: multiplican las estadísticas y aportan una ulti que se carga con las bajas.
// Pensados para brillar al principio y quedarse cortos al final (la ulti hace daño fijo, no un %).
// ---------------------------------------------------------------------------------------------

export const ULTI = { base: 50, incremento: 25, tope: 250, pasiva: 0.5 }; // carga necesaria y carga por segundo

export const ENTRENADORES = {
  cholo: {
    nombre: 'Cholo Simeone', apodo: 'El Cholo',
    mult: { dano: 1.1, vida: 1.05, vel: 1, xp: 1 },
    resumen: '+10 % de daño y +5 % de vida.',
    ulti: {
      nombre: '¡Partido a partido!',
      descripcion: 'La grada ruge: onda gigante que daña y aparta a todos y +30 % de daño durante 6 s.',
      radio: 650, dano: 70, danoPorNivel: 2, empuje: 420, animo: 6, bonoDano: 1.3,
    },
    aspecto: {
      piel: '#e8bb94', pelo: { c: '#1c1c1c', e: 'gomina' },
      camiseta: { c: '#15171c', c2: '#ffffff', p: 'traje' }, pantalon: '#15171c', medias: '#15171c', botas: '#15171c', corbata: '#15171c',
    },
  },
  aragones: {
    nombre: 'Luis Aragonés', apodo: 'El Sabio',
    mult: { dano: 1, vida: 1, vel: 1.05, xp: 1.12 },
    resumen: '+5 % de velocidad y +12 % de experiencia.',
    ulti: {
      nombre: 'Furia Roja',
      descripcion: 'Durante 7 s tus armas recargan el doble de rápido, vas un 25 % más veloz y atraes la experiencia desde lejos.',
      duracion: 7, bonoVel: 1.25, iman: 3,
    },
    aspecto: {
      piel: '#e8bb94', pelo: { c: '#d8d8d8', e: 'corto' },
      camiseta: { c: '#2d4a8a', c2: '#ffffff', p: 'traje' }, pantalon: '#2d4a8a', medias: '#2d4a8a', botas: '#2d2d2d', corbata: ROJO,
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Rivales: 16 equipos famosos con jugadores genéricos. Cada equipo se desbloquea en una oleada.
// `kit` = camiseta del equipo (patrones: liso, franjas, aros, mitad, mangas, cuello, banda).
// ---------------------------------------------------------------------------------------------

export const PIELES = ['#f2c6a0', '#e0ac84', '#c68642', '#8d5524', '#ffdbb4'];
export const PELOS = [
  { c: '#2b1b12', e: 'corto' }, { c: '#6b4423', e: 'corto' }, { c: '#d9b24c', e: 'corto' },
  { c: '#111111', e: 'rizado' }, { c: '#7a2f1d', e: 'largo' },
];

const equipo = (nombre, stats, camiseta, extra = {}) => ({ nombre, ...stats, kit: { camiseta, ...extra } });

export const EQUIPOS = {
  madrid: equipo('Real Madrid', { vida: 10, velocidad: 55, radio: 12, dano: 4, xp: 1, peso: 1, desde: 1 },
    { c: '#fafafa', c2: '#7b3fa0', p: 'cuello' }, { pantalon: '#fafafa', medias: '#fafafa', botas: '#222222' }),
  barca: equipo('FC Barcelona', { vida: 8, velocidad: 62, radio: 11, dano: 4, xp: 1, peso: 0.9, desde: 1 },
    { c: '#a50044', c2: '#004d98', p: 'franjas' }, { pantalon: '#004d98', medias: '#a50044', botas: '#222222' }),
  bayern: equipo('Bayern', { vida: 14, velocidad: 52, radio: 13, dano: 5, xp: 2, peso: 0.6, desde: 3 , dispara: { cada: 7, vel: 230, rango: 540 } },
    { c: '#dc052d', c2: '#ffffff', p: 'cuello' }, { pantalon: '#ffffff', medias: '#dc052d', botas: '#111111' }),
  liverpool: equipo('Liverpool', { vida: 7, velocidad: 92, radio: 10, dano: 3, xp: 1, peso: 0.5, desde: 2 , embiste: { cada: 4.5, mult: 2.3, dur: 0.7 } },
    { c: '#d4101e', c2: '#ffffff', p: 'liso' }, { pantalon: '#d4101e', medias: '#d4101e', botas: '#f4f4f4' }),
  city: equipo('Man. City', { vida: 16, velocidad: 56, radio: 12, dano: 5, xp: 2, peso: 0.55, desde: 3 , dispara: { cada: 6, vel: 225, rango: 540 } },
    { c: '#6cabdd', c2: '#ffffff', p: 'liso' }, { pantalon: '#ffffff', medias: '#6cabdd', botas: '#222222' }),
  united: equipo('Man. United', { vida: 55, velocidad: 38, radio: 19, dano: 9, xp: 5, peso: 0.22, desde: 3 },
    { c: '#da291c', c2: '#111111', p: 'mangas' }, { pantalon: '#ffffff', medias: '#111111', botas: '#111111' }),
  chelsea: equipo('Chelsea', { vida: 16, velocidad: 60, radio: 12, dano: 5, xp: 2, peso: 0.5, desde: 4 , dispara: { cada: 6.5, vel: 215, rango: 520 } },
    { c: '#034694', c2: '#ffffff', p: 'liso' }, { pantalon: '#034694', medias: '#ffffff', botas: '#f4f4f4' }),
  arsenal: equipo('Arsenal', { vida: 13, velocidad: 72, radio: 11, dano: 4, xp: 2, peso: 0.5, desde: 4 , embiste: { cada: 6, mult: 2.2, dur: 0.6 } },
    { c: '#ef0107', c2: '#ffffff', p: 'mangas' }, { pantalon: '#ffffff', medias: '#ef0107', botas: '#222222' }),
  juventus: equipo('Juventus', { vida: 24, velocidad: 56, radio: 13, dano: 6, xp: 3, peso: 0.45, desde: 5 , dispara: { cada: 7.5, vel: 220, rango: 520 } },
    { c: '#111111', c2: '#ffffff', p: 'franjas' }, { pantalon: '#111111', medias: '#ffffff', botas: '#111111' }),
  milan: equipo('Milan', { vida: 26, velocidad: 54, radio: 13, dano: 6, xp: 3, peso: 0.45, desde: 5 , dispara: { cada: 7.5, vel: 220, rango: 520 } },
    { c: '#fb090b', c2: '#111111', p: 'franjas' }, { pantalon: '#111111', medias: '#fb090b', botas: '#222222' }),
  inter: equipo('Inter', { vida: 26, velocidad: 57, radio: 13, dano: 6, xp: 3, peso: 0.45, desde: 6 , dispara: { cada: 6, vel: 235, rango: 540 } },
    { c: '#0068a8', c2: '#111111', p: 'franjas' }, { pantalon: '#111111', medias: '#0068a8', botas: '#f4f4f4' }),
  psg: equipo('PSG', { vida: 18, velocidad: 96, radio: 10, dano: 5, xp: 3, peso: 0.4, desde: 6 , embiste: { cada: 5, mult: 2.2, dur: 0.7 } },
    { c: '#00183f', c2: '#e30613', p: 'banda' }, { pantalon: '#00183f', medias: '#00183f', botas: '#f4f4f4' }),
  dortmund: equipo('Dortmund', { vida: 12, velocidad: 108, radio: 10, dano: 4, xp: 2, peso: 0.4, desde: 7 , embiste: { cada: 4, mult: 2.4, dur: 0.8 } },
    { c: '#fde100', c2: '#111111', p: 'liso' }, { pantalon: '#111111', medias: '#fde100', botas: '#111111' }),
  ajax: equipo('Ajax', { vida: 22, velocidad: 66, radio: 12, dano: 5, xp: 3, peso: 0.45, desde: 8 },
    { c: '#ffffff', c2: '#d2122e', p: 'banda' }, { pantalon: '#ffffff', medias: '#ffffff', botas: '#222222' }),
  benfica: equipo('Benfica', { vida: 80, velocidad: 36, radio: 21, dano: 11, xp: 7, peso: 0.2, desde: 8 },
    { c: '#e30613', c2: '#ffffff', p: 'cuello' }, { pantalon: '#ffffff', medias: '#e30613', botas: '#111111' }),
  napoli: equipo('Nápoles', { vida: 34, velocidad: 62, radio: 13, dano: 7, xp: 4, peso: 0.4, desde: 9 , dispara: { cada: 5.5, vel: 240, rango: 560 } },
    { c: '#12a0d7', c2: '#ffffff', p: 'aros' }, { pantalon: '#ffffff', medias: '#12a0d7', botas: '#222222' }),
};

// ---------------------------------------------------------------------------------------------
// Jefes: entrenadores y estrellas de los grandes rivales. Salen cada 5 oleadas, uno tras otro.
// ---------------------------------------------------------------------------------------------

export const ORDEN_JEFES = ['guardiola', 'mourinho', 'cristiano', 'messi'];

export const JEFES = {
  guardiola: {
    nombre: 'Pep Guardiola', equipo: 'FC Barcelona', vida: 500, velocidad: 46, radio: 24, dano: 12, xp: 40, freno: 0.15,
    habilidad: 'Rondo, pases en círculo, tiki-taka y espiral de balones', cada: 7,
    aspecto: {
      piel: '#f0c8a6', pelo: { c: '#3a2a20', e: 'calvo' }, gafas: true,
      camiseta: { c: '#1d2a3c', c2: '#a50044', p: 'traje' }, pantalon: '#1d2a3c', medias: '#1d2a3c', botas: '#111111', corbata: '#a50044',
    },
  },
  mourinho: {
    nombre: 'José Mourinho', equipo: 'Real Madrid', vida: 800, velocidad: 40, radio: 28, dano: 15, xp: 50, freno: 0.1,
    habilidad: 'Autobús: ondas de choque, muro de defensas y embestida', cada: 6, radioPulso: 210,
    aspecto: {
      piel: '#e0b08a', pelo: { c: '#9a9a9a', e: 'corto' }, barba: 'rgba(90,90,90,0.55)',
      camiseta: { c: '#111111', c2: '#ffffff', p: 'traje' }, pantalon: '#111111', medias: '#111111', botas: '#111111', corbata: '#7b3fa0',
    },
  },
  cristiano: {
    nombre: 'Cristiano Ronaldo', equipo: 'Real Madrid', vida: 600, velocidad: 58, radio: 24, dano: 14, xp: 45, freno: 0.15,
    habilidad: 'Cañonazos, ráfagas y el salto «Siuuu»', cada: 2.6,
    aspecto: {
      piel: '#e2b48c', pelo: { c: '#16110d', e: 'tupe' },
      camiseta: { c: '#fafafa', c2: '#7b3fa0', p: 'cuello' }, pantalon: '#fafafa', medias: '#fafafa', botas: '#f2c94c',
    },
  },
  messi: {
    nombre: 'Leo Messi', equipo: 'FC Barcelona', vida: 400, velocidad: 78, radio: 20, dano: 13, xp: 45, freno: 0.2,
    habilidad: 'Regates: embestidas encadenadas, rosca y extremos', cada: 3.2,
    aspecto: {
      piel: '#ecc09c', pelo: { c: '#5a3a22', e: 'corto' }, barba: '#5a3a22',
      camiseta: { c: '#a50044', c2: '#004d98', p: 'franjas' }, pantalon: '#004d98', medias: '#a50044', botas: '#111111',
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Armas. `tipo`: 'disparo' (el portero no puede usarlas) o 'cuerpo'. Índice 0 = nivel 1.
// ---------------------------------------------------------------------------------------------

export const ARMAS = {
  balon: {
    nombre: 'Balón de reglamento', tipo: 'disparo', icono: 'balon',
    descripcion: 'Chuta balones a los rivales más cercanos.',
    niveles: [
      { cd: 1.0, n: 1, dano: 8, perfora: 1 },
      { cd: 0.9, n: 2, dano: 8, perfora: 1 },
      { cd: 0.85, n: 2, dano: 11, perfora: 2 },
      { cd: 0.75, n: 3, dano: 11, perfora: 2 },
      { cd: 0.6, n: 4, dano: 14, perfora: 3 },
    ],
    mejoras: ['Un balón más', 'Más daño y atraviesa un rival más', 'Un balón más', 'Más daño, atraviesa y chuta más rápido'],
  },
  canonazo: {
    nombre: 'Cañonazo de falta', tipo: 'disparo', icono: 'canon',
    descripcion: 'Un chutazo enorme que atraviesa a muchos rivales y los lanza por los aires.',
    niveles: [
      { cd: 3.2, dano: 34, perfora: 4, r: 12 },
      { cd: 2.9, dano: 44, perfora: 5, r: 13 },
      { cd: 2.6, dano: 56, perfora: 6, r: 14 },
      { cd: 2.3, dano: 70, perfora: 8, r: 15 },
      { cd: 1.9, dano: 95, perfora: 12, r: 17 },
    ],
    mejoras: ['Más daño', 'Más daño y atraviesa más', 'Más daño y atraviesa más', 'Mucho más daño y dispara más rápido'],
  },
  corner: {
    nombre: 'Saque de esquina', tipo: 'disparo', icono: 'esquina',
    descripcion: 'Lanza balones en todas las direcciones a la vez.',
    niveles: [
      { cd: 3.6, n: 6, dano: 8, perfora: 1 },
      { cd: 3.3, n: 8, dano: 9, perfora: 1 },
      { cd: 3.0, n: 10, dano: 11, perfora: 1 },
      { cd: 2.7, n: 12, dano: 13, perfora: 2 },
      { cd: 2.3, n: 16, dano: 16, perfora: 2 },
    ],
    mejoras: ['Más balones y daño', 'Más balones y daño', 'Más balones, daño y atraviesan', 'Muchos más balones y más rápido'],
  },
  efecto: {
    nombre: 'Balón con efecto', tipo: 'disparo', icono: 'efecto',
    descripcion: 'Balones teledirigidos que persiguen a un rival hasta darle.',
    niveles: [
      { cd: 1.8, n: 1, dano: 11 },
      { cd: 1.6, n: 2, dano: 11 },
      { cd: 1.4, n: 2, dano: 14 },
      { cd: 1.2, n: 3, dano: 14 },
      { cd: 0.9, n: 4, dano: 18 },
    ],
    mejoras: ['Un balón más', 'Más daño', 'Un balón más', 'Un balón más, más daño y más rápido'],
  },
  bufanda: {
    nombre: 'Bufanda rojiblanca', tipo: 'cuerpo', icono: 'bufanda',
    descripcion: 'Un latigazo de bufanda golpea a todos los que tengas delante.',
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
    nombre: 'Banderines de córner', tipo: 'cuerpo', icono: 'banderin',
    descripcion: 'Banderines que giran a tu alrededor y empujan a quien se acerca.',
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
    nombre: 'Cántico de la grada', tipo: 'cuerpo', icono: 'megafono',
    descripcion: 'La grada canta y una onda sonora aparta y daña a los rivales.',
    niveles: [
      { cd: 6.0, radio: 120, dano: 10, empuje: 300 },
      { cd: 5.4, radio: 140, dano: 14, empuje: 330 },
      { cd: 4.9, radio: 165, dano: 18, empuje: 360 },
      { cd: 4.3, radio: 190, dano: 24, empuje: 390 },
      { cd: 3.5, radio: 225, dano: 32, empuje: 430 },
    ],
    mejoras: ['Más radio y daño', 'Más radio y daño', 'Más radio, daño y frecuencia', 'Mucho más radio y daño'],
  },
  silbato: {
    nombre: 'Silbato del árbitro', tipo: 'cuerpo', icono: 'silbato',
    descripcion: 'Pitido que ralentiza a todos los rivales cercanos y los hiere un poco.',
    niveles: [
      { cd: 9.0, radio: 280, dano: 4, lento: 2.0 },
      { cd: 8.0, radio: 320, dano: 6, lento: 2.5 },
      { cd: 7.2, radio: 360, dano: 8, lento: 3.0 },
      { cd: 6.5, radio: 420, dano: 11, lento: 3.5 },
      { cd: 5.5, radio: 520, dano: 15, lento: 4.5 },
    ],
    mejoras: ['Más radio y duración', 'Más radio y duración', 'Más radio, daño y duración', 'Mucho más radio y más a menudo'],
  },
  tarjeta: {
    nombre: 'Tarjeta roja', tipo: 'cuerpo', icono: 'tarjeta',
    descripcion: 'Expulsa a los rivales más fuertes: daño extra según su vida (poco contra jefes).',
    niveles: [
      { cd: 8.0, n: 1, dano: 20, pct: 0.10 },
      { cd: 7.0, n: 1, dano: 28, pct: 0.14 },
      { cd: 6.2, n: 2, dano: 36, pct: 0.18 },
      { cd: 5.4, n: 2, dano: 46, pct: 0.22 },
      { cd: 4.5, n: 3, dano: 60, pct: 0.28 },
    ],
    mejoras: ['Más daño', 'Expulsa a un rival más', 'Más daño', 'Un rival más y más a menudo'],
  },
  var: {
    nombre: 'VAR', tipo: 'cuerpo', icono: 'var',
    descripcion: 'Revisa la jugada: caen rayos sobre varios rivales de la pantalla.',
    niveles: [
      { cd: 5.0, n: 2, dano: 22, radio: 50 },
      { cd: 4.5, n: 3, dano: 28, radio: 55 },
      { cd: 4.1, n: 4, dano: 36, radio: 60 },
      { cd: 3.6, n: 5, dano: 46, radio: 66 },
      { cd: 3.0, n: 6, dano: 60, radio: 74 },
    ],
    mejoras: ['Un rayo más', 'Un rayo más y más daño', 'Un rayo más y más área', 'Un rayo más y mucho más daño'],
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
  espinilleras: { nombre: 'Espinilleras', descripcion: '-6 % de daño recibido por nivel.', icono: 'escudo', porNivel: 0.06 },
  pulmones: { nombre: 'Pulmones de acero', descripcion: 'Tus armas recargan un 7 % más rápido por nivel.', icono: 'viento', porNivel: 0.07 },
};

/** Mejoras sin límite: salen cuando ya tienes casi todo al máximo, así la partida nunca se bloquea. */
export const EXTRAS = {
  dano: { nombre: 'Trabajo extra', descripcion: '+4 % de daño (se acumula sin límite).', icono: 'mas' },
  vida: { nombre: 'Doble sesión', descripcion: '+12 de vida máxima y te cura 12.', icono: 'corazon' },
  vel: { nombre: 'Piernas frescas', descripcion: '+2 % de velocidad (hasta +40 %).', icono: 'bota' },
  xp: { nombre: 'Ojeador', descripcion: '+5 % de experiencia.', icono: 'estrella' },
  recarga: { nombre: 'Ritmo de juego', descripcion: 'Las armas recargan un 2 % más rápido (hasta -55 %).', icono: 'viento' },
};

export const NIVEL_MAXIMO = 5;

/** Experiencia necesaria para pasar del nivel `n` al siguiente. */
export function xpParaSubir(n) {
  return Math.round(5 + (n - 1) * 4 + (n - 1) ** 1.5);
}
