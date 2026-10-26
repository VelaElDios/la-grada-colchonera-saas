// Logros (con un dato curioso de la historia del Atleti cada uno) y las equipaciones que desbloquean.
// Es lógica PURA (sin DOM ni red): la usa el cliente para detectarlos durante la partida y el servidor para
// guardarlos en la cuenta (comprueba lo que puede con su propio reloj y los datos de la partida).
//
// Hay dos tipos:
//  · de partida: se consiguen jugando (`comprobar(r)` con el resumen de la partida; `servidor(r)` es la parte
//    que el servidor puede verificar: tiempo, jefes, bajas, jugador y entrenador);
//  · de club: dependen de tu plantilla (`club(perfil)`), los calcula el servidor al fichar o al jugar.

/** Equipaciones (camiseta, pantalón y medias). La primera es la de cada jugador; el resto se desbloquean con logros. */
export const EQUIPACIONES = {
  primera: { nombre: 'Primera', descripcion: 'La rojiblanca de toda la vida.', kit: null },
  segunda: {
    nombre: 'Segunda', descripcion: 'Azul noche con detalles rojos.',
    kit: { camiseta: { c: '#1b2a5c', c2: '#c8102e', p: 'cuello' }, pantalon: '#1b2a5c', medias: '#1b2a5c' },
  },
  tercera: {
    nombre: 'Tercera eléctrica', descripcion: 'Amarillo flúor para que te vean desde la grada.',
    kit: { camiseta: { c: '#d8f03a', c2: '#1b2a5c', p: 'mangas' }, pantalon: '#1b2a5c', medias: '#d8f03a' },
  },
  noche: {
    nombre: 'Noche europea', descripcion: 'Negra, con una banda roja: para las noches de Champions.',
    kit: { camiseta: { c: '#151515', c2: '#c8102e', p: 'banda' }, pantalon: '#151515', medias: '#151515' },
  },
  dorada: {
    nombre: 'Final del Mundial', descripcion: 'Rayas de oro para los que han llegado a lo más alto.',
    kit: { camiseta: { c: '#d4af37', c2: '#fff3b0', p: 'franjas' }, pantalon: '#1b1b1b', medias: '#d4af37' },
  },
  centenario: {
    nombre: 'Centenario 1903', descripcion: 'Azul y blanca, como la del primer Atleti.',
    kit: { camiseta: { c: '#1f5fbf', c2: '#ffffff', p: 'mitad' }, pantalon: '#ffffff', medias: '#1f5fbf' },
  },
  doblete: {
    nombre: 'Doblete del 96', descripcion: 'Rojiblanca con pantalón azul eléctrico, la de Liga y Copa.',
    kit: { camiseta: { c: '#c8102e', c2: '#ffffff', p: 'franjas' }, pantalon: '#1f3f8f', medias: '#c8102e' },
  },
  calderon: {
    nombre: 'Adiós al Calderón', descripcion: 'Rojiblanca con pantalón blanco, para despedir al viejo estadio.',
    kit: { camiseta: { c: '#c8102e', c2: '#ffffff', p: 'franjas' }, pantalon: '#ffffff', medias: '#c8102e' },
  },
  portero: {
    nombre: 'Leyenda bajo palos', descripcion: 'Verde flúor, la de los porteros de leyenda.',
    kit: { camiseta: { c: '#2fe06b', c2: '#111111', p: 'cuello' }, pantalon: '#111111', medias: '#2fe06b' },
  },
  pupas: {
    nombre: 'El Pupas', descripcion: 'Gris tristeza con aros rojos. Para reírse de uno mismo.',
    kit: { camiseta: { c: '#8a8f99', c2: '#c8102e', p: 'aros' }, pantalon: '#5a5f6b', medias: '#8a8f99' },
  },
};

const con = (...claves) => (r) => claves.includes(r.personaje);
const ambiente = (k) => (r) => (r.ambiente ?? 0) >= k;
/** Para el servidor: llegar al ambiente `k` exige haber aguantado k·5 minutos. */
const tiempoDeAmbiente = (k) => (r) => r.tiempo >= k * 300 - 2;
const tieneUltra = (u) => (r) => (r.ultras ?? []).includes(u);
const tieneCombo = (c) => (r) => (r.sinergias ?? []).includes(c);
const y = (...fs) => (r) => fs.every((f) => f(r));
const siempre = () => true;

