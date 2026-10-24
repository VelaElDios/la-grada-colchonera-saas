// Simulación del juego: sin dibujar nada y sin tocar el DOM, así se puede probar con node:test.
// Estados: 'jugando' → 'mejora' (elegir mejora al subir de nivel) → 'jugando' ... → 'fin'.
import {
  JUGADOR, POSICIONES, PERSONAJES, ENTRENADORES, ARMAS, PASIVAS, EXTRAS, ULTI, MOVIMIENTO, TERRENO, PREMIOS, FISICA, xpParaSubir,
} from './config.js';
import { crearRng, crearCuadricula, normalizar } from './util.js';
import { actualizarArmas, actualizarAcciones } from './armas.js';
import {
  curar, danar, aturdir, crearParticulas, crearTexto,
} from './combate.js';
import { generarOpciones, aplicarMejora, recalcular } from './mejoras.js';
import { oleadaEn, empezarOleada, actualizarApariciones, reciclarLejanos } from './oleadas.js';
import { actualizarJefe, danarJugador } from './jefes.js';
import { actualizarUlti, cargarUlti, lanzarUlti } from './ulti.js';
import { crearTerreno, zonaEn, resolver, tocaGrada, rayoLibre } from './terreno.js';
import { comportamiento } from './rivales.js';

const SIN_ENTRADA = { x: 0, y: 0 };

/**
 * @param {object} [opciones]
 * @param {number} [opciones.semilla] Semilla del generador aleatorio
 * @param {boolean} [opciones.efectosReducidos] Sin partículas ni sacudidas (accesibilidad)
 * @param {string} [opciones.personaje] Clave de PERSONAJES (ver config.js)
 * @param {string} [opciones.entrenador] Clave de ENTRENADORES (cholo, aragones)
 * @param {boolean} [opciones.pasilloMenu] Deja libre de obstáculos la franja por la que pasea el muñeco del menú
 */
export function crearMundo({
  semilla = Date.now(), efectosReducidos = false, personaje = 'koke', entrenador = 'cholo', pasilloMenu = false,
} = {}) {
  const pj = PERSONAJES[personaje] ?? PERSONAJES.koke;
  const clavePersonaje = PERSONAJES[personaje] ? personaje : 'koke';
  const claveEntrenador = ENTRENADORES[entrenador] ? entrenador : 'cholo';
  const posicion = POSICIONES[pj.posicion];

  const armas = {};
  Object.keys(ARMAS).forEach((k) => { armas[k] = { nivel: 0, cd: 0 }; });
  armas[ARMAS[pj.armaInicial] ? pj.armaInicial : posicion.armaInicial] = { nivel: 1, cd: 0.3 };
  const pasivas = {};
  Object.keys(PASIVAS).forEach((k) => { pasivas[k] = 0; });
  const extras = {};
  Object.keys(EXTRAS).forEach((k) => { extras[k] = 0; });

  const mundo = {
    semilla,
    terreno: crearTerreno(semilla, { pasillo: pasilloMenu ? 190 : 0 }),
    rng: crearRng(semilla),
    efectosReducidos,
    tiempo: 0,
    estado: 'jugando',
    oleada: 1,
    temporizadorAparicion: 0.6,
    jugador: {
      personaje: clavePersonaje,
      entrenador: claveEntrenador,
      posicion: pj.posicion,
      x: 0,
      y: 0,
      r: JUGADOR.radio,
      vida: 1,
      vidaMax: 1,
      velBase: posicion.vel,
      dirX: 1,
      dirY: 0,
      vx: 0, // velocidad actual (con inercia)
      vy: 0,
      polvo: 0,
      moviendo: false,
      ritmo: 0, // 0..1: sube corriendo y baja parado
      quieto: 0, // segundos seguidos sin moverse
      zona: null, // 'barro' | 'lluvia' | null según dónde pisa
      invul: 0,
      flash: 0,
      xp: 0,
      nivel: 1,
      bajas: 0,
      jefes: 0,
      angBanderines: 0,
      ladoBufanda: false,
      banderines: [],
      armas,
      pasivas,
      extras,
      mult: { vel: 1, dano: 1, cuerpo: 1, disparo: 1, xp: 1, cd: 1, armadura: 0 },
      radioIman: JUGADOR.radioImanBase,
      regen: 0,
      puedeDisparar: true,
      ulti: { carga: 0, max: ULTI.base, usos: 0 },
      sinergias: [], // claves de las combinaciones activas
      dash: null, // regate o entrada en curso
      escudo: 0, // segundos que le quedan a la barrera
      escudoRadio: 60,
      contra: null, // contragolpe en curso { t, vel, dano }
      animo: 0, // segundos que le quedan al bonus de daño del Cholo
      furia: 0, // segundos que le quedan a la Furia Roja de Luis
      bonoAnimo: ENTRENADORES.cholo.ulti.bonoDano,
    },
    enemigos: [],
    proyectiles: [],
    disparosEnemigos: [],
    gemas: [],
    curas: [],
    premios: [],
    temporizadorPremio: 4,
    tajos: [],
    ondas: [],
    rayos: [],
    tarjetas: [],
    impactos: [], // marcas de vaselinas, penaltis y otros avisos visuales
    acciones: [], // acciones del jugador programadas { t, hacer }
    jefesVistos: [], // jefes ya salidos en la ronda actual
    sinergiasLogradas: [], // combinaciones conseguidas en esta partida
    avisosJefe: [],
    textos: [],
    particulas: [],
    sacudida: 0,
    congelar: 0,
    camara: null,
    pendientes: 0,
    cargaPendiente: 0,
    opciones: [],
    eventos: [],
    cuadricula: crearCuadricula(48),
  };
  recalcular(mundo.jugador);
  mundo.jugador.vida = mundo.jugador.vidaMax;
  mundo.eventos.push({ tipo: 'oleada', oleada: 1 });
  return mundo;
}

