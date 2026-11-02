// Pruebas del menú del juego animado: efectos (papelitos, bufanda, título letra a letra), consejos del
// míster, la entrada al partido y que todo lo que se mueve respete prefers-reduced-motion.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const JUEGO = path.join(__dirname, '..', 'public', 'js', 'game');
const cargar = (nombre) => import(pathToFileURL(path.join(JUEGO, nombre)).href);
const leer = (...partes) => fs.readFileSync(path.join(__dirname, '..', 'public', ...partes), 'utf8');

/** Generador con semilla para que las pruebas de los papelitos sean reproducibles. */
function azarFijo(semilla = 7) {
  let a = semilla;
  return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; };
}

test('consejos del míster: rotan sin repetirse seguidos y cada cinco sale el lema de tu entrenador', async () => {
  const { CONSEJOS, LEMAS, consejo } = await cargar('menu-fx.js');
  assert.ok(CONSEJOS.length >= 10);
  assert.ok(CONSEJOS.every((c) => typeof c === 'string' && c.length > 20 && c.length < 140), 'caben en dos líneas');
  for (const entrenador of ['cholo', 'aragones']) {
    assert.ok(LEMAS[entrenador], `${entrenador} tiene lema`);
    assert.equal(consejo(4, entrenador), LEMAS[entrenador]);
    assert.equal(consejo(9, entrenador), LEMAS[entrenador]);
  }
  const vistos = Array.from({ length: 40 }, (_, n) => consejo(n, 'cholo'));
  for (let n = 1; n < vistos.length; n += 1) assert.notEqual(vistos[n], vistos[n - 1], `consejo ${n} distinto del anterior`);
  for (const c of CONSEJOS) assert.ok(vistos.includes(c), `sale «${c.slice(0, 30)}…»`);
  assert.ok(consejo(3, 'desconocido')); // sin lema, solo consejos
});

