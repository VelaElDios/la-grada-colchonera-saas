// Ajustes del juego (sonido, gráficos y controles), guardados solo en este navegador.
const CLAVE = 'grada.ajustes';

export const AJUSTES_BASE = {
  volumen: 70, // 0..100
  efectos: true, // partículas y sacudidas de pantalla
  numeros: true, // números de daño sobre los rivales
  zoom: 'normal', // 'cerca' | 'normal' | 'lejos'
  joystick: true, // joystick táctil en pantallas táctiles
};

export const ZOOM = { cerca: 1.25, normal: 1, lejos: 0.8 };

export function leerAjustes() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE));
    return {
      volumen: Number.isFinite(g?.volumen) ? Math.max(0, Math.min(100, g.volumen)) : AJUSTES_BASE.volumen,
      efectos: typeof g?.efectos === 'boolean' ? g.efectos : AJUSTES_BASE.efectos,
      numeros: typeof g?.numeros === 'boolean' ? g.numeros : AJUSTES_BASE.numeros,
      zoom: ZOOM[g?.zoom] ? g.zoom : AJUSTES_BASE.zoom,
      joystick: typeof g?.joystick === 'boolean' ? g.joystick : AJUSTES_BASE.joystick,
    };
  } catch {
    return { ...AJUSTES_BASE };
  }
}

export function guardarAjustes(ajustes) {
  try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)); } catch { /* sin almacenamiento */ }
}