/** Experiencia necesaria para el siguiente nivel del jugador. */
export const xpSiguiente = (mundo) => xpParaSubir(mundo.jugador.nivel);

function ganarExperiencia(mundo, cantidad) {
  const j = mundo.jugador;
  j.xp += cantidad;
  while (j.xp >= xpParaSubir(j.nivel)) {
    j.xp -= xpParaSubir(j.nivel);
    j.nivel += 1;
    mundo.pendientes += 1;
  }
}

function moverJugador(mundo, dt, entrada) {
  const j = mundo.jugador;
  const [dx, dy] = normalizar(entrada.x, entrada.y);
  // Con un joystick la magnitud es analógica (0..1): se respeta
  const fuerza = Math.min(1, Math.hypot(entrada.x, entrada.y));
  j.moviendo = fuerza > 0.05;
  if (dx !== 0 || dy !== 0) {
    j.dirX = dx;
    j.dirY = dy;
  }
  j.zona = zonaEn(mundo.terreno, j.x, j.y);
  const bonoFuria = j.furia > 0 ? ENTRENADORES.aragones.ulti.bonoVel : 1;
  const bonoContra = j.contra && j.contra.t > 0 ? 1 + j.contra.vel : 1;
  const barro = j.zona === 'barro' ? TERRENO.barro : 1;
  const v = j.velBase * j.mult.vel * bonoFuria * bonoContra * barro * fuerza;
  const x0 = j.x;
  const y0 = j.y;
  if (j.dash) {
    // Regate o entrada: avanzas en línea recta a toda velocidad y arrollas a quien cruzas
    const d = j.dash;
    d.t -= dt;
    j.vx = d.dx * d.v;
    j.vy = d.dy * d.v;
    j.moviendo = true;
    golpesDeDash(mundo, d);
    if (d.t <= 0) j.dash = null;
  } else {
    // Aceleración y frenada con algo de inercia: arrancas y paras con ritmo, no de golpe
    const k = 1 - Math.exp(-(j.moviendo ? FISICA.aceleracion : FISICA.frenada) * dt);
    j.vx += (dx * v - j.vx) * k;
    j.vy += (dy * v - j.vy) * k;
  }
  j.x += j.vx * dt;
  j.y += j.vy * dt;
  resolver(mundo.terreno, j); // las gradas no se atraviesan

  // Polvo, salpicaduras de barro o de agua bajo los pies
  j.polvo -= dt;
  if (j.polvo <= 0 && Math.hypot(j.vx, j.vy) > 80) {
    j.polvo = 0.1;
    crearParticulas(mundo, j.x, j.y + j.r, j.zona === 'barro' ? '#6e4b2a' : j.zona === 'lluvia' ? '#bfe3ff' : '#d9e8c0', 2, 45);
  }

  // Moverse tiene premio: el ritmo sube corriendo y se pierde parado
  if (j.moviendo) {
    j.ritmo = Math.min(1, j.ritmo + dt / MOVIMIENTO.rampa);
    j.quieto = 0;
  } else {
    j.ritmo = Math.max(0, j.ritmo - dt / MOVIMIENTO.caida);
    j.quieto += dt;
  }
  mundo.cargaPendiente += Math.hypot(j.x - x0, j.y - y0) * MOVIMIENTO.cargaUlti;

  j.invul = Math.max(0, j.invul - dt);
  j.flash = Math.max(0, j.flash - dt);
  j.escudo = Math.max(0, j.escudo - dt);
  if (j.contra) {
    j.contra.t -= dt;
    if (j.contra.t <= 0) j.contra = null;
  }
  if (j.regen > 0) curar(mundo, j.regen * dt);
}

