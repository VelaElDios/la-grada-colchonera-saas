-- Identidad en el juego: un mote (único sin distinguir mayúsculas ni tildes, guardado normalizado en
-- apodo_clave) y un avatar (la cara de un jugador o de un entrenador que tengas: 'p:koke', 'e:cholo').
-- El ranking guarda también el avatar para mostrarlo junto al mote.
ALTER TABLE users ADD COLUMN IF NOT EXISTS apodo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apodo_clave TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apodo_clave ON users (apodo_clave);
ALTER TABLE juego_records ADD COLUMN IF NOT EXISTS avatar TEXT;
