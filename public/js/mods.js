// Mods del juego (Ajustes → Mods). Un mod cambia la identidad del juego entera: su plantilla, sus equipaciones y
// sus entrenadores (el `pack` de config.js) y el tema visual de toda la web (atributo `data-mod-theme` en <html>,
// ver css/mod-albacete.css). Solo puede haber uno activo; por defecto NINGUNO, así que el juego arranca siempre
// con su identidad original del Atlético de Madrid.
//
// Se guarda solo en este navegador (localStorage). No importa nada del juego para poder cargarse al arrancar la web
// (la cabecera ya sale con el tema) sin descargar el motor.

const CLAVE = 'grada.mods';
export const PACK_SIN_MOD = 'atleti';

/** Registro de mods disponibles. Para añadir otro basta con una entrada más (y su hoja de estilos de tema). */
export const MODS = {
  albacete: {
    id: 'albacete',
    nombre: 'Albacete Balompié — El Queso Mecánico',
    corto: 'Alba',
    pack: 'alba', // clave en PACKS (config.js): jugadores, equipaciones y entrenadores que se usan con el mod
    tema: 'albacete', // valor de data-mod-theme
    descripcion: 'Convierte La Grada en la grada del Carlos Belmonte: 14 jugadores del Alba con su retrato, sus equipaciones (blanca, negra y dorada, granate y la retro del 91), los entrenadores Benito Floro y César Ferrando y un tema visual completo en blanco, negro carbón y oro.',
    incluye: ['14 jugadores', '4 equipaciones', '2 entrenadores', '4 logros', 'Tema visual'],
  },
};

const almacenPorDefecto = () => (typeof localStorage === 'undefined' ? null : localStorage);

/** Mod activo (su id) o null si se juega con el juego original. Cualquier valor raro guardado cuenta como ninguno. */
export function modActivo(almacen = almacenPorDefecto()) {
  try {
    const id = JSON.parse(almacen?.getItem(CLAVE) ?? 'null')?.activo;
    return typeof id === 'string' && Object.hasOwn(MODS, id) ? id : null;
  } catch {
    return null;
  }
}

/** Activa un mod (desactiva el que hubiera) o, con null, vuelve al juego original. Devuelve el mod que queda activo. */
export function ponerMod(id, almacen = almacenPorDefecto()) {
  const valido = id && Object.hasOwn(MODS, id) ? id : null;
  try {
    if (valido) almacen?.setItem(CLAVE, JSON.stringify({ activo: valido }));
    else almacen?.removeItem(CLAVE);
  } catch { /* sin almacenamiento: dura lo que dure la página */ }
  return valido;
}

/** Pack de jugadores que toca usar: el del mod activo o el del Atleti. */
export const packDelMod = (id = modActivo()) => MODS[id]?.pack ?? PACK_SIN_MOD;

/** Pone (o quita) el tema visual del mod en la raíz del documento. */
export function aplicarTema(id = modActivo(), raiz = typeof document === 'undefined' ? null : document.documentElement) {
  if (!raiz) return;
  const tema = MODS[id]?.tema;
  if (tema) raiz.setAttribute('data-mod-theme', tema);
  else raiz.removeAttribute('data-mod-theme');
}
