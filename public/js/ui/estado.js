// Estado compartido de la interfaz: el usuario con sesión iniciada (o null).
const oyentes = new Set();

export const estado = {
  usuario: null,
};

/** Cambia el usuario actual y avisa a quien esté suscrito (por ejemplo, la cabecera). */
export function ponerUsuario(usuario) {
  estado.usuario = usuario;
  oyentes.forEach((fn) => fn(usuario));
}

export function alCambiarUsuario(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export const esAdmin = () => estado.usuario?.role === 'admin';
