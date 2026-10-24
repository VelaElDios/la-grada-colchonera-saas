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

// Biomas del campo: cambian cada pocos pasos y deciden cuántas estructuras (gradas, corrales, pasillos…) hay.
export const BIOMAS = {
  abierto: { peso: 0.3, estructura: 0.4, focos: 0, lluvia: 0.2, barro: 0.14, pesos: { foco: 0.2, hilera: 0.3, muralla: 0.25, banquillos: 0.1, miniCampo: 0.15 } },
  estadio: { peso: 0.3, estructura: 0.92, focos: 0.45, lluvia: 0.1, barro: 0.06, pesos: { muralla: 0.28, corral: 0.32, pasillo: 0.28, hilera: 0.12 } },
  cantera: { peso: 0.2, estructura: 0.6, focos: 0.2, lluvia: 0.06, barro: 0.4, pesos: { hilera: 0.25, foco: 0.1, corral: 0.25, muralla: 0.2, pasillo: 0.2 } },
  entrenamiento: { peso: 0.2, estructura: 0.75, focos: 0.1, lluvia: 0.14, barro: 0.1, pesos: { miniCampo: 0.4, banquillos: 0.2, hilera: 0.2, foco: 0.1, muralla: 0.1 } },
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

const atleti = { c: ROJO, c2: BLANCO, p: 'franjas' };
const jugador = (nombre, posicion, rasgos, resto) => ({ nombre, posicion, ...rasgos, aspecto: { camiseta: atleti, pantalon: AZUL, medias: ROJO, botas: '#1d1d1d', ...resto } });

/**
 * `habilidades`: las armas que ese jugador puede aprender (entre 8 y 16: los mejores tienen más).
 * `mods`: pequeños retoques sobre las estadísticas de su posición. `estilo`: cómo juega.
 * `armaInicial`: con qué sale al campo (siempre está en su lista de habilidades).
 */
export const PERSONAJES = {
  oblak: jugador('Oblak', 'portero', {
    estilo: 'El muro del Metropolitano: aguanta de todo y sabe ponerse de escudo.', armaInicial: 'bufanda', mods: { vida: 1.05 },
    habilidades: ['bufanda', 'banderines', 'canticos', 'silbato', 'tarjeta', 'var', 'cabezazo', 'barrera', 'despeje', 'entrada', 'contragolpe'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#2b1b12', e: 'corto' },
    camiseta: { c: '#d8e43a', c2: '#111111', p: 'cuello' }, pantalon: '#111111', medias: '#111111', botas: '#ff7bb0', guantes: '#ff7a1a',
  }),
  musso: jugador('Musso', 'portero', {
    estilo: 'Portero ágil que saca rápido: más veloz, y con la barrera como especialidad.', armaInicial: 'cabezazo', mods: { vida: 0.96, vel: 1.04 },
    habilidades: ['bufanda', 'banderines', 'canticos', 'silbato', 'tarjeta', 'cabezazo', 'barrera', 'despeje', 'contragolpe'],
  }, {
    piel: '#e0ac84', pelo: { c: '#1a1410', e: 'corto' }, barba: 'rgba(40,30,25,0.55)',
    camiseta: { c: '#2e6bd1', c2: '#111111', p: 'cuello' }, pantalon: '#111111', medias: '#111111', botas: '#ffcc00', guantes: '#ffffff',
  }),

  godin: jugador('Godín', 'defensa', {
    estilo: 'El patrón de la zaga: cabezazos, entradas y un muro que no se mueve.', armaInicial: 'bufanda', mods: { vida: 1.08, cuerpo: 1.1 },
    habilidades: ['bufanda', 'banderines', 'canticos', 'silbato', 'tarjeta', 'var', 'cabezazo', 'entrada', 'barrera', 'despeje', 'contragolpe', 'balon', 'canonazo'],
  }, {
    piel: '#e0ac84', pelo: { c: '#3a2214', e: 'largo' }, barba: '#3a2214',
  }),
  lenglet: jugador('Lenglet', 'defensa', {
    estilo: 'Central zurdo que despeja y saca el balón jugado desde atrás.', armaInicial: 'despeje', mods: { vida: 1.0, disparo: 1.15 },
    habilidades: ['bufanda', 'banderines', 'cabezazo', 'entrada', 'barrera', 'despeje', 'tarjeta', 'balon', 'canonazo', 'pared'],
  }, {
    piel: '#e8bb94', pelo: { c: '#2b1b12', e: 'corto' }, barba: '#2b1b12',
  }),
  pubill: jugador('Pubill', 'defensa', {
    estilo: 'Joven y con piernas: rápido para ser central, listo para cortar.', armaInicial: 'entrada', mods: { vida: 0.95, vel: 1.06 },
    habilidades: ['bufanda', 'banderines', 'cabezazo', 'entrada', 'despeje', 'barrera', 'balon', 'regate'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#3a2214', e: 'corto' },
  }),
  molina: jugador('Nahuel Molina', 'defensa', {
    estilo: 'Lateral incansable: sube y baja la banda sin parar.', armaInicial: 'entrada', mods: { vel: 1.07, vida: 0.98 },
    habilidades: ['bufanda', 'banderines', 'entrada', 'regate', 'contragolpe', 'pared', 'balon', 'volea', 'corner', 'despeje'],
  }, {
    piel: '#e0ac84', pelo: { c: '#16110d', e: 'corto' }, barba: 'rgba(22,17,13,0.5)', botas: '#00c2a8',
  }),
  grimaldo: jugador('Grimaldo', 'defensa', {
    estilo: 'Lateral zurdo con guante en la pierna: centros, faltas y regates.', armaInicial: 'balon', mods: { vel: 1.04, disparo: 1.15, vida: 0.97 },
    habilidades: ['bufanda', 'entrada', 'regate', 'pared', 'balon', 'efecto', 'canonazo', 'corner', 'vaselina', 'contragolpe', 'volea', 'cano'],
  }, {
    piel: '#e8bb94', pelo: { c: '#16110d', e: 'gomina' }, barba: '#16110d', botas: '#ffffff',
  }),

  koke: jugador('Koke', 'medio', {
    estilo: 'El capitán: de todo un poco y mejor cuanto más juega.', armaInicial: 'balon', mods: { vida: 1.03 },
    habilidades: ['balon', 'efecto', 'corner', 'pared', 'vaselina', 'silbato', 'canticos', 'bufanda', 'banderines', 'tarjeta', 'var', 'regate', 'contragolpe', 'volea'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#6b4423', e: 'corto' }, botas: '#f4f4f4',
  }),
  llorente: jugador('Marcos Llorente', 'medio', {
    estilo: 'Un pulmón de acero: arranques, entradas y disparos de media distancia.', armaInicial: 'entrada', mods: { vel: 1.07, vida: 1.05 },
    habilidades: ['bufanda', 'banderines', 'entrada', 'cabezazo', 'despeje', 'contragolpe', 'regate', 'pared', 'balon', 'canonazo', 'volea', 'corner'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#6b4a2a', e: 'tupe' }, botas: '#ff3b3b',
  }),
  barrios: jugador('Pablo Barrios', 'medio', {
    estilo: 'Mediocentro con clase: toques, regates y pases de pizarra.', armaInicial: 'pared', mods: { disparo: 1.05, vel: 1.02 },
    habilidades: ['balon', 'efecto', 'pared', 'regate', 'cano', 'vaselina', 'contragolpe', 'bufanda', 'entrada', 'silbato', 'volea'],
  }, {
    piel: '#e0ac84', pelo: { c: '#1a1410', e: 'rizado' }, botas: '#4aa8ff',
  }),
  lee: jugador('Kang-in Lee', 'medio', {
    estilo: 'Zurdo técnico y desequilibrante: caños, vaselinas y mucho regate.', armaInicial: 'volea', mods: { vel: 1.05, disparo: 1.08, vida: 0.92 },
    habilidades: ['balon', 'efecto', 'vaselina', 'regate', 'cano', 'pared', 'corner', 'volea', 'canticos', 'contragolpe', 'canonazo'],
  }, {
    piel: '#f2d4b0', pelo: { c: '#111111', e: 'tupe' }, botas: '#ffd84a',
  }),

  griezmann: jugador('Griezmann', 'delantero', {
    estilo: 'El mejor del equipo: un repertorio enorme de tiros, regates y trucos.', armaInicial: 'balon', mods: { disparo: 1.1 },
    habilidades: ['balon', 'efecto', 'corner', 'vaselina', 'chilena', 'volea', 'penalti', 'canonazo', 'pared', 'regate', 'contragolpe', 'cano', 'bufanda', 'tarjeta', 'silbato', 'var'],
  }, {
    piel: '#f7d2b0', pelo: { c: '#d9b24c', e: 'tupe' }, botas: '#ff8a00',
  }),
  torres: jugador('Fernando Torres', 'delantero', {
    estilo: 'El Niño: velocidad, chilenas y cabezazos al segundo palo.', armaInicial: 'chilena', mods: { vel: 1.05, disparo: 1.1 },
    habilidades: ['balon', 'canonazo', 'volea', 'chilena', 'penalti', 'cabezazo', 'contragolpe', 'regate', 'efecto', 'corner', 'bufanda', 'vaselina', 'pared'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#6b4a2a', e: 'largo' }, botas: '#f4f4f4',
  }),
  lookman: jugador('Lookman', 'delantero', {
    estilo: 'Extremo eléctrico: regates y arrancadas por la banda.', armaInicial: 'balon', mods: { vel: 1.09, vida: 0.92 },
    habilidades: ['regate', 'cano', 'pared', 'balon', 'efecto', 'volea', 'vaselina', 'contragolpe', 'corner', 'chilena'],
  }, {
    piel: '#8d5524', pelo: { c: '#111111', e: 'rapado' }, botas: '#ff8a00',
  }),
  giuliano: jugador('Giuliano Simeone', 'delantero', {
    estilo: 'Pura intensidad: presiona, corre y se mete en todos los charcos.', armaInicial: 'bufanda', mods: { vel: 1.06, cuerpo: 1.4, vida: 1.06 },
    habilidades: ['bufanda', 'banderines', 'entrada', 'cabezazo', 'contragolpe', 'regate', 'pared', 'balon', 'volea', 'corner'],
  }, {
    piel: '#e0ac84', pelo: { c: '#3a2214', e: 'corto' }, barba: 'rgba(58,34,20,0.5)', botas: '#7cff4d',
  }),
  julian: jugador('Julián Álvarez', 'delantero', {
    estilo: 'La Araña: presiona y remata con las dos piernas.', armaInicial: 'balon', mods: { vel: 1.05, disparo: 1.1 },
    habilidades: ['balon', 'efecto', 'volea', 'chilena', 'vaselina', 'penalti', 'pared', 'regate', 'contragolpe', 'corner', 'canonazo', 'cano', 'tarjeta', 'var'],
  }, {
    piel: '#e0ac84', pelo: { c: '#16110d', e: 'corto' }, botas: '#4aa8ff',
  }),
  costa: jugador('Diego Costa', 'delantero', {
    estilo: 'Un delantero de los de antes: golpea, empuja y marca igual.', armaInicial: 'cabezazo', mods: { vida: 1.18, cuerpo: 1.45, vel: 0.97 },
    habilidades: ['bufanda', 'cabezazo', 'entrada', 'tarjeta', 'balon', 'canonazo', 'chilena', 'volea', 'penalti', 'banderines', 'silbato', 'barrera'],
  }, {
    piel: '#c68642', pelo: { c: '#16110d', e: 'rapado' }, barba: '#16110d', botas: '#ffffff',
  }),
  forlan: jugador('Forlán', 'delantero', {
    estilo: 'Zurdazo y volea: pocos tiros, pero a la escuadra.', armaInicial: 'volea', mods: { disparo: 1.18 },
    habilidades: ['canonazo', 'penalti', 'volea', 'chilena', 'vaselina', 'efecto', 'balon', 'corner', 'pared', 'contragolpe', 'regate', 'canticos'],
  }, {
    piel: '#f2c6a0', pelo: { c: '#d9b24c', e: 'largo' }, botas: '#f4f4f4',
  }),
  falcao: jugador('Falcao', 'delantero', {
    estilo: 'El Tigre: cabezazos y penaltis letales dentro del área.', armaInicial: 'cabezazo', mods: { disparo: 1.12, cuerpo: 1.3 },
    habilidades: ['cabezazo', 'penalti', 'balon', 'canonazo', 'chilena', 'volea', 'vaselina', 'corner', 'entrada', 'contragolpe', 'bufanda', 'tarjeta'],
  }, {
    piel: '#e0ac84', pelo: { c: '#3a2214', e: 'largo' }, barba: '#3a2214', botas: '#111111',
  }),
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

export const ORDEN_JEFES = ['guardiola', 'mourinho', 'cristiano', 'messi', 'vinicius', 'yamal', 'neymar', 'bale', 'benzema', 'suarez'];

export const JEFES = {
  guardiola: {
    desde: 0,
    nombre: 'Pep Guardiola', equipo: 'FC Barcelona', vida: 500, velocidad: 46, radio: 24, dano: 12, xp: 40, freno: 0.15,
    habilidad: 'Rondo, pases en círculo, tiki-taka y espiral de balones', cada: 7,
    aspecto: {
      piel: '#f0c8a6', pelo: { c: '#3a2a20', e: 'calvo' }, gafas: true,
      camiseta: { c: '#1d2a3c', c2: '#a50044', p: 'traje' }, pantalon: '#1d2a3c', medias: '#1d2a3c', botas: '#111111', corbata: '#a50044',
    },
  },
  mourinho: {
    desde: 0,
    nombre: 'José Mourinho', equipo: 'Real Madrid', vida: 800, velocidad: 40, radio: 28, dano: 15, xp: 50, freno: 0.1,
    habilidad: 'Autobús: ondas de choque, muro de defensas y embestida', cada: 6, radioPulso: 210,
    aspecto: {
      piel: '#e0b08a', pelo: { c: '#9a9a9a', e: 'corto' }, barba: 'rgba(90,90,90,0.55)',
      camiseta: { c: '#111111', c2: '#ffffff', p: 'traje' }, pantalon: '#111111', medias: '#111111', botas: '#111111', corbata: '#7b3fa0',
    },
  },
  cristiano: {
    desde: 1,
    nombre: 'Cristiano Ronaldo', equipo: 'Real Madrid', vida: 600, velocidad: 58, radio: 24, dano: 14, xp: 45, freno: 0.15,
    habilidad: 'Cañonazos, ráfagas y el salto «Siuuu»', cada: 2.6,
    aspecto: {
      piel: '#e2b48c', pelo: { c: '#16110d', e: 'tupe' },
      camiseta: { c: '#fafafa', c2: '#7b3fa0', p: 'cuello' }, pantalon: '#fafafa', medias: '#fafafa', botas: '#f2c94c',
    },
  },
  messi: {
    desde: 1,
    nombre: 'Leo Messi', equipo: 'FC Barcelona', vida: 400, velocidad: 78, radio: 20, dano: 13, xp: 45, freno: 0.2,
    habilidad: 'Regates: embestidas encadenadas, rosca y extremos', cada: 3.2,
    aspecto: {
      piel: '#ecc09c', pelo: { c: '#5a3a22', e: 'corto' }, barba: '#5a3a22',
      camiseta: { c: '#a50044', c2: '#004d98', p: 'franjas' }, pantalon: '#004d98', medias: '#a50044', botas: '#111111',
    },
  },
  vinicius: {
    desde: 0,
    nombre: 'Vinicius Jr.', equipo: 'Real Madrid', vida: 430, velocidad: 82, radio: 20, dano: 13, xp: 46, freno: 0.2,
    habilidad: 'Embestidas en zigzag, rosca y ráfagas', cada: 3.0,
    aspecto: {
      piel: '#6b4423', pelo: { c: '#111111', e: 'cresta' },
      camiseta: { c: '#fafafa', c2: '#7b3fa0', p: 'cuello' }, pantalon: '#fafafa', medias: '#fafafa', botas: '#7cff4d',
    },
  },
  yamal: {
    desde: 1,
    nombre: 'Lamine Yamal', equipo: 'FC Barcelona', vida: 390, velocidad: 88, radio: 18, dano: 12, xp: 48, freno: 0.2,
    habilidad: 'Rosca, tiki-taka y extremos', cada: 2.8,
    aspecto: {
      piel: '#a56a3c', pelo: { c: '#111111', e: 'rizado' },
      camiseta: { c: '#a50044', c2: '#004d98', p: 'franjas' }, pantalon: '#004d98', medias: '#a50044', botas: '#ffd84a',
    },
  },
  neymar: {
    desde: 2,
    nombre: 'Neymar Jr.', equipo: 'Brasil', vida: 540, velocidad: 64, radio: 22, dano: 14, xp: 52, freno: 0.15,
    habilidad: 'Lluvia de bicicletas, saltos y espirales', cada: 3.0,
    aspecto: {
      piel: '#c68642', pelo: { c: '#d9b24c', e: 'cresta' },
      camiseta: { c: '#f2c200', c2: '#1a7a3a', p: 'cuello' }, pantalon: '#1b3f9c', medias: '#ffffff', botas: '#ff3bd4',
    },
  },
  bale: {
    desde: 2,
    nombre: 'Gareth Bale', equipo: 'Real Madrid', vida: 660, velocidad: 70, radio: 24, dano: 15, xp: 55, freno: 0.12,
    habilidad: 'Cañonazos enormes y arrancadas de velocista', cada: 2.8,
    aspecto: {
      piel: '#f0c8a6', pelo: { c: '#6b4423', e: 'tupe' },
      camiseta: { c: '#fafafa', c2: '#7b3fa0', p: 'cuello' }, pantalon: '#fafafa', medias: '#fafafa', botas: '#1d1d1d',
    },
  },
  benzema: {
    desde: 3,
    nombre: 'Karim Benzema', equipo: 'Real Madrid', vida: 720, velocidad: 52, radio: 24, dano: 15, xp: 56, freno: 0.12,
    habilidad: 'Disparos de precisión, rondos y toques de primera', cada: 2.9,
    aspecto: {
      piel: '#d9a77a', pelo: { c: '#111111', e: 'corto' }, barba: '#111111',
      camiseta: { c: '#fafafa', c2: '#7b3fa0', p: 'cuello' }, pantalon: '#fafafa', medias: '#fafafa', botas: '#d8d8d8',
    },
  },
  suarez: {
    desde: 3,
    nombre: 'Luis Suárez', equipo: 'FC Barcelona', vida: 780, velocidad: 66, radio: 24, dano: 16, xp: 58, freno: 0.1,
    habilidad: 'Mordiscos: embestidas con pulso, murallas y autobús', cada: 3.0, radioPulso: 190,
    aspecto: {
      piel: '#e0ac84', pelo: { c: '#3a2214', e: 'corto' }, barba: '#3a2214',
      camiseta: { c: '#a50044', c2: '#004d98', p: 'franjas' }, pantalon: '#004d98', medias: '#a50044', botas: '#111111',
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Armas. `tipo`: 'disparo' (el portero no puede usarlas), 'cuerpo' o 'movil' (regates y movilidad). Índice 0 = nivel 1.
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
  // --- Cuerpo a cuerpo ---
  cabezazo: {
    nombre: 'Cabezazo', tipo: 'cuerpo', icono: 'cabezazo',
    descripcion: 'Un testarazo corto y brutal contra el rival más cercano: daña, aparta y aturde.',
    niveles: [
      { cd: 2.6, largo: 85, ancho: 0.9, dano: 22, aturde: 0.8 },
      { cd: 2.4, largo: 92, ancho: 1.0, dano: 28, aturde: 1.0 },
      { cd: 2.2, largo: 100, ancho: 1.1, dano: 36, aturde: 1.2 },
      { cd: 2.0, largo: 110, ancho: 1.25, dano: 46, aturde: 1.4 },
      { cd: 1.6, largo: 125, ancho: 1.4, dano: 62, aturde: 1.8 },
    ],
    mejoras: ['Más daño y aturde más', 'Más alcance y daño', 'Más daño y aturde más', 'Mucho más daño, alcance y rapidez'],
  },
  entrada: {
    nombre: 'Entrada rasante', tipo: 'cuerpo', icono: 'entrada',
    descripcion: 'Te deslizas hacia delante llevándote por delante a todos los que cruzas.',
    niveles: [
      { cd: 5.5, largo: 150, ancho: 36, dano: 20, empuje: 380 },
      { cd: 5.0, largo: 170, ancho: 38, dano: 26, empuje: 400 },
      { cd: 4.6, largo: 190, ancho: 40, dano: 34, empuje: 420 },
      { cd: 4.2, largo: 210, ancho: 44, dano: 44, empuje: 450 },
      { cd: 3.4, largo: 240, ancho: 50, dano: 60, empuje: 500 },
    ],
    mejoras: ['Más recorrido y daño', 'Más recorrido y daño', 'Más daño y ancho', 'Mucho más daño y más a menudo'],
  },
  barrera: {
    nombre: 'Barrera defensiva', tipo: 'cuerpo', icono: 'barrera',
    descripcion: 'Una barrera te protege unos segundos: no recibes daño y los balones rivales rebotan.',
    niveles: [
      { cd: 14, dur: 2.0, radio: 60 },
      { cd: 13, dur: 2.5, radio: 64 },
      { cd: 12, dur: 3.0, radio: 70 },
      { cd: 11, dur: 3.6, radio: 76 },
      { cd: 9, dur: 4.5, radio: 84 },
    ],
    mejoras: ['Dura más', 'Dura más y se activa antes', 'Dura más y más grande', 'Dura mucho más y se activa antes'],
  },
  despeje: {
    nombre: 'Despeje', tipo: 'cuerpo', icono: 'despeje',
    descripcion: 'Un patadón en abanico que lanza lejos a los rivales de delante y destruye sus balones.',
    niveles: [
      { cd: 4.0, radio: 150, dano: 14, empuje: 520 },
      { cd: 3.7, radio: 165, dano: 18, empuje: 560 },
      { cd: 3.4, radio: 180, dano: 24, empuje: 600 },
      { cd: 3.0, radio: 200, dano: 32, empuje: 650 },
      { cd: 2.4, radio: 230, dano: 44, empuje: 720 },
    ],
    mejoras: ['Más alcance y daño', 'Más alcance y daño', 'Más daño y fuerza', 'Mucho más alcance y más a menudo'],
  },
  // --- Disparo ---
  vaselina: {
    nombre: 'Vaselina', tipo: 'disparo', icono: 'vaselina',
    descripcion: 'Balones por alto que caen sobre los rivales y explotan en área.',
    niveles: [
      { cd: 3.4, n: 1, dano: 26, radio: 70 },
      { cd: 3.1, n: 2, dano: 26, radio: 72 },
      { cd: 2.9, n: 2, dano: 34, radio: 80 },
      { cd: 2.6, n: 3, dano: 34, radio: 86 },
      { cd: 2.1, n: 4, dano: 46, radio: 100 },
    ],
    mejoras: ['Un balón más', 'Más daño y área', 'Un balón más', 'Un balón más, más daño y más rápido'],
  },
  chilena: {
    nombre: 'Chilena', tipo: 'disparo', icono: 'chilena',
    descripcion: 'Una chilena espectacular: dos balones potentes salen en direcciones opuestas.',
    niveles: [
      { cd: 2.8, dano: 18, perfora: 3, pares: 1 },
      { cd: 2.6, dano: 22, perfora: 3, pares: 1 },
      { cd: 2.4, dano: 26, perfora: 4, pares: 2 },
      { cd: 2.1, dano: 32, perfora: 4, pares: 2 },
      { cd: 1.7, dano: 42, perfora: 6, pares: 3 },
    ],
    mejoras: ['Más daño', 'Un par de balones más', 'Más daño y atraviesa más', 'Un par más, mucho más daño y más rápido'],
  },
  volea: {
    nombre: 'Volea', tipo: 'disparo', icono: 'volea',
    descripcion: 'Una ráfaga de remates de primera contra el rival más cercano.',
    niveles: [
      { cd: 2.2, n: 3, dano: 7 },
      { cd: 2.0, n: 4, dano: 8 },
      { cd: 1.8, n: 5, dano: 9 },
      { cd: 1.6, n: 6, dano: 11 },
      { cd: 1.3, n: 8, dano: 14 },
    ],
    mejoras: ['Un remate más', 'Un remate más', 'Dos remates más y más daño', 'Dos remates más, más daño y más rápido'],
  },
  penalti: {
    nombre: 'Penalti', tipo: 'disparo', icono: 'penalti',
    descripcion: 'Un chut certero al rival más duro de la pantalla: no falla.',
    niveles: [
      { cd: 7.0, dano: 60 },
      { cd: 6.4, dano: 85 },
      { cd: 5.8, dano: 115 },
      { cd: 5.0, dano: 150 },
      { cd: 4.0, dano: 220 },
    ],
    mejoras: ['Más daño', 'Más daño', 'Mucho más daño', 'Daño enorme y se lanza más a menudo'],
  },
  // --- Regates y movilidad ---
  regate: {
    nombre: 'Regate', tipo: 'movil', icono: 'regate',
    descripcion: 'Un quiebro rápido en tu dirección: eres intocable un momento y apartas a quien cruzas.',
    niveles: [
      { cd: 6.0, impulso: 520, invul: 0.45, dano: 8, empuje: 200 },
      { cd: 5.5, impulso: 560, invul: 0.55, dano: 12, empuje: 230 },
      { cd: 5.0, impulso: 600, invul: 0.65, dano: 16, empuje: 260 },
      { cd: 4.5, impulso: 650, invul: 0.75, dano: 22, empuje: 300 },
      { cd: 3.6, impulso: 700, invul: 0.9, dano: 30, empuje: 340 },
    ],
    mejoras: ['Más impulso e invulnerable más rato', 'Más daño e invulnerabilidad', 'Más impulso y daño', 'Mucho más daño y más a menudo'],
  },
  cano: {
    nombre: 'Caño', tipo: 'movil', icono: 'cano',
    descripcion: 'Humillas a los rivales de tu alrededor: se quedan aturdidos un buen rato.',
    niveles: [
      { cd: 8.0, radio: 110, aturde: 1.0, dano: 6 },
      { cd: 7.2, radio: 125, aturde: 1.3, dano: 8 },
      { cd: 6.5, radio: 140, aturde: 1.6, dano: 11 },
      { cd: 5.8, radio: 160, aturde: 1.9, dano: 15 },
      { cd: 4.8, radio: 190, aturde: 2.4, dano: 22 },
    ],
    mejoras: ['Más radio y aturdimiento', 'Más radio y aturdimiento', 'Más radio, daño y aturdimiento', 'Mucho más radio y más a menudo'],
  },
  pared: {
    nombre: 'Pared', tipo: 'movil', icono: 'pared',
    descripcion: 'Un balón que va a por el rival más cercano y vuelve a tus pies, golpeando a la ida y a la vuelta.',
    niveles: [
      { cd: 2.4, n: 1, dano: 10 },
      { cd: 2.2, n: 1, dano: 13 },
      { cd: 2.0, n: 2, dano: 13 },
      { cd: 1.8, n: 2, dano: 17 },
      { cd: 1.4, n: 3, dano: 22 },
    ],
    mejoras: ['Más daño', 'Un balón más', 'Más daño', 'Un balón más, más daño y más rápido'],
  },
  contragolpe: {
    nombre: 'Contragolpe', tipo: 'movil', icono: 'contragolpe',
    descripcion: 'Arrancas a toda velocidad un rato: corres más y pegas más fuerte mientras dura.',
    niveles: [
      { cd: 9.0, dur: 2.5, vel: 0.25, dano: 0.10 },
      { cd: 8.4, dur: 3.0, vel: 0.28, dano: 0.14 },
      { cd: 7.8, dur: 3.5, vel: 0.32, dano: 0.18 },
      { cd: 7.0, dur: 4.0, vel: 0.36, dano: 0.24 },
      { cd: 5.8, dur: 5.0, vel: 0.42, dano: 0.32 },
    ],
    mejoras: ['Dura más y más veloz', 'Dura más y más daño', 'Dura más y más veloz', 'Dura mucho más y se activa antes'],
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


/**
 * Combinaciones («metas»): al juntar ciertas habilidades a cierto nivel se activa un bonus.
 * `requiere`: { habilidad: nivelMínimo }. `distintas`: { cuantas, nivel } = tener N armas distintas a ese nivel.
 * `bonus` (se suman o multiplican en `recalcular`): dano, vel, cd (reduce), armadura, regen, disparo, cuerpo, xp,
 * perfora (+N a los balones), aturde (+segundos) y cdArbitro (recarga de silbato, tarjeta y VAR).
 */
export const SINERGIAS = {
  muro: {
    nombre: 'Muro rojiblanco', icono: 'barrera', requiere: { barrera: 2, cabezazo: 2, despeje: 2 },
    descripcion: '+12 % de resistencia y +15 % de daño cuerpo a cuerpo.', bonus: { armadura: 0.12, cuerpo: 0.15 },
  },
  tikitaka: {
    nombre: 'Tiki-taka', icono: 'pared', requiere: { pared: 3, regate: 2, efecto: 2 },
    descripcion: 'Armas recargan un 10 % más rápido y +8 % de velocidad.', bonus: { cd: 0.10, vel: 0.08 },
  },
  contra: {
    nombre: 'Contraataque letal', icono: 'contragolpe', requiere: { contragolpe: 3, regate: 2, volea: 2 },
    descripcion: '+18 % de daño y +8 % de velocidad.', bonus: { dano: 0.18, vel: 0.08 },
  },
  catenaccio: {
    nombre: 'Catenaccio', icono: 'escudo', requiere: { barrera: 3, tarjeta: 2, silbato: 2 },
    descripcion: '+15 % de resistencia y recuperas 1 de vida por segundo.', bonus: { armadura: 0.15, regen: 1 },
  },
  pichichi: {
    nombre: 'Pichichi', icono: 'penalti', requiere: { penalti: 3, volea: 3, chilena: 2 },
    descripcion: '+30 % de daño de disparo.', bonus: { disparo: 0.30 },
  },
  bombardeo: {
    nombre: 'Bombardeo', icono: 'canon', requiere: { canonazo: 3, corner: 3, vaselina: 2 },
    descripcion: 'Los balones atraviesan a un rival más y +10 % de daño.', bonus: { perfora: 1, dano: 0.10 },
  },
  cholista: {
    nombre: 'Partido a partido', icono: 'bufanda', requiere: { bufanda: 4, banderines: 3, canticos: 3 },
    descripcion: '+30 % de daño cuerpo a cuerpo.', bonus: { cuerpo: 0.30 },
  },
  aereo: {
    nombre: 'Dominio aéreo', icono: 'cabezazo', requiere: { cabezazo: 3, despeje: 3, vaselina: 2 },
    descripcion: 'Aturdes casi un segundo más.', bonus: { aturde: 0.8 },
  },
  arbitro: {
    nombre: 'El árbitro está de nuestra parte', icono: 'var', requiere: { var: 3, tarjeta: 3, silbato: 3 },
    descripcion: 'Silbato, tarjeta y VAR recargan un 30 % más rápido.', bonus: { cdArbitro: 0.30 },
  },
  jugon: {
    nombre: 'Jugón', icono: 'cano', requiere: { regate: 3, cano: 3, pared: 2 },
    descripcion: '+10 % de velocidad y las armas recargan un 8 % más rápido.', bonus: { vel: 0.10, cd: 0.08 },
  },
  doblete: {
    nombre: 'Doblete', icono: 'balon', requiere: { balon: 5, efecto: 5 },
    descripcion: 'Los balones atraviesan a un rival más y +15 % de daño de disparo.', bonus: { perfora: 1, disparo: 0.15 },
  },
  lineaDura: {
    nombre: 'Línea dura', icono: 'entrada', requiere: { entrada: 3, cabezazo: 3, tarjeta: 3 },
    descripcion: '+20 % de daño cuerpo a cuerpo y aturdes medio segundo más.', bonus: { cuerpo: 0.20, aturde: 0.5 },
  },
  balonParado: {
    nombre: 'Balón parado', icono: 'esquina', requiere: { corner: 3, canonazo: 3, efecto: 3 },
    descripcion: '+20 % de daño de disparo.', bonus: { disparo: 0.20 },
  },
  fisico: {
    nombre: 'Preparación física', icono: 'pizarra', requiere: { tactica: 3, pulmones: 3, botas: 3 },
    descripcion: '+10 % de daño y las armas recargan un 8 % más rápido.', bonus: { dano: 0.10, cd: 0.08 },
  },
  leyenda: {
    nombre: 'Leyenda rojiblanca', icono: 'estrella', distintas: { cuantas: 6, nivel: 3 },
    requiere: {}, descripcion: '+10 % de daño, +10 % de experiencia y +5 % de resistencia.', bonus: { dano: 0.10, xp: 0.10, armadura: 0.05 },
  },
  plantilla: {
    nombre: 'Plantilla completa', icono: 'camiseta', distintas: { cuantas: 9, nivel: 1 },
    requiere: {}, descripcion: '+20 % de experiencia.', bonus: { xp: 0.20 },
  },
};

export const NIVEL_MAXIMO = 5;

/** Experiencia necesaria para pasar del nivel `n` al siguiente. */
export function xpParaSubir(n) {
  return Math.round(5 + (n - 1) * 4 + (n - 1) ** 1.5);
}
