-- Sesiones de express-session guardadas en la base de datos (formato de connect-pg-simple).
-- Así las sesiones sobreviven a los reinicios del servidor.
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
