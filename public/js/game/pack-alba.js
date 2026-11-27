// DLC «Albacete Balompié»: jugadores, entrenadores, equipaciones y logros del Alba.
// Es un pack más que se suma al del Atleti (config.js y logros.js lo mezclan con lo suyo): los rivales,
// los jefes, las armas y el equilibrio son los mismos para los dos. Como el resto de las reglas, es lógica
// PURA y la carga también el servidor.
//
// No importa nada de config.js a propósito (config.js importa este fichero): solo define datos.
// Proyecto de aficionado: sin escudos, imágenes ni textos oficiales del club; los muñecos son pixel art propio.

export const PACK_ALBA = {
  clave: 'alba',
  nombre: 'Albacete Balompié',
  corto: 'Alba',
  apodo: 'El Queso Mecánico',
  colores: ['#ffffff', '#111111'],
  dlc: true,
  primera: 'Blanca con pantalón negro: la de toda la vida del Alba.',
};

const BLANCO = '#ffffff';
const NEGRO = '#111111';

/** La primera del Alba: camiseta blanca con cuello negro, pantalón negro y medias blancas. */
const alba = { c: BLANCO, c2: NEGRO, p: 'cuello' };
const jugador = (nombre, posicion, rasgos, resto) => ({
  nombre, posicion, pack: 'alba', ...rasgos, aspecto: { camiseta: alba, pantalon: NEGRO, medias: BLANCO, botas: '#1d1d1d', ...resto },
});

/**
 * Mismas reglas que los del Atleti (ver PERSONAJES en config.js): las estadísticas salen de la posición,
 * `mods` son pequeños retoques y el número de habilidades depende de la rareza (Común 8-9, Raro 10-11,
 * Épico 12-13 y Leyenda 14-16).
 */
