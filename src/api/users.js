// Rutas HTTP de usuarios. Solo traducen petición/respuesta: las reglas están en userService.
// (Express 5 pasa automáticamente al manejador de errores lo que lancen las funciones async.)
const express = require('express');
const { requireUser } = require('./currentUser');

function createUsersRouter({ userService }) {
  const router = express.Router();

  // Alta de usuario. El rol NO se acepta desde el cliente: siempre se crea como usuario normal.
  router.post('/', async (req, res) => {
    const user = await userService.createUser({ email: req.body?.email });
    res.status(201).json(user);
  });

  // Listado de usuarios (en el Hito 3 quedará restringido al administrador)
  router.get('/', async (req, res) => {
    res.json(await userService.listUsers());
  });

  // Comprobar si un usuario está activo (en el Hito 3 quedará restringido al administrador)
  router.get('/:id/active', async (req, res) => {
    const active = await userService.isUserActive(req.params.id);
    res.json({ id: req.params.id, active });
  });

  // Eliminar un usuario: requiere saber quién hace la petición
  router.delete('/:id', requireUser, async (req, res) => {
    await userService.deleteUser(req.user, req.params.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { createUsersRouter };
