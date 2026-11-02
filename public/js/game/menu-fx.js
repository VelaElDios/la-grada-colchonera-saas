// Efectos del menú del juego: papelitos rojiblancos, transiciones entre pantallas, tarjetas que
// aparecen escalonadas, la entrada al partido («¡Saltan al campo!») y los consejos del míster.
// Solo se toca el DOM dentro de las funciones (nunca al importar), así el módulo se puede cargar en node:test.
// Todo lo que se mueve respeta `reducido` (prefers-reduced-motion): sin desplazamientos, como mucho fundidos.

const TAU = Math.PI * 2;
const SUAVE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

// ---------------------------------------------------------------------------------------------
// Consejos del míster (rotan en el menú). Todos salen de las reglas reales del juego.
// ---------------------------------------------------------------------------------------------

export const CONSEJOS = [
  'Muévete siempre: corriendo sube el ritmo (más daño y más experiencia) y la ulti se carga sola.',
  'Si te quedas quieto pierdes el ritmo y los rivales que tienes cerca corren más.',
  'Cada 30 segundos llega una oleada y cada cuatro oleadas, un jefe. El primero sale a la 1:30.',
  'Los jefes tienen tres fases. En la última sacan su jugada estrella: no te quedes pegado a ellos.',
  'Las mejoras con ★ completan una combinación. Junta varias y consigues una ULTRA.',
  'Cada 3 jefes vencidos, con el jugador que sea, ganas una ficha de contrato para fichar.',
  'El barro te frena. Con lluvia, los balones (los tuyos y los de los rivales) corren más.',
  'Los taludes de las mesetas no se suben: busca las escaleras.',
  'Las flechas del borde señalan premios: botiquín, balón de oro, energía e imán.',
  'Cada jugador solo aprende las habilidades de su estilo: un portero no chuta.',
  'Cada 5 minutos cambia la pantalla: Copa del Rey, Liga, Champions y Mundial. Y los rivales aprietan más.',
  'Los rivales con aro de color son élites: blindados, veloces o furiosos.',
  'Gasta los puntos de Entrenamiento: vida, defensa, disparo y suerte se notan en el campo.',
  'Pulsa Espacio o E para lanzar la ulti cuando la barra esté llena.',
];

/** Frase propia de cada entrenador (sale de vez en cuando entre los consejos). */
export const LEMAS = {
  cholo: 'Partido a partido. Y si se cree y se trabaja, se puede.',
  aragones: 'Ganar, y ganar, y ganar, y volver a ganar.',
};

/** Consejo número `n` para un entrenador: cada cinco, su lema. */
export function consejo(n, entrenador) {
  if (n % 5 === 4 && LEMAS[entrenador]) return LEMAS[entrenador];
  return CONSEJOS[(n - Math.floor((n + 1) / 5)) % CONSEJOS.length];
}

// ---------------------------------------------------------------------------------------------
// Piezas de HTML decorativas (siempre dentro de un contenedor aria-hidden)
// ---------------------------------------------------------------------------------------------

/** Cada letra en su caja, con su índice para la entrada escalonada. */
export function letras(texto) {
  return [...texto].map((l, i) => `<span style="--i:${i}">${l === ' ' ? '&nbsp;' : l}</span>`).join('');
}

/** Bufanda rojiblanca hecha de franjas que ondean (con «ATLETI» en el centro). */
export function bufanda(tramos = 30) {
  const lema = 'ATLETI';
  const centro = Math.floor((tramos - lema.length) / 2);
  let html = '';
  for (let i = 0; i < tramos; i += 1) {
    const enLema = i >= centro && i < centro + lema.length;
    const color = enLema ? 'azul' : Math.floor(Math.min(i, tramos - 1 - i) / 3) % 2 ? 'blanco' : 'rojo'; // simétrica
    html += `<i class="bufanda__tramo bufanda__tramo--${color}" style="--i:${i}">${enLema ? lema[i - centro] : ''}</i>`;
  }
  return html;
}

// ---------------------------------------------------------------------------------------------
// Papelitos: confeti rojiblanco que cae sobre el campo del menú (se dibuja en el lienzo del juego)
// ---------------------------------------------------------------------------------------------

const COLORES = [
  ['#d4152f', '#8f0c1f'], ['#d4152f', '#8f0c1f'], ['#f5f7ff', '#b9c0dc'],
  ['#f5f7ff', '#b9c0dc'], ['#ff4d63', '#b3283a'], ['#2c3f9e', '#1a2563'],
];

/**
 * Papelitos que caen despacio, giran y se dan la vuelta. Coste mínimo: unos 20–60 rectángulos.
 * @param {{ azar?: () => number }} [opciones]
 */