/** Daño a los rivales que cruza el jugador durante un regate o una entrada. */
function golpesDeDash(mundo, d) {
  const j = mundo.jugador;
  const alcance = j.r + d.ancho / 2;
  mundo.cuadricula.cerca(j.x, j.y, alcance + 40, (e) => {
    if (e.muerto || d.golpeados.has(e.id)) return;
    if ((e.x - j.x) ** 2 + (e.y - j.y) ** 2 > (e.r + alcance) ** 2) return;
    d.golpeados.add(e.id);
    danar(mundo, e, d.dano, normalizar(e.x - j.x + d.dx * 20, e.y - j.y + d.dy * 20), d.empuje, d.tipoDano);
    if (d.aturde) aturdir(mundo, e, d.aturde);
  });
  if (!mundo.efectosReducidos && mundo.ondas.length < 40 && Math.round(mundo.tiempo * 60) % 2 === 0) {
    mundo.ondas.push({ x: j.x, y: j.y + j.r, radio: 14, vida: 0.16, total: 0.16, color: d.color });
  }
}

function moverEnemigos(mundo, dt) {
  const j = mundo.jugador;
  const { cuadricula, enemigos, terreno } = mundo;
  cuadricula.limpiar();
  for (let i = 0; i < enemigos.length; i += 1) cuadricula.insertar(enemigos[i]);

  const decaimiento = Math.exp(-5 * dt);
  for (let i = 0; i < enemigos.length; i += 1) {
    const e = enemigos[i];
    if (e.muerto) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.cdBanderin = Math.max(0, e.cdBanderin - dt);
    e.lento = Math.max(0, e.lento - dt);
    e.aturdido = Math.max(0, (e.aturdido ?? 0) - dt);

    if (e.aturdido > 0) {
      // Aturdido: solo se deja empujar (no se mueve por su cuenta, no ataca y no hace daño)
      e.x += e.kx * dt;
      e.y += e.ky * dt;
      e.kx *= decaimiento;
      e.ky *= decaimiento;
      resolver(terreno, e);
      continue;
    }

    const dist = Math.hypot(j.x - e.x, j.y - e.y);
    const habilidadPropia = e.jefe ? actualizarJefe(mundo, e, dt) : false;
    if (!habilidadPropia) {
      const factor = e.jefe ? 1 : comportamiento(mundo, e, dt, dist);
      let [dx, dy] = e.embestida > 0 ? [e.dirX, e.dirY] : normalizar(j.x - e.x, j.y - e.y);
      // Rodeando una pared: la sigue (pegado a ella) hasta que tenga camino libre hacia ti
      if (e.rodeo && e.embestida <= 0) {
        e.rodeoT += dt;
        e.rayoT -= dt;
        if (e.rayoT <= 0) {
          e.rayoT = 0.15;
          if ((e.rodeoT > 0.4 && rayoLibre(terreno, e.x, e.y, j.x, j.y, 400, e.r)) || e.rodeoT > 7) e.rodeo = 0;
        }
        if (e.rodeo) {
          dx = -e.ny * e.rodeo * 0.95 - e.nx * 0.4;
          dy = e.nx * e.rodeo * 0.95 - e.ny * 0.4;
        }
      }
      const v = (e.lento > 0 ? e.vel * 0.35 : e.vel) * factor;
      e.x += dx * v * dt;
      e.y += dy * v * dt;
    }
    e.x += e.kx * dt;
    e.y += e.ky * dt;
    e.kx *= decaimiento;
    e.ky *= decaimiento;

    // Separación: los rivales no se amontonan en un solo punto
    cuadricula.cerca(e.x, e.y, e.r * 2, (otro) => {
      if (otro === e || otro.muerto) return;
      const ox = e.x - otro.x;
      const oy = e.y - otro.y;
      const minimo = (e.r + otro.r) * 0.85;
      const d2 = ox * ox + oy * oy;
      if (d2 > 0 && d2 < minimo * minimo) {
        const d = Math.sqrt(d2);
        const empuje = ((minimo - d) / d) * 0.5;
        e.x += ox * empuje;
        e.y += oy * empuje;
      }
    });

    // Las gradas también les cierran el paso: la rodean para llegar a ti
    const rodeaba = e.rodeo;
    const choco = resolver(terreno, e, j.x, j.y, e.vel * dt * 0.9);
    if (choco && e.embestida > 0) e.embestida = 0;
    if (choco && !rodeaba && e.rodeo) { e.rodeoT = 0; e.rayoT = 0.4; }
    if (choco) e.chocoVentana = true;
    // Si lleva casi un segundo pegado a una pared sin avanzar, rodea por el otro lado
    e.tAncla = (e.tAncla || 0) + dt;
    if (e.tAncla > 0.9) {
      const avance = Math.hypot(e.x - (e.axx ?? e.x), e.y - (e.ayy ?? e.y));
      if (e.chocoVentana && dist > e.r * 3 && avance < e.vel * 0.9 * 0.3) e.rodeo = -(e.rodeo || 1);
      e.tAncla = 0;
      e.chocoVentana = false;
      e.axx = e.x;
      e.ayy = e.y;
    }

    // Contacto con el jugador
    if (j.invul <= 0 && (e.x - j.x) ** 2 + (e.y - j.y) ** 2 < (e.r + j.r * 0.8) ** 2) {
      danarJugador(mundo, e.dano);
    }
  }
}