export const LOGROS = {
  // --- Recorrido por las finales -------------------------------------------------------------
  primerJefe: {
    nombre: 'Primera muesca', icono: 'calavera', como: 'Vence a tu primer jefe.',
    dato: 'El Atleti ganó su primera Liga en 1940, cuando todavía se llamaba Atlético Aviación.',
    comprobar: (r) => r.jefes >= 1, servidor: (r) => r.jefes >= 1, camiseta: 'segunda',
  },
  copa: {
    nombre: 'Camino de la final', icono: 'trofeo', como: 'Llega a la Final de la Copa del Rey (minuto 5).',
    dato: 'El Atleti tiene 10 Copas del Rey. La de 2013 la ganó en el Bernabéu, con un cabezazo de Miranda en la prórroga.',
    comprobar: ambiente(1), servidor: tiempoDeAmbiente(1),
  },
  liga: {
    nombre: 'Campeones de Liga', icono: 'trofeo', como: 'Llega a la Final de Liga (minuto 10).',
    dato: 'El Atleti ha ganado 11 Ligas. La última, la de 2021, se cerró en Valladolid en la última jornada.',
    comprobar: ambiente(2), servidor: tiempoDeAmbiente(2), camiseta: 'tercera',
  },
  champions: {
    nombre: 'Noche europea', icono: 'champions', como: 'Llega a la Final de la Champions (minuto 15).',
    dato: 'El Atleti ha jugado tres finales de la Copa de Europa: 1974, 2014 y 2016.',
    comprobar: ambiente(3), servidor: tiempoDeAmbiente(3), camiseta: 'noche',
  },
  mundial: {
    nombre: 'Final del Mundial', icono: 'mundial', como: 'Llega a la Final del Mundial (minuto 20).',
    dato: 'Griezmann y Lucas Hernández fueron campeones del mundo en 2018 siendo jugadores del Atleti.',
    comprobar: ambiente(4), servidor: tiempoDeAmbiente(4), camiseta: 'dorada',
  },
  // --- Guiños a cada leyenda ------------------------------------------------------------------
  griezmannBalonOro: {
    nombre: 'Tercero en París', icono: 'balonOro', como: 'Consigue la ultra «Ganador del Balón de Oro» con Griezmann.',
    dato: 'Griezmann fue tercero en el Balón de Oro de 2018, el año en que ganó el Mundial y la Europa League con el Atleti. Aquí sí lo gana.',
    comprobar: y(con('griezmann'), tieneUltra('balonOro')), servidor: con('griezmann'),
  },
  forlanBota: {
    nombre: 'Bota de Oro charrúa', icono: 'botaOro', como: 'Consigue la ultra «Bota de Oro histórica» con Forlán.',
    dato: 'Forlán ganó dos Botas de Oro; la segunda, en 2009, con 32 goles de rojiblanco.',
    comprobar: y(con('forlan'), tieneUltra('botaOro')), servidor: con('forlan'),
  },
  hamburgo: {
    nombre: 'Hamburgo, 2010', icono: 'trofeo', como: 'Llega a la Final de la Champions con Forlán o con el Kun.',
    dato: 'Forlán marcó los dos goles de la final de la Europa League de 2010 en Hamburgo; el de la prórroga, con pase del Kun.',
    comprobar: y(con('forlan', 'kun'), ambiente(3)), servidor: y(con('forlan', 'kun'), tiempoDeAmbiente(3)),
  },
  falcaoMonaco: {
    nombre: 'Noche de Mónaco', icono: 'calavera', como: 'Vence a 3 jefes en una partida con Falcao.',
    dato: 'Falcao le hizo un hat-trick al Chelsea en la Supercopa de Europa de 2012, en Mónaco.',
    comprobar: y(con('falcao'), (r) => r.jefes >= 3), servidor: y(con('falcao'), (r) => r.jefes >= 3),
  },
  godinCampNou: {
    nombre: 'El cabezazo del Camp Nou', icono: 'cabezazo', como: 'Consigue la combinación «Dominio aéreo» con Godín.',
    dato: 'Un cabezazo de Godín en el Camp Nou, en la última jornada, dio al Atleti la Liga de 2014.',
    comprobar: y(con('godin'), tieneCombo('aereo')), servidor: con('godin'),
  },
  gabiCapi: {
    nombre: 'Brazalete eterno', icono: 'brazalete', como: 'Consigue la combinación «Capitán eterno» con Gabi.',
    dato: 'Gabi fue el capitán del Atleti campeón de Liga en 2014 y levantó la Europa League de 2018.',
    comprobar: y(con('gabi'), tieneCombo('capitan')), servidor: con('gabi'),
  },
  torresNino: {
    nombre: 'El Niño', icono: 'estrellaLlena', como: 'Llega a la Final de la Copa del Rey con Fernando Torres.',
    dato: 'Torres debutó con el Atleti con 17 años y a los 19 ya era su capitán.',
    comprobar: y(con('torres'), ambiente(1)), servidor: y(con('torres'), tiempoDeAmbiente(1)),
  },
  futreMelena: {
    nombre: 'Del Oporto al Calderón', icono: 'cano', como: 'Consigue la combinación «Jugón» con Futre.',
    dato: 'Futre llegó al Atleti en 1987, recién proclamado campeón de Europa con el Oporto.',
    comprobar: y(con('futre'), tieneCombo('jugon')), servidor: con('futre'),
  },
  doblete96: {
    nombre: 'Doblete del 96', icono: 'trofeo', como: 'Llega a la Final de Liga con Simeone o con Pantić.',
    dato: 'En la 1995-96 el Atleti ganó Liga y Copa; la final de Copa la decidió un cabezazo de Pantić en la prórroga.',
    comprobar: y(con('simeone', 'pantic'), ambiente(2)), servidor: y(con('simeone', 'pantic'), tiempoDeAmbiente(2)), camiseta: 'doblete',
  },
  bernabeu2013: {
    nombre: 'Bernabéu, 2013', icono: 'trofeo', como: 'Llega a la Final de la Copa del Rey con Miranda o con Courtois.',
    dato: 'En la final de Copa de 2013, en el Bernabéu, marcó Miranda en la prórroga y Courtois lo paró todo.',
    comprobar: y(con('miranda', 'courtois'), ambiente(1)), servidor: y(con('miranda', 'courtois'), tiempoDeAmbiente(1)),
  },
  oblakZamora: {
    nombre: 'Cinco Zamoras', icono: 'zamora', como: 'Consigue la ultra «Trofeo Zamora» con Oblak.',
    dato: 'Oblak ganó cinco Trofeos Zamora seguidos, de 2016 a 2020.',
    comprobar: y(con('oblak'), tieneUltra('zamora')), servidor: con('oblak'), camiseta: 'portero',
  },
  costa27: {
    nombre: 'Los 27 de Costa', icono: 'cabezazo', como: 'Elimina a 270 rivales en una partida con Diego Costa.',
    dato: 'Diego Costa marcó 27 goles en la Liga 2013-14, la del título.',
    comprobar: y(con('costa'), (r) => r.bajas >= 270), servidor: y(con('costa'), (r) => r.bajas >= 270),
  },
  julianMundial: {
    nombre: 'La Araña campeona', icono: 'mundial', como: 'Llega a la Final del Mundial con Julián Álvarez.',
    dato: 'Julián Álvarez llegó al Atleti siendo ya campeón del mundo con Argentina.',
    comprobar: y(con('julian'), ambiente(4)), servidor: y(con('julian'), tiempoDeAmbiente(4)),
  },
  adelardo: {
    nombre: 'El récord de Adelardo', icono: 'calavera', como: 'Elimina a 553 rivales en una sola partida.',
    dato: 'Adelardo jugó 553 partidos oficiales con el Atleti: fue el récord del club durante casi medio siglo.',
    comprobar: (r) => r.bajas >= 553, servidor: (r) => r.bajas >= 553,
  },
  // --- Entrenadores ---------------------------------------------------------------------------
  aragonesSabio: {
    nombre: 'El Sabio de Hortaleza', icono: 'pizarra', como: 'Aguanta 10 minutos con Luis Aragonés en el banquillo.',
    dato: 'Luis Aragonés entrenó al Atleti en cuatro etapas distintas y ganó la Eurocopa 2008 con España.',
    comprobar: (r) => r.entrenador === 'aragones' && r.tiempo >= 600, servidor: (r) => r.entrenador === 'aragones' && r.tiempo >= 598,
  },
  partidoAPartido: {
    nombre: 'Partido a partido', icono: 'pizarra', como: 'Aguanta 15 minutos con el Cholo en el banquillo.',
    dato: 'Simeone llegó al banquillo en diciembre de 2011 y es el entrenador con más partidos de la historia del club.',
    comprobar: (r) => r.entrenador === 'cholo' && r.tiempo >= 900, servidor: (r) => r.entrenador === 'cholo' && r.tiempo >= 898,
  },
  // --- Hazañas --------------------------------------------------------------------------------
  muroCholo: {
    nombre: 'El muro', icono: 'escudo', como: 'Aguanta los 5 primeros minutos sin que te toquen.',
    dato: 'En la Liga 2015-16 el Atleti solo encajó 18 goles en 38 partidos.',
    comprobar: (r) => r.tiempo >= 300 && (r.stats?.primerGolpe == null || r.stats.primerGolpe >= 300), servidor: (r) => r.tiempo >= 298,
  },
  primeraUltra: {
    nombre: 'Poder de leyenda', icono: 'estrellaLlena', como: 'Consigue tu primera ULTRA.',
    dato: 'El primer título europeo del Atleti fue la Recopa de 1962.',
    comprobar: (r) => (r.ultras ?? []).length >= 1, servidor: siempre,
  },
  tresUltras: {
    nombre: 'Leyenda total', icono: 'estrellaLlena', como: 'Consigue tres ULTRAS en una partida.',
    dato: 'El Atleti ha ganado tres Supercopas de Europa: 2010, 2012 y 2018.',
    comprobar: (r) => (r.ultras ?? []).length >= 3, servidor: (r) => r.tiempo >= 300,
  },
  milBajas: {
    nombre: 'Mil en el Metropolitano', icono: 'calavera', como: 'Elimina a 1000 rivales en una partida.',
    dato: 'El primer gol oficial del Metropolitano lo marcó Griezmann al Málaga, en 2017.',
    comprobar: (r) => r.bajas >= 1000, servidor: (r) => r.bajas >= 1000,
  },
  pupas: {
    nombre: 'El Pupas', icono: 'corazon', como: 'Que te eliminen antes del minuto 2. Pasa hasta en las mejores familias.',
    dato: 'El apodo de «El Pupas» se hizo famoso tras perder la final de la Copa de Europa de 1974 con un empate en el último minuto.',
    comprobar: (r) => r.tiempo < 120 && r.muerto !== false, servidor: (r) => r.tiempo < 120, camiseta: 'pupas',
  },
  // --- Club (plantilla) -----------------------------------------------------------------------
  kokeVida: {
    nombre: 'Toda una vida', icono: 'camiseta', como: 'Juega 20 partidas con Koke.', tipo: 'club',
    dato: 'Koke es el jugador con más partidos oficiales de la historia del Atleti.',
    club: (p) => (p.jugadores.koke?.partidas ?? 0) >= 20, camiseta: 'calderon',
  },
  centenario: {
    nombre: 'Azul y blanco', icono: 'camiseta', como: 'Ten 20 jugadores en tu plantilla.', tipo: 'club',
    dato: 'El Atleti nació en 1903 vestido de azul y blanco; las rayas rojiblancas llegaron en 1911.',
    club: (p) => Object.keys(p.jugadores).length >= 20, camiseta: 'centenario',
  },
  leyendas: {
    nombre: 'Paseo de Leyendas', icono: 'trofeo', como: 'Ficha a las 8 leyendas.', tipo: 'club',
    dato: 'Alrededor del Metropolitano, el Paseo de Leyendas recuerda a los jugadores con más de cien partidos en el club.',
    club: (p, personajes) => Object.keys(personajes).filter((k) => personajes[k].rareza === 'leyenda').every((k) => p.jugadores[k]),
  },
};

