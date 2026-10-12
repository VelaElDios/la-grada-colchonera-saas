// Capa de acceso a datos: repositorio de usuarios en POSTGRESQL.
// Cumple el mismo contrato que el repositorio en memoria (ver memoryUserRepository.js),
// así la capa de lógica (userService) funciona igual con uno u otro.
const { randomUUID } = require('node:crypto');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Correspondencia entre los campos del modelo (camelCase) y las columnas de la tabla
const COLUMNS = {
  email: 'email',
  passwordHash: 'password_hash',
  role: 'role',
  status: 'status',
  authProvider: 'auth_provider',
  deletedAt: 'deleted_at',
};

const toIso = (value) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());

/** Convierte una fila de la tabla users en un objeto usuario del modelo. */
function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    authProvider: row.auth_provider,
    createdAt: toIso(row.created_at),
    ...(row.password_hash ? { passwordHash: row.password_hash } : {}),
    ...(row.deleted_at ? { deletedAt: toIso(row.deleted_at) } : {}),
  };
}

/**
 * @param {import('pg').Pool} pool Pool de conexiones (src/db/pool.js)
 */
function createPostgresUserRepository(pool) {
  if (!pool) throw new Error('createPostgresUserRepository necesita un pool de PostgreSQL');

  return {
    async create(data) {
      const { rows } = await pool.query(
        `INSERT INTO users (id, email, password_hash, role, status, auth_provider)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          randomUUID(),
          data.email,
          data.passwordHash ?? null,
          data.role ?? 'user',
          data.status,
          data.authProvider ?? 'local',
        ],
      );
      return toUser(rows[0]);
    },

    async findById(id) {
      // Un id que no es UUID no puede existir (y PostgreSQL daría error al compararlo)
      if (typeof id !== 'string' || !UUID_REGEX.test(id)) return null;
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return toUser(rows[0]);
    },

    async findByEmail(email) {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return toUser(rows[0]);
    },

    async findAll() {
      const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at, email');
      return rows.map(toUser);
    },

    async update(id, changes) {
      const fields = Object.keys(changes).filter((field) => field in COLUMNS);
      if (fields.length === 0) return this.findById(id);
      if (typeof id !== 'string' || !UUID_REGEX.test(id)) return null;

      // Consulta parametrizada: los valores nunca se concatenan en el SQL (evita inyección SQL)
      const assignments = fields.map((field, i) => `${COLUMNS[field]} = $${i + 2}`);
      const { rows } = await pool.query(
        `UPDATE users SET ${assignments.join(', ')} WHERE id = $1 RETURNING *`,
        [id, ...fields.map((field) => changes[field])],
      );
      return toUser(rows[0]);
    },
  };
}

module.exports = { createPostgresUserRepository };