function moverProyectiles(mundo, dt) {
  const { proyectiles } = mundo;
  for (let i = 0; i < proyectiles.length; i += 1) {
    const p = proyectiles[i];
    if (p.teledirigido) {
      if (!p.objetivo || p.objetivo.muerto) p.objetivo = buscarObjetivo(mundo, p);
      if (p.objetivo) {
        const [tx, ty] = normalizar(p.objetivo.x - p.x, p.objetivo.y - p.y);
        const [vx, vy] = normalizar(p.vx, p.vy);
        const [nx, ny] = normalizar(vx + (tx - vx) * Math.min(1, 6 * dt), vy + (ty - vy) * Math.min(1, 6 * dt));
        p.vx = nx * 300;
        p.vy = ny * 300;
      }
    }
    if (p.pared) { // la pared: va, y vuelve a tus pies
      p.tIda -= dt;
      if (p.tIda <= 0 && !p.vuelta) {
        p.vuelta = true;
        p.golpeados.clear();
      }
      if (p.vuelta) {
        const j = mundo.jugador;
        const [vx, vy] = normalizar(j.x - p.x, j.y - p.y);
        p.vx = vx * 470;
        p.vy = vy * 470;
        if ((j.x - p.x) ** 2 + (j.y - p.y) ** 2 < 26 * 26) p.vida = 0;
      }
    }
    // Bajo la lluvia los balones corren más
    const k = zonaEn(mundo.terreno, p.x, p.y) === 'lluvia' ? TERRENO.lluvia : 1;
    p.x += p.vx * dt * k;
    p.y += p.vy * dt * k;
    p.rot += dt * 14;
    p.vida -= dt;
    if (p.vida > 0 && !p.vuelta && tocaGrada(mundo.terreno, p.x, p.y, p.r)) p.vida = 0; // se estrella contra la grada
    if (p.vida > 0) {
      mundo.cuadricula.cerca(p.x, p.y, p.r + 24, (e) => {
        if (p.perfora <= 0 || e.muerto || p.golpeados.has(e.id)) return;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (e.r + p.r) ** 2) return;
        p.golpeados.add(e.id);
        p.perfora -= 1;
        danar(mundo, e, p.dano, normalizar(p.vx, p.vy), p.empuje, p.tipoDano ?? 'disparo');
        if (mundo.ondas.length < 40) mundo.ondas.push({ x: p.x, y: p.y, radio: 18, vida: 0.14, total: 0.14 });
      });
    }
    if (p.vida <= 0 || p.perfora <= 0) p.muerto = true;
  }
}

