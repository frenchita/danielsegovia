# danielsegovia.com

Sitio personal y blog de Daniel Segovia. HTML 100 % estático generado con **Astro**, servido por **Cloudflare Workers Static Assets**, con una API mínima en el mismo Worker sobre **Cloudflare D1**.

```
n8n ──POST /api/posts──► Worker (API) ──► D1
                              │
                              └─► Deploy Hook ──► Workers Builds: astro build (lee GET /api/posts) ──► deploy
Visitante ──► Cloudflare edge ──► HTML estático (sin JS, CSS inline)
```

- Las páginas se generan en el build; el Worker solo corre para `/api/*`.
- Al publicar/editar/borrar una nota visible, la API dispara el Deploy Hook y el sitio se regenera (~1 min).
- Un cron cada 15 minutos regenera el sitio si alguna nota programada (`publish_at` futuro) pasó su hora. La marca de la última revisión se guarda en D1, así que ninguna nota se pierde aunque falle una ejecución.
- El mismo cron avisa a **IndexNow** (Bing, Yandex…) las URL publicadas o editadas, con 10 min de margen para que el deploy termine. La clave está en `src/lib/site.ts` (`INDEXNOW_KEY`) y se verifica en `/<clave>.txt` (`public/`).
- Si la API no responde durante el build, **el build falla** (nunca se publica un sitio vacío).

## Estructura

| Ruta | Qué es |
|---|---|
| `worker/index.ts` | API (router, validación, D1, rebuild) |
| `worker/sanitize.ts` | Sanitizado de HTML con allowlist (HTMLRewriter) |
| `migrations/` | Schema de D1 |
| `src/lib/categories.ts` | Categorías: slugs, nombres y descripciones ES/EN (fuente única) |
| `src/lib/site.ts` | Config: redes, tamaño de página |
| `src/lib/i18n.ts` | Textos de la interfaz ES/EN |
| `src/lib/content.ts` | Carga del contenido desde la API en el build |
| `src/lib/schema.ts` | JSON-LD (Person, WebSite, BlogPosting, BreadcrumbList, CollectionPage, ProfilePage) |
| `src/views/` | Vistas compartidas ES/EN |
| `src/pages/` | Rutas (español en la raíz, inglés en `/en/`) |

## Rutas públicas

| Español | Inglés |
|---|---|
| `/` | `/en/` |
| `/sobre-mi/` | `/en/about/` |
| `/{categoria}/` · `/{categoria}/page/2/` | `/en/{category}/` (solo si hay notas en inglés) |
| `/{categoria}/{slug}/` | `/en/{category}/{slug}/` |
| `/buscar/` | `/en/search/` |
| `/rss.xml` | `/en/rss.xml` |

Además: `/sitemap.xml` (con hreflang), `/robots.txt`, `/og/**.png` (imágenes Open Graph generadas en el build).

Páginas de confianza: `/contacto/` y `/privacidad/` (y `/en/contact/`, `/en/privacy/`). `/about`, `/contact` y `/privacy` redirigen con 301 (`public/_redirects`).

### Para agentes de IA

- `/llms.txt`: qué es el sitio, **cuándo usarlo**, cómo consultarlo, categorías y notas recientes. También en `/?mode=agent`.
- **Markdown por negociación**: cualquier página responde Markdown con `Accept: text/markdown`, y está disponible en `<url>index.md`. Lo genera `scripts/build-markdown.mjs` después del build. Cada página HTML enlaza su versión Markdown con `<link rel="alternate" type="text/markdown">`, y `public/_headers` agrega `Vary: Accept`.
- Las rutas inexistentes devuelven un **404 real**: en HTML para navegadores y en Markdown (`text/markdown`) para agentes, con links al sitemap, `llms.txt` y RSS.
- **Sin Worker por visita**: las URL Rewrite Rules de la zona (Cloudflare → Rules → Transform Rules) resuelven todo en el borde:
  1. *Páginas de confianza*: `/about`, `/contact` y `/privacy` responden 200 con el contenido de `/sobre-mi/`, `/contacto/` y `/privacidad/` (canonical a la página en español).
  2. *Vista para agentes*: `/` con `mode=agent` → `/llms.txt`.
  3. *Markdown para agentes* (va última): si `Accept` contiene `text/markdown` y la ruta no tiene extensión ni es `/api/`, se reescribe a `/api/md?p=<ruta>`. El Worker **solo corre en esos pedidos**: devuelve el `index.md` de la página o un 404 en Markdown.

Categorías: `tutoriales` (tutorials), `actualidad` (news), `inteligencia-artificial` (artificial-intelligence), `seguridad` (security), `arquitectura` (architecture), `negocios` (business).

## API

Base: `https://danielsegovia.com/api`. Las escrituras requieren `Authorization: Bearer <API_TOKEN>`.

### `POST /api/posts` — crear (o actualizar si ya existe el slug en español)

