CREATE TABLE IF NOT EXISTS campanas_guardadas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  campana_id INTEGER NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, campana_id)
);
