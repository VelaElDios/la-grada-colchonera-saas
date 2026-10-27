// Portada: presenta el juego y enseña si el servidor está en marcha.
import { h } from '../dom.js';
import { api } from '../../api.js';
import { estado } from '../estado.js';
import { enlaceBoton, esqueleto } from '../componentes.js';

function estadoServidor() {
  const punto = h('span', { class: 'punto punto--espera', attrs: { 'aria-hidden': 'true' } });
  const texto = h('span', {}, esqueleto('esqueleto--texto'));
  const reintentar = h('button', { class: 'enlace-boton', type: 'button', hidden: true }, 'Reintentar');
  const nodo = h('p', { class: 'servidor', attrs: { role: 'status' } }, punto, h('span', { class: 'sr-only' }, 'Estado del servidor: '), texto, reintentar);

  let vivo = true;
  async function comprobar() {
    reintentar.hidden = true;
    punto.className = 'punto punto--espera';
    texto.replaceChildren(esqueleto('esqueleto--texto'));
    try {
      const { status } = await api.getHealth();
      if (!vivo) return;
      const bien = status === 'ok';
      punto.className = `punto punto--${bien ? 'ok' : 'error'}`;
      texto.textContent = bien ? 'Servidor en marcha' : `Servidor con problemas (${status})`;
    } catch (error) {
      if (!vivo) return;
      console.error('[grada] estado del servidor', error);
      punto.className = 'punto punto--error';
      texto.textContent = 'Sin conexión con el servidor';
      reintentar.hidden = false;
    }
  }
  reintentar.addEventListener('click', comprobar);
  comprobar();
  return { nodo, parar: () => { vivo = false; } };
}

const PASOS = [
  ['1', 'Muévete', 'WASD, flechas o el dedo en el móvil. Tus armas disparan solas.'],
  ['2', 'Sube de nivel', 'Cada rival caído suelta experiencia. Elige una mejora entre tres.'],
  ['3', 'Aguanta', 'Las oleadas crecen cada 30 segundos y cada cuatro llega un jefe.'],
];

export function montar(raiz) {
  const servidor = estadoServidor();
  const logueado = Boolean(estado.usuario);

  const acciones = logueado
    ? [enlaceBoton('Jugar ahora', '/jugar', 'primario', 'btn--grande'), enlaceBoton('Mi cuenta', '/perfil', 'secundario', 'btn--grande')]
    : [enlaceBoton('Crear cuenta para jugar', '/registro', 'primario', 'btn--grande'), enlaceBoton('Ya tengo cuenta', '/entrar', 'secundario', 'btn--grande')];

  raiz.replaceChildren(
    h(
      'section',
      { class: 'heroe' },
      h('p', { class: 'sobretitulo' }, 'Supervivencia rojiblanca'),
      h('h1', { class: 'heroe__titulo', tabIndex: -1 }, 'Aguanta la oleada. ', h('span', { class: 'texto-rojo' }, 'Defiende la grada.')),
      h('p', { class: 'heroe__texto' }, 'Un survivor de navegador con alma colchonera: miles de rivales, armas que se combinan y una sola misión: seguir en pie un minuto más.'),
      h('div', { class: 'heroe__acciones' }, ...acciones),
      logueado ? null : h('p', { class: 'heroe__nota' }, 'Hace falta una cuenta gratuita para jugar.'),
    ),
    h(
      'section',
      { class: 'bloque', attrs: { 'aria-labelledby': 'como-t' } },
      h('h2', { class: 'bloque__titulo', id: 'como-t' }, 'Cómo se juega'),
      h('ol', { class: 'pasos' }, ...PASOS.map(([n, t, d]) => h(
        'li',
        { class: 'tarjeta paso' },
        h('span', { class: 'paso__numero', attrs: { 'aria-hidden': 'true' } }, n),
        h('h3', { class: 'paso__titulo' }, t),
        h('p', { class: 'paso__texto' }, d),
      ))),
    ),
    servidor.nodo,
  );
  return () => servidor.parar();
}