/** Rival más cercano al proyectil (para los balones teledirigidos que han perdido a su objetivo). */
function buscarObjetivo(mundo, p) {
  let mejor = null;
  let mejorD2 = 420 * 420;
  mundo.cuadricula.cerca(p.x, p.y, 420, (e) => {
    if (e.muerto) return;
    const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d2 < mejorD2) {
      mejorD2 = d2;
      mejor = e;
    }
  });
  return mejor;
}

function moverDisparosEnemigos(mundo, dt) {
  const j = mundo.jugador;
  for (let i = 0; i < mundo.disparosEnemigos.length; i += 1) {
    const d = mundo.disparosEnemigos[i];
    if (d.giro) { // balones con rosca: giran mientras vuelan
      const c = Math.cos(d.giro * dt);
      const s = Math.sin(d.giro * dt);
      [d.vx, d.vy] = [d.vx * c - d.vy * s, d.vx * s + d.vy * c];
    }
    const k = zonaEn(mundo.terreno, d.x, d.y) === 'lluvia' ? TERRENO.lluvia : 1;
    d.x += d.vx * dt * k;
    d.y += d.vy * dt * k;
    d.rot += dt * 10;
    d.vida -= dt;
    if (d.vida > 0 && tocaGrada(mundo.terreno, d.x, d.y, d.r)) d.vida = 0;
    if (d.vida > 0 && j.escudo > 0 && (d.x - j.x) ** 2 + (d.y - j.y) ** 2 < (d.r + j.escudoRadio) ** 2) {
      d.vida = 0; // la barrera los rechaza
      crearParticulas(mundo, d.x, d.y, '#9fd8ff', 4, 120);
      continue;
    }
    if (d.vida > 0 && j.invul <= 0 && (d.x - j.x) ** 2 + (d.y - j.y) ** 2 < (d.r + j.r * 0.8) ** 2) {
      danarJugador(mundo, d.dano);
      d.vida = 0;
    }
  }
}

/** Premios por el campo: aparecen casi siempre por delante de ti, para que haya que ir a por ellos. */
function actualizarPremios(mundo, dt) {
  const j = mundo.jugador;
  mundo.temporizadorPremio -= dt;
  if (mundo.temporizadorPremio <= 0 && mundo.premios.length < PREMIOS.max) {
    mundo.temporizadorPremio = PREMIOS.cada;
    const ang = Math.atan2(j.dirY, j.dirX) + mundo.rng.rango(-1.3, 1.3);
    const d = mundo.rng.rango(PREMIOS.distMin, PREMIOS.distMax);
    const x = j.x + Math.cos(ang) * d;
    const y = j.y + Math.sin(ang) * d;
    if (!tocaGrada(mundo.terreno, x, y, 30)) {
      const tipos = Object.entries(PREMIOS.tipos);
      let punto = mundo.rng.siguiente() * tipos.reduce((suma, [, t]) => suma + t.peso, 0);
      let tipo = tipos[0][0];
      for (const [clave, t] of tipos) {
        punto -= t.peso;
        if (punto <= 0) { tipo = clave; break; }
      }
      mundo.premios.push({ tipo, x, y, recogido: false });
    }
  }
  for (let i = 0; i < mundo.premios.length; i += 1) {
    const p = mundo.premios[i];
    const d2 = (p.x - j.x) ** 2 + (p.y - j.y) ** 2;
    if (d2 > PREMIOS.distBorrado ** 2) { p.recogido = true; continue; }
    if (d2 < (j.r + 18) ** 2) {
      p.recogido = true;
      cobrarPremio(mundo, p);
    }
  }
}