export const PERSONAJES_ALBA = {
  // ---- Porteros ----
  jfmolina: jugador('José Francisco Molina', 'portero', {
    estilo: 'Portero seguro y valiente que también sabía jugar con los pies.', armaInicial: 'barrera', mods: { vida: 1.05 },
    habilidades: ['bufanda', 'banderines', 'canticos', 'silbato', 'tarjeta', 'var', 'cabezazo', 'barrera', 'despeje', 'contragolpe', 'fueraDeJuego'],
  }, {
    piel: '#e8bb94', pelo: { c: '#2b1b12', e: 'corto' }, estatura: 'alta', cara: 'cuadrada', cejas: true,
    camiseta: { c: '#2e8b57', c2: NEGRO, p: 'cuello' }, pantalon: NEGRO, medias: NEGRO, botas: '#ffffff', guantes: '#ffd84a',
  }),
  keylor: jugador('Keylor Navas', 'portero', {
    estilo: 'Reflejos felinos: vuela de palo a palo y sale a por todo.', armaInicial: 'barrera', mods: { vida: 1.04, vel: 1.03 },
    habilidades: ['bufanda', 'banderines', 'canticos', 'silbato', 'cabezazo', 'barrera', 'despeje', 'entrada', 'contragolpe', 'champions'],
  }, {
    piel: '#c68642', pelo: { c: '#111111', e: 'rapado' }, barba: '#111111', estiloBarba: 'corta', gesto: 'sonrisa', complexion: 'delgada',
    camiseta: { c: '#ff7a1a', c2: NEGRO, p: 'cuello' }, pantalon: NEGRO, medias: '#ff7a1a', botas: '#111111', guantes: '#ffffff',
  }),
  tomeu: jugador('Tomeu Nadal', 'portero', {
    estilo: 'Portero sobrio y de la casa: pocas florituras y mucha cabeza.', armaInicial: 'cabezazo', mods: { vida: 0.97 },
    habilidades: ['bufanda', 'banderines', 'canticos', 'silbato', 'tarjeta', 'cabezazo', 'barrera', 'despeje', 'ola'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#5a3a20', e: 'degradado' }, barba: '#5a3a20', estiloBarba: 'completa', estatura: 'alta',
    camiseta: { c: '#6a3fa0', c2: BLANCO, p: 'cuello' }, pantalon: '#6a3fa0', medias: '#6a3fa0', botas: '#ffcc00', guantes: '#7cff4d',
  }),

  // ---- Defensas ----
  coco: jugador('Coco', 'defensa', {
    estilo: 'Pieza del Queso Mecánico: serio, ordenado y durísimo al cruce.', armaInicial: 'despeje', mods: { vida: 1.08, cuerpo: 1.1 },
    habilidades: ['bufanda', 'presion', 'cabezazo', 'entrada', 'barrera', 'despeje', 'tarjeta', 'silbato', 'var', 'contragolpe', 'balon', 'canonazo', 'fueraDeJuego'],
  }, {
    piel: '#e0ac84', pelo: { c: '#1a1410', e: 'ondulado' }, barba: '#1a1410', estiloBarba: 'perilla', cara: 'cuadrada', complexion: 'ancha', botas: '#111111',
  }),
  geli: jugador('Delfí Geli', 'defensa', {
    estilo: 'Lateral con recorrido: sube, centra y vuelve a tiempo para tapar su banda.', armaInicial: 'entrada', mods: { vel: 1.04, vida: 1.03 },
    habilidades: ['bufanda', 'entrada', 'regate', 'pared', 'balon', 'efecto', 'corner', 'vaselina', 'canonazo', 'contragolpe', 'volea', 'presion'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#4a3320', e: 'largo' }, cara: 'fina', complexion: 'delgada', botas: '#111111',
  }),
  denia: jugador('Santi Denia', 'defensa', {
    estilo: 'Central de la tierra: colocación, anticipación y buen juego aéreo.', armaInicial: 'cabezazo', mods: { vida: 1.06 },
    habilidades: ['bufanda', 'fueraDeJuego', 'cabezazo', 'entrada', 'barrera', 'despeje', 'tarjeta', 'var', 'canonazo', 'balon', 'contragolpe'],
  }, {
    piel: '#e8bb94', pelo: { c: '#2b1b12', e: 'raya' }, cejas: true, estatura: 'alta', botas: '#ffffff',
  }),
  vallejo: jugador('Jesús Vallejo', 'defensa', {
    estilo: 'Central rápido y con oficio: corta a la carrera y saca el balón limpio.', armaInicial: 'entrada', mods: { vel: 1.05, vida: 0.96 },
    habilidades: ['bufanda', 'banderines', 'cabezazo', 'entrada', 'despeje', 'barrera', 'balon', 'regate', 'presion'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#2b1b12', e: 'tupe' }, barba: 'rgba(43,27,18,0.45)', estatura: 'alta', botas: '#4aa8ff',
  }),

  // ---- Mediocentros ----
  zalazar: jugador('José Luis Zalazar', 'medio', {
    estilo: 'El motor del Queso Mecánico: llegada, disparo lejano y goles decisivos.', armaInicial: 'canonazo', mods: { disparo: 1.15 },
    habilidades: ['balon', 'canonazo', 'efecto', 'vaselina', 'volea', 'penalti', 'corner', 'pared', 'regate', 'cano', 'carambola', 'champions', 'chilena', 'bufanda', 'canticos'],
  }, {
    piel: '#e0ac84', pelo: { c: '#16110d', e: 'melena' }, barba: '#16110d', estiloBarba: 'candado', brazalete: true, cejas: true, botas: '#111111',
  }),
  catali: jugador('Catali', 'medio', {
    estilo: 'El alma del ascenso: toca, ordena y empuja a los suyos partido tras partido.', armaInicial: 'balon', mods: { vida: 1.04 },
    habilidades: ['balon', 'efecto', 'corner', 'pared', 'vaselina', 'silbato', 'canticos', 'bufanda', 'banderines', 'tarjeta', 'var', 'regate', 'contragolpe', 'volea', 'champions', 'canonazo'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#5a3a20', e: 'rizado' }, barba: 'rgba(90,58,32,0.5)', gesto: 'sonrisa', botas: '#111111',
  }),
  bjelica: jugador('Nenad Bjelica', 'medio', {
    estilo: 'Zurdo con buen guante: combina corto y llega desde la segunda línea.', armaInicial: 'pared', mods: { disparo: 1.06, vel: 1.03 },
    habilidades: ['bufanda', 'entrada', 'cabezazo', 'balon', 'pared', 'regate', 'canonazo', 'volea', 'contragolpe', 'despeje', 'presion'],
  }, {
    piel: '#f7d2b0', pelo: { c: '#c9a050', e: 'corto' }, cara: 'fina', estatura: 'alta', botas: '#f4f4f4',
  }),
  pacheco: jugador('Antonio Pacheco', 'medio', {
    estilo: 'Mediocentro de equilibrio: recupera, toca de primeras y no pierde la posición.', armaInicial: 'pared', mods: { vel: 1.03 },
    habilidades: ['balon', 'efecto', 'pared', 'regate', 'cano', 'vaselina', 'contragolpe', 'ruleta', 'entrada'],
  }, {
    piel: '#e0ac84', pelo: { c: '#1a1410', e: 'gomina' }, barba: '#1a1410', estiloBarba: 'corta', complexion: 'ancha', botas: '#ff3b3b',
  }),

  // ---- Delanteros ----
  morientes: jugador('Fernando Morientes', 'delantero', {
    estilo: 'El Moro: remate de cabeza, desmarque y olfato de gol desde muy joven.', armaInicial: 'cabezazo', mods: { disparo: 1.1, cuerpo: 1.2 },
    habilidades: ['cabezazo', 'penalti', 'balon', 'canonazo', 'chilena', 'volea', 'vaselina', 'corner', 'carambola', 'contragolpe', 'bengala', 'pared', 'regate'],
  }, {
    piel: '#e8bb94', pelo: { c: '#5a3a20', e: 'flequillo' }, edad: 'joven', gesto: 'sonrisa', estatura: 'alta', complexion: 'delgada', botas: '#111111',
  }),
  lopezalfaro: jugador('Antonio López Alfaro', 'delantero', {
    estilo: 'Delantero de los que no perdonan: zurdazos y voleas que acaban dentro.', armaInicial: 'volea', mods: { disparo: 1.12 },
    habilidades: ['canonazo', 'penalti', 'volea', 'chilena', 'vaselina', 'efecto', 'balon', 'corner', 'pared', 'contragolpe', 'regate', 'carambola', 'cano'],
  }, {
    piel: '#e0ac84', pelo: { c: '#2e1c12', e: 'entradas' }, barba: '#2e1c12', estiloBarba: 'corta', nariz: 'grande', cara: 'cuadrada', botas: '#ffffff',
  }),
  zozulia: jugador('Roman Zozulia', 'delantero', {
    estilo: 'Delantero grande y peleón: gana cada balón dividido y remata todo de cabeza.', armaInicial: 'cabezazo', mods: { vida: 1.05, cuerpo: 1.2 },
    habilidades: ['bufanda', 'entrada', 'cabezazo', 'contragolpe', 'regate', 'pared', 'balon', 'volea', 'presion'],
  }, {
    piel: '#f2d4b0', pelo: { c: '#8a6a44', e: 'rapado' }, barba: '#8a6a44', estiloBarba: 'completa', estatura: 'alta', complexion: 'ancha', botas: '#7cff4d',
  }),
};

/** Ficha de cada jugador del Alba: nacionalidad, época en el club y una breve descripción. */
export const FICHAS_ALBA = {
  jfmolina: ['España', 'Años 90', 'Portero de reflejos y personalidad que se hizo un nombre en el Carlos Belmonte antes de dar el salto.'],
  keylor: ['Costa Rica', 'Etapa en el Alba', 'Antes de ser uno de los mejores porteros del mundo, sus paradas ya hacían soñar a la grada del Belmonte.'],
  tomeu: ['España', 'Etapa reciente', 'Portero fiable y regular, de los que dan tranquilidad a toda la defensa en las tardes de Segunda.'],
  coco: ['España', 'Queso Mecánico', 'Defensa del equipo que subió a Primera por primera vez en 1991: orden, oficio y ni un balón perdido.'],
  geli: ['España', 'Queso Mecánico', 'Lateral incansable del Queso Mecánico y de los jugadores más premiados de aquel ascenso histórico.'],
  denia: ['España', 'Años 90', 'Central nacido en Albacete que salió de casa hacia la élite; colocación y juego aéreo de primer nivel.'],
  vallejo: ['España', 'Actualidad', 'Central con experiencia en los grandes escenarios que llegó al Alba para poner calma y velocidad atrás.'],
  zalazar: ['Uruguay', 'Queso Mecánico', 'El uruguayo que encendía el Belmonte: llegada desde atrás, disparo lejano y goles que valían puntos.'],
  catali: ['España', 'Queso Mecánico', 'Uno de los pilares del ascenso de 1991: corazón del centro del campo y referencia del vestuario.'],
  bjelica: ['Croacia', 'Años 90', 'Centrocampista croata zurdo y de buen pie; pieza del Alba que llegó a las semifinales de Copa de 1995.'],
  pacheco: ['España', 'Actualidad', 'Mediocentro del Alba de hoy: equilibrio, orden táctico y mucho trabajo sin balón.'],
  morientes: ['España', 'Años 90', 'Debutó en Primera con el Alba siendo un chaval; de allí salió para convertirse en un goleador de época.'],
  lopezalfaro: ['España', 'Años 90', 'Delantero del Alba de los noventa, de remate rápido y con el gol metido entre ceja y ceja.'],
  zozulia: ['Ucrania', 'Etapa reciente', 'Delantero ucraniano corpulento y luchador, de los que fijan a los centrales y nunca dan un balón por perdido.'],
};

/** Rareza según lo que fue cada uno EN EL ALBA (las leyendas son las del Queso Mecánico). */
export const RAREZA_ALBA = {
  leyenda: ['zalazar', 'catali'],
  epico: ['coco', 'geli', 'morientes', 'lopezalfaro'],
  raro: ['jfmolina', 'keylor', 'denia', 'bjelica'],
  comun: ['tomeu', 'vallejo', 'pacheco', 'zozulia'],
};

/** Camisetas de las selecciones que no tenía el pack del Atleti (para la final del Mundial). */
export const SELECCIONES_ALBA = {
  'Costa Rica': { camiseta: { c: '#d0102b', c2: '#1b3f8f', p: 'cuello' }, pantalon: '#1b3f8f', medias: '#ffffff', colores: ['#d0102b', '#ffffff', '#1b3f8f'] },
  Ucrania: { camiseta: { c: '#ffd500', c2: '#0057b7', p: 'cuello' }, pantalon: '#0057b7', medias: '#ffd500', colores: ['#ffd500', '#0057b7'] },
};

/**
 * Entrenadores del Alba. Usan los mismos dos tipos de ulti que los del Atleti (ver ulti.js):
 * `onda` (golpe en área y bonus de daño, como la del Cholo) y `furia` (recarga doble, velocidad e imán, como la de Luis).
 */
export const ENTRENADORES_ALBA = {
  floro: {
    nombre: 'Benito Floro', apodo: 'El Profesor', pack: 'alba',
    mult: { dano: 1.05, vida: 1, vel: 1.05, xp: 1 },
    resumen: '+5 % de daño y +5 % de velocidad.',
    ulti: {
      tipo: 'onda',
      nombre: '¡Queso Mecánico!',
      descripcion: 'El equipo funciona como un reloj: onda que daña y aparta a todos y +25 % de daño durante 6 s.',
      radio: 600, dano: 65, danoPorNivel: 2, empuje: 400, animo: 6, bonoDano: 1.25,
    },
    aspecto: {
      piel: '#e8bb94', pelo: { c: '#9a9a9a', e: 'raya' }, gafas: true, edad: 'mayor', cara: 'cuadrada',
      camiseta: { c: '#1c1c22', c2: '#ffffff', p: 'traje' }, pantalon: '#1c1c22', medias: '#1c1c22', botas: '#0b0c10', corbata: '#d4af37', camisa: '#ffffff',
    },
  },
  ferrando: {
    nombre: 'César Ferrando', apodo: 'El del ascenso', pack: 'alba',
    mult: { dano: 1, vida: 1.1, vel: 1, xp: 1.08 },
    resumen: '+10 % de vida y +8 % de experiencia.',
    ulti: {
      tipo: 'furia',
      nombre: 'Noche en el Belmonte',
      descripcion: 'La grada empuja: durante 7 s tus armas recargan el doble de rápido, vas un 20 % más veloz y atraes la experiencia desde lejos.',
      duracion: 7, bonoVel: 1.2, iman: 3,
    },
    aspecto: {
      piel: '#e0ac84', pelo: { c: '#6a6a6a', e: 'calvo' }, barba: '#6a6a6a', estiloBarba: 'corta', cejas: true, gesto: 'ceno',
      camiseta: { c: '#3a3d46', c2: '#ffffff', p: 'traje' }, pantalon: '#3a3d46', medias: '#3a3d46', botas: '#1d1d1d', corbata: '#111111', camisa: '#d8d8d8',
    },
  },
};

/** Lemas de los entrenadores del Alba para los consejos del menú (frases del juego, no citas textuales). */
export const LEMAS_ALBA = {
  floro: 'Orden, presión y paciencia: si cada uno hace lo suyo, la máquina funciona.',
  ferrando: 'En el Belmonte no se rinde nadie: se corre hasta el último minuto.',
};

/** Equipaciones del Alba (la primera es la blanca de cada jugador). Cada una se desbloquea con un logro de LOGROS_ALBA. */
export const EQUIPACIONES_ALBA = {
  albaSegunda: {
    nombre: 'Segunda del Alba', descripcion: 'Negra con detalles dorados, para las noches grandes.', pack: 'alba',
    kit: { camiseta: { c: '#151515', c2: '#d4af37', p: 'cuello' }, pantalon: '#151515', medias: '#151515' },
  },
  albaTercera: {
    nombre: 'Tercera granate', descripcion: 'Granate con cuello blanco, para salir de casa con personalidad.', pack: 'alba',
    kit: { camiseta: { c: '#7a1f2b', c2: '#ffffff', p: 'cuello' }, pantalon: '#7a1f2b', medias: '#7a1f2b' },
  },
  albaQueso: {
    nombre: 'Queso Mecánico 91', descripcion: 'Blanca con una banda negra, homenaje retro al equipo del primer ascenso.', pack: 'alba',
    kit: { camiseta: { c: '#ffffff', c2: '#111111', p: 'banda' }, pantalon: '#111111', medias: '#ffffff' },
  },
};

const delAlba = (clave) => Object.hasOwn(PERSONAJES_ALBA, clave);
const conEntrenadorDelAlba = (clave) => Object.hasOwn(ENTRENADORES_ALBA, clave);

/** Logros del Alba, cada uno con un dato curioso de la historia del club (mismo formato que LOGROS en logros.js). */
export const LOGROS_ALBA = {
  quesoMecanico: {
    nombre: 'El Queso Mecánico', icono: 'reloj', como: 'Aguanta 10 minutos con un jugador del Alba.', pack: 'alba',
    dato: 'El Alba subió a Primera División por primera vez en la temporada 1990-91, con Benito Floro en el banquillo.',
    comprobar: (r) => delAlba(r.personaje) && r.tiempo >= 600, servidor: (r) => delAlba(r.personaje) && r.tiempo >= 598, camiseta: 'albaSegunda',
  },
  septimo: {
    nombre: 'Séptimos en Primera', icono: 'pizarra', como: 'Vence a 3 jefes en una partida con un entrenador del Alba.', pack: 'alba',
    dato: 'En su primera temporada en Primera, la 1991-92, el Alba terminó en un sorprendente séptimo puesto.',
    comprobar: (r) => conEntrenadorDelAlba(r.entrenador) && r.jefes >= 3, servidor: (r) => conEntrenadorDelAlba(r.entrenador) && r.jefes >= 3, camiseta: 'albaTercera',
  },
  gigantes: {
    nombre: 'Tumbagigantes', icono: 'trofeo', como: 'Vence a 5 jefes en una partida con un jugador del Alba.', pack: 'alba',
    dato: 'En enero de 2026 el Alba eliminó al Real Madrid de la Copa del Rey con un 3-2 y se plantó en cuartos de final.',
    comprobar: (r) => delAlba(r.personaje) && r.jefes >= 5, servidor: (r) => delAlba(r.personaje) && r.jefes >= 5,
  },
  semifinal95: {
    nombre: 'Semifinal del 95', icono: 'camiseta', como: 'Ten 8 jugadores del Alba en tu plantilla.', tipo: 'club', pack: 'alba',
    dato: 'En la temporada 1994-95 el Alba llegó a las semifinales de la Copa del Rey, su mejor actuación en el torneo.',
    club: (p) => Object.keys(p.jugadores).filter(delAlba).length >= 8, camiseta: 'albaQueso',
  },
};