/** Logros de partida que cumple un resumen `r` (lo que ha pasado en la partida). */
export const logrosDePartida = (r) => Object.keys(LOGROS).filter((k) => LOGROS[k].tipo !== 'club' && LOGROS[k].comprobar(r));

/** De los logros que dice el cliente, los que el servidor da por buenos con lo que él sabe de la partida. */
export const logrosCreibles = (ids, r) => [...new Set(Array.isArray(ids) ? ids : [])]
  .filter((k) => typeof k === 'string' && Object.hasOwn(LOGROS, k) && LOGROS[k].tipo !== 'club' && LOGROS[k].servidor(r));

/** Logros de club que cumple un perfil. */
export const logrosDeClub = (perfil, personajes) => Object.keys(LOGROS).filter((k) => LOGROS[k].tipo === 'club' && LOGROS[k].club(perfil, personajes));

/** Equipaciones desbloqueadas con un conjunto de logros. */
export const equipacionesDe = (logros) => Object.keys(EQUIPACIONES).filter((e) => e === 'primera' || Object.keys(LOGROS).some((k) => LOGROS[k].camiseta === e && logros.includes(k)));

/** Qué logro desbloquea una equipación (null en la primera). */
export const logroDeEquipacion = (e) => Object.keys(LOGROS).find((k) => LOGROS[k].camiseta === e) ?? null;