function cobrarPremio(mundo, p) {
  const j = mundo.jugador;
  if (p.tipo === 'cura') {
    curar(mundo, j.vidaMax * 0.25);
    crearTexto(mundo, p.x, p.y - 12, '+vida', '#4ade80');
    mundo.eventos.push({ tipo: 'cura' });
  } else if (p.tipo === 'xp') {
    ganarExperiencia(mundo, xpParaSubir(j.nivel) * 0.35);
    crearTexto(mundo, p.x, p.y - 12, '+experiencia', '#5cc8ff');
    mundo.eventos.push({ tipo: 'gema' });
  } else if (p.tipo === 'energia') {
    cargarUlti(mundo, j.ulti.max * 0.3);
    crearTexto(mundo, p.x, p.y - 12, '+ulti', '#ffd166');
    mundo.eventos.push({ tipo: 'gema' });
  } else {
    mundo.gemas.forEach((g) => { g.atraida = true; });
    crearTexto(mundo, p.x, p.y - 12, '¡imán!', '#ff7b8b');
    mundo.eventos.push({ tipo: 'gema' });
  }
  crearParticulas(mundo, p.x, p.y, '#ffd166', 10, 160);
}

function recogerObjetos(mundo, dt) {
  const j = mundo.jugador;
  const radioIman = j.radioIman * (j.furia > 0 ? ENTRENADORES.aragones.ulti.iman : 1);
  const iman2 = radioIman ** 2;
  const gemas = mundo.gemas;
  for (let i = 0; i < gemas.length; i += 1) {
    const g = gemas[i];
    const d2 = (g.x - j.x) ** 2 + (g.y - j.y) ** 2;
    if (!g.atraida && d2 < iman2) g.atraida = true;
    if (g.atraida) {
      const [dx, dy] = normalizar(j.x - g.x, j.y - g.y);
      const v = 300 + 200 * (1 - Math.min(1, Math.sqrt(d2) / radioIman));
      g.x += dx * v * dt;
      g.y += dy * v * dt;
    }
    if (d2 < (j.r + 10) ** 2) {
      g.recogida = true;
      ganarExperiencia(mundo, g.valor * j.mult.xp * (1 + MOVIMIENTO.bonoXp * j.ritmo));
      mundo.eventos.push({ tipo: 'gema' });
    }
  }
  for (let i = 0; i < mundo.curas.length; i += 1) {
    const c = mundo.curas[i];
    if ((c.x - j.x) ** 2 + (c.y - j.y) ** 2 < (j.r + 14) ** 2) {
      c.recogida = true;
      curar(mundo, 25);
      mundo.eventos.push({ tipo: 'cura' });
    }
  }
}

