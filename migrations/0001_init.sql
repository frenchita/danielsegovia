-- Categorías: nombres, slugs y descripciones por idioma viven en src/lib/categories.ts.
-- La tabla existe para integridad referencial y orden.
CREATE TABLE categories (
  id         INTEGER PRIMARY KEY,
  key        TEXT    NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

INSERT INTO categories (id, key, sort_order) VALUES
  (1, 'tutoriales', 1),
  (2, 'actualidad', 2),
  (3, 'inteligencia-artificial', 3),
  (4, 'seguridad', 4),
  (5, 'arquitectura', 5),
  (6, 'negocios', 6);

CREATE TABLE posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER NOT NULL REFERENCES categories(id),
  status       TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_url   TEXT,
  published_at TEXT,   -- ISO 8601 UTC (toISOString)
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_posts_status_pub     ON posts (status, published_at DESC);
CREATE INDEX idx_posts_cat_status_pub ON posts (category_id, status, published_at DESC);

CREATE TABLE post_translations (
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  locale       TEXT    NOT NULL CHECK (locale IN ('es', 'en')),
  slug         TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  excerpt      TEXT    NOT NULL,
  content_html TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (post_id, locale),
  UNIQUE (locale, slug)
);
