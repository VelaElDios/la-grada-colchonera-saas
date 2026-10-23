// Iconos SVG sencillos (viewBox 24x24) para armas, mejoras y la interfaz. Son dibujos propios.

const trazo = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const ICONOS = {
  balon: `<circle cx="12" cy="12" r="9" ${trazo}/><path d="M12 7.5l3.6 2.6-1.4 4.2H9.8L8.4 10.1z" ${trazo}/><path d="M12 7.5V3.2M15.6 10.1l4-1.3M14.2 14.3l2.5 3.4M9.8 14.3l-2.5 3.4M8.4 10.1l-4-1.3" ${trazo}/>`,
  bufanda: `<path d="M3 8c4-3 7 3 11 0s5-2 7 0v4c-2-2-3-2-7 0s-7-3-11 0z" ${trazo}/><path d="M16 13l1.5 7M19 12.5l1.5 6" ${trazo}/>`,
  banderin: `<path d="M7 21V3" ${trazo}/><path d="M7 4l12 4.5L7 13z" ${trazo}/>`,
  megafono: `<path d="M4 10v4h3l8 4.5v-13L7 10z" ${trazo}/><path d="M18.5 9a4.5 4.5 0 010 6M21 6.5a8 8 0 010 11" ${trazo}/>`,
  bota: `<path d="M5 4h6v7l7 3c1.5.6 2 1.5 2 3v2H4V4z" ${trazo}/><path d="M8 20v-3M12 20v-3M16 20v-3" ${trazo}/>`,
  iman: `<path d="M5 3v9a7 7 0 0014 0V3h-4v9a3 3 0 01-6 0V3z" ${trazo}/><path d="M5 7h4M15 7h4" ${trazo}/>`,
  corazon: `<path d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0112 7a4.3 4.3 0 018 2.8C20 15.4 12 20 12 20z" ${trazo}/>`,
  pizarra: `<rect x="3" y="4" width="18" height="13" rx="2" ${trazo}/><path d="M8 21h8M12 17v4M7 9l3 3 3-4 3 3" ${trazo}/>`,
  estrella: `<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z" ${trazo}/>`,
  cruz: `<rect x="3.5" y="3.5" width="17" height="17" rx="4" ${trazo}/><path d="M12 8v8M8 12h8" ${trazo}/>`,
  canon: `<circle cx="16" cy="12" r="4.5" ${trazo}/><path d="M3 8h6M2 12h7M3 16h6" ${trazo}/>`,
  esquina: `<path d="M5 20V4l8 3-8 3" ${trazo}/><path d="M12 20a8 8 0 018-8" ${trazo}/><path d="M16 16.5l.01 0" ${trazo}/>`,
  efecto: `<path d="M4 18c0-8 6-12 14-11" ${trazo}/><path d="M14 4l4 3-3 4" ${trazo}/><circle cx="6" cy="18" r="2" ${trazo}/>`,
  silbato: `<circle cx="9" cy="14" r="5" ${trazo}/><path d="M13 11l8-4v4l-6 2" ${trazo}/><circle cx="9" cy="14" r="1.2" ${trazo}/>`,
  tarjeta: `<rect x="7" y="3.5" width="10" height="17" rx="1.8" ${trazo}/><path d="M10 8h4" ${trazo}/>`,
  var: `<rect x="3" y="5" width="18" height="12" rx="2" ${trazo}/><path d="M13 7l-3 4h4l-3 4M9 20h6" ${trazo}/>`,
  escudo: `<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" ${trazo}/>`,
  viento: `<path d="M3 9h11a3 3 0 10-3-3M3 14h15a3 3 0 11-3 3M3 19h7" ${trazo}/>`,
  mas: `<path d="M12 5v14M5 12h14" ${trazo}/><circle cx="12" cy="12" r="9" ${trazo}/>`,
  rayo: `<path d="M13 2L5 14h6l-1 8 8-12h-6z" ${trazo}/>`,
  pausa: `<path d="M8 5v14M16 5v14" ${trazo}/>`,
  sonido: `<path d="M4 10v4h3.5L12 18V6L7.5 10z" ${trazo}/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" ${trazo}/>`,
  silencio: `<path d="M4 10v4h3.5L12 18V6L7.5 10z" ${trazo}/><path d="M16 9.5l5 5M21 9.5l-5 5" ${trazo}/>`,
  calavera: `<path d="M12 3a8 8 0 00-5 14.2V20h10v-2.8A8 8 0 0012 3z" ${trazo}/><circle cx="9" cy="11.5" r="1.3" ${trazo}/><circle cx="15" cy="11.5" r="1.3" ${trazo}/>`,
  reloj: `<circle cx="12" cy="12" r="9" ${trazo}/><path d="M12 7v5l3 2" ${trazo}/>`,
};

/** Devuelve el SVG (como cadena) de un icono; si no existe, un círculo. */
export function icono(nombre, tamano = 24) {
  const dibujo = ICONOS[nombre] || `<circle cx="12" cy="12" r="8" ${trazo}/>`;
  return `<svg class="icono" width="${tamano}" height="${tamano}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${dibujo}</svg>`;
}