test('título y bufanda: una caja por letra y una bufanda simétrica rojiblanca con «ATLETI» en el centro', async () => {
  const { letras, bufanda } = await cargar('menu-fx.js');
  const html = letras('Colchonera');
  assert.equal((html.match(/<span style="--i:\d+">/g) ?? []).length, 10);
  assert.match(html, /--i:9">a<\/span>$/);
  const tramos = [...bufanda(30).matchAll(/bufanda__tramo--(\w+)" style="--i:\d+">([A-Z]?)<\/i>/g)];
  assert.equal(tramos.length, 30);
  assert.equal(tramos.filter(([, , l]) => l).map(([, , l]) => l).join(''), 'ATLETI');
  assert.ok(tramos.filter(([, , l]) => l).every(([, c]) => c === 'azul'));
  const colores = tramos.map(([, c]) => c);
  assert.deepEqual(colores, [...colores].reverse(), 'simétrica');
  assert.ok(colores.includes('rojo') && colores.includes('blanco'));
});

test('papelitos: llenan la pantalla con pocos trozos, caen, vuelven arriba y las ráfagas se van solas', async () => {
  const { crearPapelitos } = await cargar('menu-fx.js');
  const p = crearPapelitos({ azar: azarFijo() });
  p.paso(1 / 60); // sin tamaño todavía: no hace nada
  assert.equal(p.cuantos, 0);
  p.medir(1440, 836);
  p.paso(1 / 60);
  const fijos = p.cuantos;
  assert.ok(fijos >= 16 && fijos <= 56, `densidad contenida (${fijos})`);
  for (let i = 0; i < 60 * 30; i += 1) p.paso(1 / 60); // medio minuto: siguen siendo los mismos, reciclados
  assert.equal(p.cuantos, fijos);
  p.rafaga(0, 836, 28, -Math.PI / 3, 0.3, 900);
  assert.equal(p.cuantos, fijos + 28);
  for (let i = 0; i < 60 * 40; i += 1) p.paso(1 / 60);
  assert.equal(p.cuantos, fijos, 'los de la ráfaga salen por abajo y desaparecen');
  // Se dibujan con rectángulos en un contexto cualquiera (aquí, uno falso que cuenta)
  let rectangulos = 0;
  const ctx = new Proxy({}, { get: (_, k) => (k === 'fillRect' ? () => { rectangulos += 1; } : () => {}), set: () => true });
  p.dibujar(ctx);
  assert.equal(rectangulos, fijos);
  p.vaciar();
  assert.equal(p.cuantos, 0);
});

test('el menú principal tiene tu equipo, consejo del míster, accesos a tu club y la entrada «¡Saltan al campo!»', () => {
  const juego = leer('js', 'game', 'juego.js');
  for (const campo of ['once-jugador', 'once-mister', 'consejo', 'accesos', 'escenario', 'salida']) assert.match(juego, new RegExp(`data-campo="${campo}"`), campo);
  assert.match(juego, /data-accion="consejo"[^>]*aria-label="Otro consejo del míster"/);
  assert.match(juego, /¡Saltan al campo!/);
  assert.match(juego, /jugar: \(\) => empezar\(\{ conEntrada: true \}\)/, 'la cortinilla solo sale al pulsar Jugar en el menú');
  assert.match(juego, /reiniciar: empezar,/, '«Jugar otra vez» sigue empezando al momento');
  // Los textos que se animan no se leen dos veces: título, bufanda, escenario y cortinilla van ocultos a los lectores
  assert.match(juego, /class="hub__cabecera" aria-hidden="true"/);
  assert.match(juego, /class="salida" data-campo="salida" aria-hidden="true" hidden/);
  assert.match(juego, /class="juego__focos" aria-hidden="true"/);
  // El consejo que rota no es una región viva (solo se anuncia al pedir otro)
  assert.doesNotMatch(juego, /data-campo="consejo"[^>]*aria-live/);
});

test('las animaciones del menú respetan prefers-reduced-motion y se paran cuando no se ven', () => {
  const juego = leer('js', 'game', 'juego.js');
  const fx = leer('js', 'game', 'menu-fx.js');
  const css = leer('css', 'juego.css');
  assert.match(juego, /const efectosMenu = \(\) => ajustes\.efectos && !movimientoReducido\(\)/);
  assert.match(juego, /if \(pantallaActual === 'hub' && efectosMenu\(\)\) \{\s*papelitos\.paso/);
  assert.match(fx, /if \(reducido\) return;/, 'sin entradas escalonadas');
  assert.match(fx, /salida--suave/, 'la cortinilla se queda en un fundido');
  const reducido = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reducido, /animation-delay: 0s !important/);
  assert.match(reducido, /\.juego__focos \{ display: none !important; \}/);
  // Focos solo con el menú a la vista
  assert.match(css, /\.juego__focos \{[^}]*display: none;/);
  assert.match(css, /\.juego--en-hub \.juego__focos \{ display: block; \}/);
  // El módulo de efectos no toca el DOM al importarse (se carga en node:test)
  assert.doesNotMatch(fx.replace(/\/\/.*$/gm, ''), /^(?:const|let|var)\s+\w+\s*=\s*(?:document|window)\b/m);
});

test('pausa: árbol de habilidades y combinaciones, ajustes, y salir pide confirmación (y guarda lo conseguido)', () => {
  const juego = leer('js', 'game', 'juego.js');
  assert.match(juego, /data-campo="pausa-arbol"/, 'el árbol de la partida está en la pausa');
  assert.match(juego, /data-pantalla="pausa"[\s\S]*data-accion="ajustesPartida"/, 'los ajustes también desde la pausa');
  assert.match(juego, /data-accion="pedirSalir"/, '«Volver al menú» primero pregunta');
  assert.match(juego, /data-campo="pausa-confirmar"[\s\S]*data-accion="hub"[\s\S]*data-accion="cancelarSalir"/, 'confirmar o seguir jugando');
  assert.match(juego, /pedirSalir: \(\) => confirmarSalida\(true\)/);
  assert.match(juego, /if \(fase !== 'fin'\) cerrarPartida\(\);/, 'al salir se cierra la partida en el servidor: se guarda lo conseguido');
  assert.match(juego, /fase = 'pausa';\s*entrada\.soltarTodo\(\);\s*pintarPausa\(\);/, 'el árbol se pinta al pausar');
});

test('ajustes: «Listo» vuelve a la pausa si estás en partida (y al menú si vienes del menú)', () => {
  const juego = leer('js', 'game', 'juego.js');
  const ajustes = juego.slice(juego.indexOf('data-pantalla="ajustes"'), juego.indexOf('</section>', juego.indexOf('data-pantalla="ajustes"')));
  assert.match(ajustes, /data-accion="cerrarAjustes"[^>]*>[^<]*\$\{icono\('volver', 18\)\} Listo/);
  assert.match(juego, /function cerrarAjustes\(\) \{\s*if \(fase === 'pausa'\) \{ pintarPausa\(\); mostrar\('pausa'\); \}\s*else irAlHub\('hub'\);/);
});
