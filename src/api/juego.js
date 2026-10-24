// Rutas HTTP del juego. Solo traducen petición/respuesta: las reglas están en juegoService. Todas exigen sesión.
const express = require('express');

function createJuegoRouter({ juegoService }) {
  const router = express.Router();

  // Club del usuario: plantilla, estadísticas, fichas y puntos
  router.get('/perfil', async (req, res) => {
    res.json(await juegoService.obtenerPerfil(req.user));
  });

  // Empieza una partida con { personaje, entrenador }
  router.post('/partidas', async (req, res) => {
    res.status(201).json(await juegoService.iniciarPartida(req.user, req.body));
  });

  // Termina la partida con { tiempo, nivel, jefes, bajas }
  router.post('/partidas/:id/fin', async (req, res) => {
    res.json(await juegoService.finalizarPartida(req.user, req.params.id, req.body));
  });

  // Gasta una ficha de contrato
  router.post('/contratar', async (req, res) => {
    res.json(await juegoService.contratar(req.user));
  });

  // Gasta un punto de entrenamiento: { personaje, estadistica }
  router.post('/entrenar', async (req, res) => {
    res.json(await juegoService.entrenar(req.user, req.body));
  });

  // Modo pruebas (solo administradores): todos los jugadores y puntos de sobra
  router.post('/desbloquear', async (req, res) => {
    res.json(await juegoService.desbloquearTodo(req.user));
  });

  // Mote y avatar: { apodo, avatar } (cualquiera de los dos)
  router.put('/identidad', async (req, res) => {
    const usuario = await juegoService.ponerIdentidad(req.user, req.body ?? {});
    req.log.info('juego.identidad', 'Mote o avatar cambiado', { userId: req.user.id });
    res.json(usuario);
  });

  // Clasificación multijugador
  router.get('/ranking', async (req, res) => {
    res.json(await juegoService.ranking(req.user, Number(req.query.limite) || 20));
  });

  return router;
}

module.exports = { createJuegoRouter };
