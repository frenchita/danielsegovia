-- Estado interno del sitio (p. ej. última revisión de notas programadas por el cron).
CREATE TABLE site_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
