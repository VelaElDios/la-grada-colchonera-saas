// Ventana de confirmación basada en <dialog>: reemplaza a window.confirm con algo accesible y con estilo.
import { h } from './dom.js';

/**
 * Pide confirmación al usuario.
 * @returns {Promise<boolean>} true si confirma, false si cancela o cierra
 */
export function confirmar({ titulo, texto, confirmar: textoBoton = 'Confirmar', peligro = false }) {
  return new Promise((resolver) => {
    const dialogo = h(
      'dialog',
      { class: 'dialogo', attrs: { 'aria-labelledby': 'dialogo-titulo', 'aria-describedby': 'dialogo-texto' } },
      h(
        'form',
        { method: 'dialog', class: 'dialogo__caja' },
        h('h2', { id: 'dialogo-titulo', class: 'dialogo__titulo' }, titulo),
        h('p', { id: 'dialogo-texto', class: 'dialogo__texto' }, texto),
        h(
          'div',
          { class: 'dialogo__acciones' },
          h('button', { class: 'btn btn--secundario', value: 'cancelar', type: 'submit', autofocus: true }, 'Cancelar'),
          h('button', { class: `btn ${peligro ? 'btn--peligro' : 'btn--primario'}`, value: 'ok', type: 'submit' }, textoBoton),
        ),
      ),
    );
    const antesFoco = document.activeElement;
    dialogo.addEventListener('close', () => {
      const confirmado = dialogo.returnValue === 'ok';
      dialogo.remove();
      antesFoco?.focus?.();
      resolver(confirmado);
    });
    // Un clic fuera de la caja equivale a cancelar
    dialogo.addEventListener('click', (ev) => { if (ev.target === dialogo) dialogo.close('cancelar'); });
    document.body.append(dialogo);
    dialogo.showModal();
  });
}