function actualizarEfectos(mundo, dt) {
  mundo.sacudida = mundo.efectosReducidos ? 0 : Math.max(0, mundo.sacudida - dt);
  for (const lista of [mundo.tajos, mundo.ondas, mundo.textos, mundo.particulas, mundo.rayos, mundo.tarjetas, mundo.avisosJefe, mundo.impactos]) {
    for (let i = 0; i < lista.length; i += 1) lista[i].vida -= dt;
  }
  for (let i = 0; i < mundo.textos.length; i += 1) mundo.textos[i].y -= 28 * dt;
  for (let i = 0; i < mundo.tarjetas.length; i += 1) mundo.tarjetas[i].y -= 20 * dt;
  for (let i = 0; i < mundo.avisosJefe.length; i += 1) {
    const a = mundo.avisosJefe[i];
    if (a.seguir && !a.seguir.muerto) {
      a.x = a.seguir.x;
      a.y = a.seguir.y;
    }
  }
  for (let i = 0; i < mundo.particulas.length; i += 1) {
    const p = mundo.particulas[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
}

/** Quita de una lista los elementos que ya no valen (muertos, recogidos o con la vida agotada). */
function compactar(lista, vale) {
  let k = 0;
  for (let i = 0; i < lista.length; i += 1) if (vale(lista[i])) lista[k++] = lista[i];
  lista.length = k;
}

/**
 * Avanza la simulación `dt` segundos.
 * @param {object} entrada Dirección deseada { x, y } (cada componente entre -1 y 1)
 */
export function avanzar(mundo, dt, entrada = SIN_ENTRADA) {
  if (mundo.estado !== 'jugando') return;
  if (mundo.congelar > 0) { // «hit stop»: un instante de pausa en los golpes fuertes
    mundo.congelar -= dt;
    return;
  }
  const j = mundo.jugador;
  mundo.tiempo += dt;

  const oleada = oleadaEn(mundo.tiempo);
  if (oleada !== mundo.oleada) {
    mundo.oleada = oleada;
    empezarOleada(mundo);
  }

  moverJugador(mundo, dt, entrada);
  actualizarApariciones(mundo, dt);
  moverEnemigos(mundo, dt);
  actualizarAcciones(mundo, dt);
  actualizarArmas(mundo, dt);
  moverProyectiles(mundo, dt);
  moverDisparosEnemigos(mundo, dt);
  recogerObjetos(mundo, dt);
  actualizarPremios(mundo, dt);
  actualizarEfectos(mundo, dt);
  reciclarLejanos(mundo);

  compactar(mundo.enemigos, (e) => !e.muerto);
  compactar(mundo.proyectiles, (p) => !p.muerto);
  compactar(mundo.disparosEnemigos, (d) => d.vida > 0);
  compactar(mundo.gemas, (g) => !g.recogida);
  compactar(mundo.curas, (c) => !c.recogida);
  compactar(mundo.premios, (p) => !p.recogido);
  compactar(mundo.tajos, (t) => t.vida > 0);
  compactar(mundo.ondas, (o) => o.vida > 0);
  compactar(mundo.rayos, (r) => r.vida > 0);
  compactar(mundo.tarjetas, (t) => t.vida > 0);
  compactar(mundo.impactos, (t) => t.vida > 0);
  compactar(mundo.avisosJefe, (a) => a.vida > 0);
  compactar(mundo.textos, (t) => t.vida > 0);
  compactar(mundo.particulas, (p) => p.vida > 0);

  // La ulti se carga con las bajas de este fotograma
  if (mundo.cargaPendiente > 0) {
    cargarUlti(mundo, mundo.cargaPendiente);
    mundo.cargaPendiente = 0;
  }
  actualizarUlti(mundo, dt);

  if (j.vida <= 0) {
    j.vida = 0;
    mundo.estado = 'fin';
    crearParticulas(mundo, j.x, j.y, '#c8102e', 24, 220);
    mundo.eventos.push({ tipo: 'fin' });
    return;
  }
  if (mundo.pendientes > 0) abrirMejora(mundo);
}

function abrirMejora(mundo) {
  mundo.estado = 'mejora';
  mundo.opciones = generarOpciones(mundo);
  mundo.eventos.push({ tipo: 'nivel', nivel: mundo.jugador.nivel });
}

/** El jugador elige una mejora. Devuelve true si era válida. */
export function elegirMejora(mundo, id) {
  if (mundo.estado !== 'mejora' || !aplicarMejora(mundo, id)) return false;
  mundo.pendientes -= 1;
  if (mundo.pendientes > 0) abrirMejora(mundo);
  else {
    mundo.estado = 'jugando';
    mundo.opciones = [];
  }
  return true;
}

/** Lanza la ulti del entrenador si está cargada. Devuelve true si se ha lanzado. */
export const usarUlti = (mundo) => lanzarUlti(mundo);

/** Resumen de la partida para la pantalla final. */
export function resumen(mundo) {
  const j = mundo.jugador;
  return {
    tiempo: mundo.tiempo, oleada: mundo.oleada, nivel: j.nivel, bajas: j.bajas, jefes: j.jefes, personaje: j.personaje, entrenador: j.entrenador,
    sinergias: [...mundo.sinergiasLogradas],
  };
}