```json
{
  "category": "inteligencia-artificial",
  "status": "published",
  "publish_at": "2026-11-23T09:42:00-03:00",
  "translations": {
    "es": {
      "title": "Título de la nota",
      "slug": "titulo-de-la-nota",
      "excerpt": "Resumen de 20 a 320 caracteres. Se usa como meta description y en las tarjetas.",
      "content_html": "<p>Contenido con <strong>negrita</strong>, <em>cursiva</em>, <u>subrayado</u>, <a href=\"https://...\">links</a>, listas y tablas.</p>"
    },
    "en": { "title": "...", "slug": "...", "excerpt": "...", "content_html": "..." }
  }
}
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `category` o `category_id` | sí | key (`seguridad`), slug en inglés (`security`) o id (1–6) |
| `status` | no | `draft` (default) o `published` |
| `publish_at` | no | Fecha ISO 8601 **con zona horaria** (`-03:00` o `Z`); sin zona horaria se rechaza. Fecha futura = programada: la nota se ve después de esa hora (como mucho ~15 min de demora más el rebuild), pero en el sitio, el JSON-LD y el RSS figura la hora exacta de `publish_at`. Si se envía sin `status`, se asume `published`. Si se publica sin fecha, se usa la actual. `published_at` funciona como alias |
| `translations.es` | sí | `en` es opcional |
| `slug` | sí | `a-z`, `0-9` y guiones, 3–120 caracteres, único por idioma |
| `title` | sí | 5–200 caracteres |
| `excerpt` | sí | 20–320 caracteres |
| `content_html` | sí | Se sanitiza (ver abajo) |

Respuestas: `201` creada · `200` actualizada (mismo slug `es`) · `401` sin token · `409` slug usado por otra nota · `422` validación (el mensaje dice qué campo).

**HTML permitido:** `p br hr strong em u s del mark sub sup small a h2 h3 h4 ul ol li blockquote q cite code pre kbd abbr table caption thead tbody tfoot tr th td figure figcaption dl dt dd`. `b`/`i`/`h1` se convierten en `strong`/`em`/`h2`. Se eliminan scripts, estilos, iframes, imágenes, formularios, comentarios y todos los atributos salvo `href`/`title` (links), `colspan`/`rowspan`/`scope` (tablas), `start` (ol), `id` (headings) y `cite`. Los links externos se abren en una pestaña nueva con `rel="noopener noreferrer"`.

**Bloques de código:** `<pre><code class="language-bash">…</code></pre>` se muestra en una caja con el lenguaje y un botón **Copiar** (la única clase que se conserva es `language-xxx`). La guía completa de publicación y redacción, con un ejemplo de POST, está en [docs/guia-publicacion.md](docs/guia-publicacion.md).

### Otros endpoints de escritura (con token)

- `PATCH /api/posts/:id`: actualización parcial (`status`, `category`, `publish_at`, `translations`). `"translations": { "en": null }` borra la traducción en inglés.
- `DELETE /api/posts/:id`
- `GET /api/posts/:id`: nota completa, incluidos borradores.
- `GET /api/admin/posts?status=draft`: listado con borradores.
- `POST /api/rebuild`: fuerza un rebuild del sitio.

Ejemplo, publicar un borrador:

```bash
curl -X PATCH https://danielsegovia.com/api/posts/42 \
  -H "Authorization: Bearer $API_TOKEN" -H "content-type: application/json" \
  -d '{"status":"published"}'
```

### Lectura pública (solo notas publicadas y visibles)

- `GET /api/posts?page=1&per_page=50`: todas las notas con contenido (lo usa el build).
- `GET /api/posts/:slug?locale=es`: nota, relacionadas y categorías.
- `GET /api/home?locale=es`: las 6 categorías con su último post.
- `GET /api/categories`
- `GET /api/categories/:slug?locale=es&page=1`
- `GET /api/health`

## Desarrollo local

```bash
npm install
npm run db:migrate:local
echo "API_TOKEN=local-dev-token" > .dev.vars
npm run dev:api                      # Worker + D1 local en http://localhost:8787
node scripts/seed-dev.mjs            # notas de ejemplo (solo localhost)
CONTENT_API=http://localhost:8787/api npm run dev     # Astro dev en http://localhost:4321
CONTENT_API=http://localhost:8787/api npm run build   # build completo (luego se ve en :8787)
npm run check                        # type-check de Astro y del Worker
```

## Puesta en producción (una sola vez)

1. Crear la base: `npx wrangler d1 create danielsegovia` y poner el `database_id` en `wrangler.jsonc`.
2. Aplicar migraciones: `npm run db:migrate:remote`.
3. Secrets: `npx wrangler secret put API_TOKEN` (token largo y aleatorio para n8n).
4. En Workers Builds (dashboard → Worker → Settings → Builds):
   - Build command: `npm run build`.
   - Deploy command: `npx wrangler deploy` (ya configurado).
   - Variable de build (solo para el primer deploy): `ALLOW_EMPTY_CONTENT=1`, porque la API todavía no existe. Quitarla después.
   - Crear un **Deploy Hook** para `main` y guardarlo como secret: `npx wrangler secret put DEPLOY_HOOK_URL`.
5. Merge a `main` → deploy.
6. Search Console: enviar `https://danielsegovia.com/sitemap.xml`.

Analytics: Cloudflare Web Analytics ya está activo en la zona con instalación automática (no requiere código).
