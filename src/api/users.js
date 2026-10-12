// Rutas HTTP de usuarios. Solo traducen petición/respuesta: las reglas están en userService.
// (El alta de usuarios se hace con el registro: POST /api/auth/register.)
// Todas exigen sesión (se aplica en api/index.js) y, además, el rol adecuado:
//   - listado y cambio de rol: solo administradores;
//   - consultar o eliminar una cuenta: el propio usuario o un administrador.
// (Express 5 pasa automáticamente al manejador de errores lo que lancen las funciones async.)
const express = require('express');

const { ROLES } = require('../models/user');
const { requireRole, requireSelfOrRole } = require('./currentUser');

function createUsersRouter({ userService }) {
  const router = express.Router();
  const soloAdmin = requireRole(ROLES.ADMIN);
  const propioOAdmin = requireSelfOrRole(ROLES.ADMIN);

  // Listado de usuarios con email, rol y estado (panel de administración)
  router.get('/', soloAdmin, async (req, res) => {
    res.json(await userService.listUsers());
  });

  // Comprobar si un usuario está activo
  router.get('/:id/active', propioOAdmin, async (req, res) => {
    const active = await userService.isUserActive(req.params.id);
    res.json({ id: req.params.id, active });
  });

  // Cambiar el rol de un usuario: { "role": "admin" | "user" }
  router.patch('/:id/role', soloAdmin, async (req, res) => {
    const user = await userService.changeRole(req.user, req.params.id, req.body?.role);
    req.log.info('user.role_changed', 'Rol de usuario cambiado', { actorId: req.user.id, targetId: user.id, role: user.role });
    res.json(user);
  });

  // Eliminar un usuario (la lógica vuelve a comprobar los permisos y protege al último admin)
  router.delete('/:id', propioOAdmin, async (req, res) => {
    await userService.deleteUser(req.user, req.params.id);
    req.log.info('user.deleted', 'Cuenta eliminada', {
      actorId: req.user.id,
      targetId: req.params.id,
      self: req.user.id === req.params.id,
    });
    res.status(204).end();
  });

  return router;
}

module.exports = { createUsersRouter };