export function crearPapelitos({ azar = Math.random } = {}) {
  let lista = [];
  let ancho = 0;
  let alto = 0;
  let reloj = 0;

  const nuevo = (x, y, extra = {}) => {
    const [color, reves] = COLORES[Math.floor(azar() * COLORES.length)];
    return {
      x, y, vx: 0, vy: 0, caida: 26 + azar() * 40, w: 5 + azar() * 4, h: 8 + azar() * 7,
      giro: azar() * TAU, vgiro: (azar() - 0.5) * 3, vuelta: azar() * TAU, vvuelta: 3 + azar() * 6,
      fase: azar() * TAU, vaiven: 10 + azar() * 22, color, reves, rafaga: false, ...extra,
    };
  };
  const objetivo = () => Math.max(16, Math.min(56, Math.round((ancho * alto) / 24000)));

  return {
    get cuantos() { return lista.length; },
    /** Tamaño del lienzo en píxeles CSS. */
    medir(w, h) { ancho = w; alto = h; },
    vaciar() { lista = []; },
    /** Ráfaga de `n` papelitos que salen disparados desde (x, y) hacia `angulo` (radianes). */
    rafaga(x, y, n = 30, angulo = -Math.PI / 2, apertura = 0.6, fuerza = 520) {
      for (let k = 0; k < n; k += 1) {
        const a = angulo + (azar() - 0.5) * apertura * 2;
        const v = fuerza * (0.55 + azar() * 0.6);
        lista.push(nuevo(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, rafaga: true }));
      }
    },
    paso(dt) {
      if (!ancho || !alto) return;
      reloj += dt;
      // Lluvia de fondo: los que faltan para llegar a la densidad buscada (la primera vez, ya repartidos)
      const fijos = lista.reduce((s, p) => s + (p.rafaga ? 0 : 1), 0);
      const primera = lista.length === 0;
      for (let k = fijos; k < objetivo(); k += 1) lista.push(nuevo(azar() * ancho, primera ? azar() * alto : -12 - azar() * 60));
      const freno = Math.exp(-1.8 * dt);
      for (const p of lista) {
        if (p.rafaga) {
          p.vx *= freno;
          p.vy = Math.min(p.caida, p.vy + 640 * dt); // gravedad hasta caer como el resto
        } else {
          p.vy = p.caida;
        }
        p.x += (p.vx + Math.sin(p.fase + reloj * 1.4) * p.vaiven) * dt;
        p.y += p.vy * dt;
        p.giro += p.vgiro * dt;
        p.vuelta += p.vvuelta * dt;
      }
      // Los que salen por abajo (o muy lejos por los lados) vuelven arriba; los de las ráfagas se van
      lista = lista.filter((p) => {
        const fuera = p.y > alto + 16 || p.x < -60 || p.x > ancho + 60;
        if (!fuera) return true;
        if (p.rafaga) return false;
        p.y = -12 - azar() * 40;
        p.x = azar() * ancho;
        return true;
      });
    },
    /** Dibuja en un contexto ya escalado a píxeles CSS. */
    dibujar(ctx) {
      for (const p of lista) {
        const vuelta = Math.cos(p.vuelta);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.scale(1, Math.abs(vuelta) < 0.08 ? 0.08 : vuelta);
        ctx.fillStyle = vuelta >= 0 ? p.color : p.reves;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Transiciones (Web Animations: no dependen de clases ni de temporizadores)
// ---------------------------------------------------------------------------------------------

const animar = (el, fotogramas, opciones) => (el?.animate ? el.animate(fotogramas, opciones) : null);
const terminada = (anim) => (anim ? anim.finished.then(() => {}, () => {}) : Promise.resolve());

/** Para las transiciones que tuviera un nodo (y sus cajas), por si vuelve a mostrarse a mitad de una. */
export function pararAnimaciones(nodo) {
  nodo?.getAnimations?.({ subtree: true }).forEach((a) => { if (a.id === 'pantalla') a.cancel(); });
}

/** Entrada de una pantalla del menú: el fondo se funde y la caja sube. Devuelve una promesa al acabar. */
export function abrirPantalla(nodo, { reducido = false } = {}) {
  const fondo = animar(nodo, [{ opacity: 0 }, { opacity: 1 }], { duration: reducido ? 160 : 220, easing: 'ease-out', id: 'pantalla' });
  const caja = nodo.querySelector('.pantalla__caja');
  if (!reducido) {
    animar(caja, [
      { opacity: 0, transform: 'translateY(28px) scale(0.965)' },
      { opacity: 1, transform: 'none' },
    ], { duration: 360, easing: SUAVE, id: 'pantalla' });
  }
  return terminada(fondo);
}

/** Salida de una pantalla del menú: se funde y la caja baja un poco. Devuelve una promesa al acabar. */
export function cerrarPantalla(nodo, { reducido = false } = {}) {
  const fondo = animar(nodo, [{ opacity: 1 }, { opacity: 0 }], { duration: reducido ? 140 : 200, easing: 'ease-in', fill: 'forwards', id: 'pantalla' });
  if (!reducido) {
    animar(nodo.querySelector('.pantalla__caja'), [
      { transform: 'none' }, { transform: 'translateY(18px) scale(0.98)' },
    ], { duration: 200, easing: 'ease-in', fill: 'forwards', id: 'pantalla' });
  }
  return terminada(fondo);
}

/** Tarjetas que aparecen una detrás de otra (las primeras `max`; el resto ya están). */
export function escalonar(elementos, {
  reducido = false, paso = 35, retraso = 80, max = 18, distancia = 14, duracion = 340,
} = {}) {
  if (reducido) return;
  [...elementos].slice(0, max).forEach((el, i) => {
    animar(el, [
      { opacity: 0, transform: `translateY(${distancia}px) scale(0.97)` },
      { opacity: 1, transform: 'none' },
    ], { duration: duracion, delay: retraso + i * paso, easing: SUAVE, fill: 'backwards' });
  });
}

/** Cambia un texto con un fundido corto (para el consejo del míster). */
export function cambiarTexto(el, texto) {
  if (!el) return;
  const salida = animar(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  terminada(salida).then(() => {
    el.textContent = texto;
    salida?.cancel();
    animar(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: SUAVE });
  });
}

/**
 * Cuenta de 0 al valor final (por ejemplo, el mejor tiempo). El texto final lo pone quien llama en un
 * elemento para lectores de pantalla: este solo anima la cifra visible, que va con aria-hidden.
 */
export function contar(el, hasta, formato, { reducido = false, duracion = 900 } = {}) {
  if (!el) return;
  el.textContent = formato(hasta);
  if (reducido || !hasta || typeof requestAnimationFrame !== 'function') return;
  const inicio = performance.now();
  const tic = (ahora) => {
    if (!el.isConnected) return;
    const t = Math.min(1, (ahora - inicio) / duracion);
    el.textContent = formato(hasta * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(tic);
  };
  requestAnimationFrame(tic);
}

// ---------------------------------------------------------------------------------------------
// Entrada al partido: franjas rojiblancas que tapan la pantalla, «¡Saltan al campo!» y se abren
// ---------------------------------------------------------------------------------------------

/**
 * Anima la cortinilla `nodo` (aria-hidden). Devuelve:
 *  - `tapada`: promesa que se cumple cuando la pantalla está tapada (o al saltarla con un clic o una tecla)
 *  - `abrir()`: descubre el campo y esconde la cortinilla.
 * @param {HTMLElement} nodo
 * @param {{ reducido?: boolean, duracion?: number, alCartel?: () => void }} opciones
 */
export function salidaAlCampo(nodo, { reducido = false, duracion = 1050, alCartel = () => {} } = {}) {
  let listo;
  const tapada = new Promise((r) => { listo = r; });
  const temporizadores = [];
  let hecho = false;
  const terminar = () => {
    if (hecho) return;
    hecho = true;
    temporizadores.forEach(clearTimeout);
    window.removeEventListener('keydown', alTecla, true);
    nodo.removeEventListener('pointerdown', terminar);
    listo();
  };
  function alTecla(ev) {
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(ev.key)) return;
    terminar();
  }

  nodo.classList.remove('salida--entra', 'salida--sale', 'salida--suave');
  nodo.hidden = false;
  void nodo.offsetWidth; // reinicia las animaciones CSS
  if (reducido) {
    nodo.classList.add('salida--suave');
    animar(nodo, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
    alCartel();
  } else {
    nodo.classList.add('salida--entra');
    temporizadores.push(setTimeout(alCartel, 320));
  }
  temporizadores.push(setTimeout(terminar, reducido ? 550 : duracion));
  window.addEventListener('keydown', alTecla, true);
  nodo.addEventListener('pointerdown', terminar);

  return {
    tapada,
    /** Quita la cortinilla (con su animación) y la esconde al acabar. */
    abrir() {
      terminar();
      const esconder = () => { nodo.hidden = true; nodo.classList.remove('salida--entra', 'salida--sale', 'salida--suave'); };
      if (reducido || !nodo.animate) {
        terminada(animar(nodo, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in' })).then(esconder);
        return;
      }
      nodo.classList.replace('salida--entra', 'salida--sale');
      setTimeout(esconder, 620);
    },
    /** Si se desmonta el juego a mitad. */
    cancelar() { terminar(); nodo.hidden = true; },
  };
}
