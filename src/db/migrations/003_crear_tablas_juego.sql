-- Progresión del juego ligada a la cuenta: el club de cada usuario y su mejor partida (ranking).
-- `datos` guarda la plantilla, las estadísticas de entrenamiento y los contadores (ver public/js/game/club.js).
-- `version` evita que dos peticiones simultáneas gasten dos veces la misma ficha o punto.
CREATE TABLE IF NOT EXISTS juego_perfiles (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  datos      JSONB NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mejor partida de cada usuario (la que más tiempo duró).
CREATE TABLE IF NOT EXISTS juego_records (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  alias      TEXT NOT NULL,
  personaje  TEXT NOT NULL,
  entrenador TEXT NOT NULL,
  tiempo     INTEGER NOT NULL,
  nivel      INTEGER NOT NULL,
  jefes      INTEGER NOT NULL DEFAULT 0,
  bajas      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_juego_records_tiempo ON juego_records (tiempo DESC);
