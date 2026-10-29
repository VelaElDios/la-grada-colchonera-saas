-- Una cuenta eliminada (baja lógica) ya no ocupa su email: con ese email se puede crear otra cuenta,
-- también entrando con Google. La fila eliminada se conserva (historial y auditoría), pero el email
-- solo tiene que ser único entre las cuentas que no están eliminadas.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_vigente ON users (email) WHERE status <> 'deleted';

-- Las cuentas que ya estaban eliminadas sueltan su mote y salen del ranking.
UPDATE users SET apodo_clave = NULL WHERE status = 'deleted';
DELETE FROM juego_records WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted');
