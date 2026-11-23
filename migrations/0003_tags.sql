-- Tags (etiquetas) por nota e idioma. Una nota tiene una sola categoría, pero puede tener
-- varios tags para encontrarla desde distintos temas (p. ej. "OpenAI", "Brechas de datos").
-- Cada traducción tiene sus propios tags: el nombre se muestra tal cual y el slug arma la URL.
CREATE TABLE post_tags (
  post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  locale   TEXT    NOT NULL CHECK (locale IN ('es', 'en')),
  slug     TEXT    NOT NULL,
  name     TEXT    NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, locale, slug)
);

CREATE INDEX idx_post_tags_locale_slug ON post_tags (locale, slug);
