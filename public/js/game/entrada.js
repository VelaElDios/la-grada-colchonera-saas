// Entrada del jugador: teclado (WASD y flechas) y joystick táctil flotante.
// Devuelve siempre un vector { x, y } con cada componente entre -1 y 1.

const RADIO_JOYSTICK = 56;
const TECLAS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

/**
 * @param {HTMLElement} zona Elemento sobre el que se arrastra el dedo
 * @param {{ alPausar: () => void, activo: () => boolean }} opciones
 */
export function crearEntrada(zona, { alPausar, activo }) {
  const pulsadas = new Set();
  const joystick = { id: null, x0: 0, y0: 0, x: 0, y: 0 };

  const base = document.createElement('div');
  base.className = 'joystick';
  base.hidden = true;
  base.innerHTML = '<div class="joystick__palo"></div>';
  zona.append(base);
  const palo = base.firstElementChild;

  function alBajarTecla(ev) {
    if (ev.code === 'Escape' || ev.code === 'KeyP') {
      if (!ev.repeat) alPausar();
      return;
    }
    if (TECLAS[ev.code]) {
      if (activo()) ev.preventDefault(); // evita que las flechas desplacen la página
      pulsadas.add(ev.code);
    }
  }
  const alSubirTecla = (ev) => pulsadas.delete(ev.code);
  const soltarTodo = () => {
    pulsadas.clear();
    joystick.id = null;
    base.hidden = true;
  };

  function alTocar(ev) {
    if (ev.pointerType === 'mouse' || joystick.id !== null || !activo()) return;
    joystick.id = ev.pointerId;
    joystick.x0 = ev.clientX;
    joystick.y0 = ev.clientY;
    joystick.x = 0;
    joystick.y = 0;
    const caja = zona.getBoundingClientRect();
    base.style.left = `${ev.clientX - caja.left}px`;
    base.style.top = `${ev.clientY - caja.top}px`;
    palo.style.transform = 'translate(-50%, -50%)';
    base.hidden = false;
    zona.setPointerCapture?.(ev.pointerId);
  }
  function alArrastrar(ev) {
    if (ev.pointerId !== joystick.id) return;
    let dx = ev.clientX - joystick.x0;
    let dy = ev.clientY - joystick.y0;
    const l = Math.hypot(dx, dy);
    if (l > RADIO_JOYSTICK) {
      dx = (dx / l) * RADIO_JOYSTICK;
      dy = (dy / l) * RADIO_JOYSTICK;
    }
    joystick.x = dx / RADIO_JOYSTICK;
    joystick.y = dy / RADIO_JOYSTICK;
    palo.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  function alSoltar(ev) {
    if (ev.pointerId !== joystick.id) return;
    joystick.id = null;
    joystick.x = 0;
    joystick.y = 0;
    base.hidden = true;
  }

  window.addEventListener('keydown', alBajarTecla);
  window.addEventListener('keyup', alSubirTecla);
  window.addEventListener('blur', soltarTodo);
  zona.addEventListener('pointerdown', alTocar);
  zona.addEventListener('pointermove', alArrastrar);
  zona.addEventListener('pointerup', alSoltar);
  zona.addEventListener('pointercancel', alSoltar);

  return {
    /** Vector de movimiento actual. */
    leer() {
      let x = 0;
      let y = 0;
      pulsadas.forEach((c) => { x += TECLAS[c][0]; y += TECLAS[c][1]; });
      if (x !== 0 || y !== 0) {
        const l = Math.hypot(x, y);
        return { x: x / l, y: y / l };
      }
      return { x: joystick.x, y: joystick.y };
    },
    soltarTodo,
    destruir() {
      window.removeEventListener('keydown', alBajarTecla);
      window.removeEventListener('keyup', alSubirTecla);
      window.removeEventListener('blur', soltarTodo);
      zona.removeEventListener('pointerdown', alTocar);
      zona.removeEventListener('pointermove', alArrastrar);
      zona.removeEventListener('pointerup', alSoltar);
      zona.removeEventListener('pointercancel', alSoltar);
      base.remove();
    },
  };
}
