import { CATEGORIES, LOCALES, categoryById, categoryByKey, type Locale } from '../src/lib/categories';
import { sanitizeHtml, textLength } from './sanitize';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Token Bearer para los endpoints de escritura (secret). */
  API_TOKEN?: string;
  /** URL del Deploy Hook de Workers Builds (secret). */
  DEPLOY_HOOK_URL?: string;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Status = 'draft' | 'published';

interface Tag {
  slug: string;
  name: string;
}

interface TranslationOut {
  slug: string;
  title: string;
  excerpt: string;
  content_html?: string;
  tags: Tag[];
  updated_at: string;
}

interface PostOut {
  id: number;
  category: string;
  category_id: number;
  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  translations: Partial<Record<Locale, TranslationOut>>;
}

interface Row {
  id: number;
  category_id: number;
  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content_html?: string;
  t_updated_at: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-robots-tag': 'noindex', ...headers },
  });

const PUBLIC_CACHE = { 'cache-control': 'public, max-age=60, s-maxage=60' };
const NO_STORE = { 'cache-control': 'no-store' };

const nowIso = () => new Date().toISOString();

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ab, bb);
}

function requireAuth(req: Request, env: Env) {
  if (!env.API_TOKEN) throw new HttpError(503, 'API_TOKEN no configurado');
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !timingSafeEqual(token, env.API_TOKEN)) throw new HttpError(401, 'No autorizado');
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 1_000_000) throw new HttpError(413, 'Body demasiado grande (máx. 1 MB)');
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'El body debe ser un objeto JSON válido');
  }
}

function groupRows(rows: Row[]): PostOut[] {
  const map = new Map<number, PostOut>();
  for (const r of rows) {
    let p = map.get(r.id);
    if (!p) {
      p = {
        id: r.id,
        category: categoryById(r.category_id)?.key ?? 'unknown',
        category_id: r.category_id,
        status: r.status,
        published_at: r.published_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        translations: {},
      };
      map.set(r.id, p);
    }
    if (r.locale) {
      const t: TranslationOut = { slug: r.slug, title: r.title, excerpt: r.excerpt, tags: [], updated_at: r.t_updated_at };
      if (r.content_html !== undefined) t.content_html = r.content_html;
      p.translations[r.locale] = t;
    }
  }
  return [...map.values()];
}

/** Agrega los tags de cada traducción (una sola consulta para todas las notas). */
async function attachTags(env: Env, posts: PostOut[]): Promise<PostOut[]> {
  if (posts.length === 0) return posts;
  const byId = new Map(posts.map((p) => [p.id, p]));
  const { results } = await env.DB.prepare(
    `SELECT post_id, locale, slug, name FROM post_tags WHERE post_id IN (SELECT value FROM json_each(?)) ORDER BY post_id, locale, position`,
  )
    .bind(JSON.stringify([...byId.keys()]))
    .all<{ post_id: number; locale: Locale; slug: string; name: string }>();
  for (const r of results) byId.get(r.post_id)?.translations[r.locale]?.tags.push({ slug: r.slug, name: r.name });
  return posts;
}

/** Filas → notas con sus traducciones y tags. */
const loadPosts = (env: Env, rows: Row[]) => attachTags(env, groupRows(rows));

const SELECT_FIELDS = (withContent: boolean) => `
  p.id, p.category_id, p.status, p.published_at, p.created_at, p.updated_at,
  t.locale, t.slug, t.title, t.excerpt, ${withContent ? 't.content_html,' : ''} t.updated_at AS t_updated_at`;

const VISIBLE = `p.status = 'published' AND p.published_at <= ?`;

async function getPostById(env: Env, id: number, withContent = true): Promise<PostOut | null> {
  const { results } = await env.DB.prepare(
    `SELECT ${SELECT_FIELDS(withContent)} FROM posts p LEFT JOIN post_translations t ON t.post_id = p.id WHERE p.id = ?`,
  )
    .bind(id)
    .all<Row>();
  return (await loadPosts(env, results))[0] ?? null;
}

function parseLocale(value: string | null): Locale {
  if (!value) return 'es';
  if ((LOCALES as readonly string[]).includes(value)) return value as Locale;
  throw new HttpError(400, `locale inválido. Valores: ${LOCALES.join(', ')}`);
}

function parsePage(url: URL, maxPerPage: number, defPerPage: number) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const perPage = Math.min(maxPerPage, Math.max(1, Number.parseInt(url.searchParams.get('per_page') ?? String(defPerPage), 10) || defPerPage));
  return { page, perPage, offset: (page - 1) * perPage };
}

// ---------------------------------------------------------------------------
// Validación de entrada
// ---------------------------------------------------------------------------

const SLUG_RE = /^(?=.*[a-z])[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set(['page', 'en', 'api', 'og', 'pagefind', 'rss', 'buscar', 'search']);

interface TranslationIn {
  slug: string;
  title: string;
  excerpt: string;
  content_html: string;
  /** undefined = no tocar los tags existentes; [] = quitarlos todos. */
  tags?: Tag[];
}

const MAX_TAGS = 10;
const TAG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Brechas de datos" → "brechas-de-datos", "C#" → "c-sharp", "C++" → "c-plus-plus". */
function tagSlug(name: string): string {
  return name
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** Acepta un array de strings o un string separado por comas. Deduplica por slug y conserva el orden. */
function parseTags(v: unknown, field: string): Tag[] {
  if (v === null) return [];
  const list = typeof v === 'string' ? v.split(',') : v;
  if (!Array.isArray(list)) throw new HttpError(422, `${field} debe ser un array de strings, p. ej. ["OpenAI", "Brechas de datos"]`);
  const out: Tag[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of list.entries()) {
    if (typeof raw === 'string' && raw.trim() === '') continue;
    const name = str(raw, `${field}[${i}]`, 2, 40).replace(/\s+/g, ' ');
    const slug = tagSlug(name);
    if (!TAG_SLUG_RE.test(slug)) throw new HttpError(422, `${field}[${i}] "${name}" debe tener al menos una letra o número`);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, name });
  }
  if (out.length > MAX_TAGS) throw new HttpError(422, `${field} admite como máximo ${MAX_TAGS} tags`);
  return out;
}

interface PostIn {
  category_id?: number;
  status?: Status;
  published_at?: string | null;
  translations?: Partial<Record<Locale, TranslationIn | null>>;
}

function str(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== 'string') throw new HttpError(422, `${field} debe ser un string`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw new HttpError(422, `${field} debe tener entre ${min} y ${max} caracteres`);
  if (s.includes('�')) throw new HttpError(422, `${field} tiene caracteres mal codificados: enviá el body en UTF-8`);
  return s;
}

async function parseTranslation(v: unknown, locale: Locale): Promise<TranslationIn> {
  if (!v || typeof v !== 'object') throw new HttpError(422, `translations.${locale} debe ser un objeto`);
  const o = v as Record<string, unknown>;
  const slug = str(o.slug, `translations.${locale}.slug`, 3, 120).toLowerCase();
  if (!SLUG_RE.test(slug)) throw new HttpError(422, `translations.${locale}.slug inválido: solo a-z, 0-9 y guiones, con al menos una letra`);
  if (RESERVED_SLUGS.has(slug)) throw new HttpError(422, `translations.${locale}.slug "${slug}" está reservado`);
  const title = str(o.title, `translations.${locale}.title`, 5, 200);
  const excerpt = str(o.excerpt ?? o.description_short, `translations.${locale}.excerpt`, 20, 320);
  const rawHtml = str(o.content_html ?? o.description, `translations.${locale}.content_html`, 1, 300_000);
  const content_html = await sanitizeHtml(rawHtml);
  if (textLength(content_html) < 50) throw new HttpError(422, `translations.${locale}.content_html quedó vacío o demasiado corto tras sanitizar`);
  const rawTags = o.tags ?? o.keywords;
  const tags = rawTags === undefined ? undefined : parseTags(rawTags, `translations.${locale}.tags`);
  return { slug, title, excerpt, content_html, tags };
}

async function parsePostInput(body: Record<string, unknown>, partial: boolean): Promise<PostIn> {
  const out: PostIn = {};

  if (body.category !== undefined || body.category_id !== undefined) {
    const cat =
      typeof body.category_id === 'number' ? categoryById(body.category_id)
      : typeof body.category_id === 'string' && /^\d+$/.test(body.category_id) ? categoryById(Number(body.category_id))
      : typeof body.category === 'string' ? categoryByKey(body.category) ?? CATEGORIES.find((c) => c.en.slug === body.category)
      : undefined;
    if (!cat) throw new HttpError(422, `Categoría inválida. Valores: ${CATEGORIES.map((c) => `${c.id}=${c.key}`).join(', ')}`);
    out.category_id = cat.id;
  } else if (!partial) {
    throw new HttpError(422, 'category o category_id es obligatorio');
  }

  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'published') throw new HttpError(422, 'status debe ser "draft" o "published"');
    out.status = body.status;
  }

  // `publish_at` es un alias de `published_at` (fecha en la que la nota se hace visible).
  const rawDate = body.publish_at !== undefined ? body.publish_at : body.published_at;
  if (rawDate !== undefined) {
    if (rawDate === null) out.published_at = null;
    else {
      const raw = String(rawDate);
      // Exigir zona horaria evita ambigüedades (n8n corre en otra TZ que el lector).
      if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(raw.trim())) {
        throw new HttpError(422, 'publish_at debe incluir zona horaria, p. ej. "2026-11-23T09:00:00-03:00" o "2026-11-23T12:00:00Z"');
      }
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw new HttpError(422, 'publish_at debe ser una fecha ISO 8601');
      out.published_at = d.toISOString();
    }
    // Enviar una fecha sin status implica programar la publicación.
    if (out.status === undefined && out.published_at) out.status = 'published';
  }

  if (body.translations !== undefined) {
    if (!body.translations || typeof body.translations !== 'object') throw new HttpError(422, 'translations debe ser un objeto { es: {...}, en: {...} }');
    const tr = body.translations as Record<string, unknown>;
    out.translations = {};
    for (const key of Object.keys(tr)) {
      if (!(LOCALES as readonly string[]).includes(key)) throw new HttpError(422, `Idioma no soportado: ${key}`);
      const locale = key as Locale;
      if (tr[key] === null) {
        if (!partial) throw new HttpError(422, `translations.${locale} no puede ser null al crear`);
        if (locale === 'es') throw new HttpError(422, 'No se puede eliminar la traducción en español');
        out.translations[locale] = null;
      } else {
        out.translations[locale] = await parseTranslation(tr[key], locale);
      }
    }
  } else if (!partial) {
    throw new HttpError(422, 'translations es obligatorio');
  }

  if (!partial && !out.translations?.es) throw new HttpError(422, 'translations.es es obligatorio');
  return out;
}

async function assertSlugsFree(env: Env, translations: PostIn['translations'], ownPostId: number | null) {
  for (const locale of LOCALES) {
    const t = translations?.[locale];
    if (!t) continue;
    const row = await env.DB.prepare('SELECT post_id FROM post_translations WHERE locale = ? AND slug = ?').bind(locale, t.slug).first<{ post_id: number }>();
    if (row && row.post_id !== ownPostId) {
      throw new HttpError(409, `El slug "${t.slug}" (${locale}) ya lo usa la nota ${row.post_id}`, { post_id: row.post_id });
    }
  }
}

function translationStatements(env: Env, postId: number, translations: PostIn['translations'], ts: string): D1PreparedStatement[] {
  const stmts: D1PreparedStatement[] = [];
  for (const locale of LOCALES) {
    const t = translations?.[locale];
    if (t === undefined) continue;
    if (t === null) {
      stmts.push(env.DB.prepare('DELETE FROM post_translations WHERE post_id = ? AND locale = ?').bind(postId, locale));
      stmts.push(env.DB.prepare('DELETE FROM post_tags WHERE post_id = ? AND locale = ?').bind(postId, locale));
    } else {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO post_translations (post_id, locale, slug, title, excerpt, content_html, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (post_id, locale) DO UPDATE SET
             slug = excluded.slug, title = excluded.title, excerpt = excluded.excerpt,
             content_html = excluded.content_html, updated_at = excluded.updated_at`,
        ).bind(postId, locale, t.slug, t.title, t.excerpt, t.content_html, ts),
      );
      if (t.tags !== undefined) {
        stmts.push(env.DB.prepare('DELETE FROM post_tags WHERE post_id = ? AND locale = ?').bind(postId, locale));
        t.tags.forEach((tag, i) =>
          stmts.push(env.DB.prepare('INSERT INTO post_tags (post_id, locale, slug, name, position) VALUES (?, ?, ?, ?, ?)').bind(postId, locale, tag.slug, tag.name, i)),
        );
      }
    }
  }
  return stmts;
}

// ---------------------------------------------------------------------------
// Rebuild del sitio
// ---------------------------------------------------------------------------

function isVisible(p: { status: Status; published_at: string | null } | null, at = nowIso()) {
  return !!p && p.status === 'published' && !!p.published_at && p.published_at <= at;
}

async function triggerRebuild(env: Env, reason: string): Promise<boolean> {
  if (!env.DEPLOY_HOOK_URL) {
    console.log(`[rebuild] omitido (DEPLOY_HOOK_URL no configurado): ${reason}`);
    return false;
  }
  const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  console.log(`[rebuild] ${reason} -> ${res.status}`);
  return res.ok;
}

// ---------------------------------------------------------------------------
// Handlers de escritura
// ---------------------------------------------------------------------------

async function createOrUpsertPost(req: Request, env: Env, ctx: ExecutionContext) {
  requireAuth(req, env);
  const input = await parsePostInput(await readJson(req), false);
  const es = input.translations!.es!;

  // Idempotencia: si ya existe una nota con el mismo slug en español, se actualiza.
  const existing = await env.DB.prepare(`SELECT post_id FROM post_translations WHERE locale = 'es' AND slug = ?`).bind(es.slug).first<{ post_id: number }>();
  if (existing) {
    return updatePostById(env, ctx, existing.post_id, input, 200);
  }

  await assertSlugsFree(env, input.translations, null);
  const ts = nowIso();
  const status = input.status ?? 'draft';
  const publishedAt = input.published_at ?? (status === 'published' ? ts : null);

  const inserted = await env.DB.prepare(
    `INSERT INTO posts (category_id, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(input.category_id, status, publishedAt, ts, ts)
    .first<{ id: number }>();
  const id = inserted!.id;

  try {
    await env.DB.batch(translationStatements(env, id, input.translations, ts));
  } catch (e) {
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    throw e;
  }

  const post = await getPostById(env, id);
  if (isVisible(post)) ctx.waitUntil(triggerRebuild(env, `post ${id} creado`));
  return json({ created: true, post }, 201, NO_STORE);
}

async function updatePostById(env: Env, ctx: ExecutionContext, id: number, input: PostIn, okStatus = 200) {
  const before = await getPostById(env, id, false);
  if (!before) throw new HttpError(404, `No existe la nota ${id}`);
  await assertSlugsFree(env, input.translations, id);

  const ts = nowIso();
  const status = input.status ?? before.status;
  let publishedAt = input.published_at !== undefined ? input.published_at : before.published_at;
  if (status === 'published' && !publishedAt) publishedAt = ts;

  const stmts = [
    env.DB.prepare(`UPDATE posts SET category_id = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?`).bind(
      input.category_id ?? before.category_id,
      status,
      publishedAt,
      ts,
      id,
    ),
    ...translationStatements(env, id, input.translations, ts),
  ];
  await env.DB.batch(stmts);

  const after = await getPostById(env, id);
  if (isVisible(before) || isVisible(after)) ctx.waitUntil(triggerRebuild(env, `post ${id} actualizado`));
  return json({ created: false, post: after }, okStatus, NO_STORE);
}

async function patchPost(req: Request, env: Env, ctx: ExecutionContext, id: number) {
  requireAuth(req, env);
  const input = await parsePostInput(await readJson(req), true);
  return updatePostById(env, ctx, id, input);
}

async function deletePost(req: Request, env: Env, ctx: ExecutionContext, id: number) {
  requireAuth(req, env);
  const before = await getPostById(env, id, false);
  if (!before) throw new HttpError(404, `No existe la nota ${id}`);
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
  if (isVisible(before)) ctx.waitUntil(triggerRebuild(env, `post ${id} eliminado`));
  return json({ deleted: true, id }, 200, NO_STORE);
}

// ---------------------------------------------------------------------------
// Handlers de lectura
// ---------------------------------------------------------------------------

/** Todas las notas publicadas con contenido completo (lo usa el build del sitio). */
async function listPublished(env: Env, url: URL) {
  const { page, perPage, offset } = parsePage(url, 100, 50);
  const at = nowIso();
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts p WHERE ${VISIBLE}`).bind(at).first<{ n: number }>())!.n;
  const { results } = await env.DB.prepare(
    `WITH page AS (SELECT id FROM posts p WHERE ${VISIBLE} ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?)
     SELECT ${SELECT_FIELDS(true)} FROM page JOIN posts p ON p.id = page.id JOIN post_translations t ON t.post_id = p.id
     ORDER BY p.published_at DESC, p.id DESC`,
  )
    .bind(at, perPage, offset)
    .all<Row>();
  return json({ page, per_page: perPage, total, total_pages: Math.ceil(total / perPage), posts: await loadPosts(env, results) }, 200, PUBLIC_CACHE);
}

async function getPostBySlug(env: Env, url: URL, slug: string) {
  const locale = parseLocale(url.searchParams.get('locale'));
  const at = nowIso();
  const row = await env.DB.prepare(`SELECT t.post_id FROM post_translations t JOIN posts p ON p.id = t.post_id WHERE t.locale = ? AND t.slug = ? AND ${VISIBLE}`)
    .bind(locale, slug, at)
    .first<{ post_id: number }>();
  if (!row) throw new HttpError(404, 'Nota no encontrada');
  const post = (await getPostById(env, row.post_id))!;

  const { results } = await env.DB.prepare(
    `SELECT ${SELECT_FIELDS(false)} FROM posts p JOIN post_translations t ON t.post_id = p.id
     WHERE p.category_id = ? AND p.id != ? AND t.locale = ? AND ${VISIBLE}
     ORDER BY p.published_at DESC LIMIT 3`,
  )
    .bind(post.category_id, post.id, locale, at)
    .all<Row>();

  return json({ post, related: await loadPosts(env, results), categories: await latestByCategory(env, locale) }, 200, PUBLIC_CACHE);
}

async function latestByCategory(env: Env, locale: Locale) {
  const at = nowIso();
  const { results } = await env.DB.prepare(
    `SELECT ${SELECT_FIELDS(false)} FROM posts p JOIN post_translations t ON t.post_id = p.id
     WHERE t.locale = ? AND ${VISIBLE} AND p.id = (
       SELECT p2.id FROM posts p2 JOIN post_translations t2 ON t2.post_id = p2.id
       WHERE p2.category_id = p.category_id AND t2.locale = ? AND p2.status = 'published' AND p2.published_at <= ?
       ORDER BY p2.published_at DESC, p2.id DESC LIMIT 1)`,
  )
    .bind(locale, at, locale, at)
    .all<Row>();
  const latest = await loadPosts(env, results);
  return CATEGORIES.map((c) => ({
    id: c.id,
    key: c.key,
    slug: c[locale].slug,
    name: c[locale].name,
    description: c[locale].description,
    latest_post: latest.find((p) => p.category_id === c.id) ?? null,
  }));
}

async function getHome(env: Env, url: URL) {
  const locale = parseLocale(url.searchParams.get('locale'));
  return json({ locale, categories: await latestByCategory(env, locale) }, 200, PUBLIC_CACHE);
}

function listCategories() {
  return json(
    { categories: CATEGORIES.map((c) => ({ id: c.id, key: c.key, es: c.es, en: c.en })) },
    200,
    PUBLIC_CACHE,
  );
}

async function getCategory(env: Env, url: URL, slug: string) {
  const locale = parseLocale(url.searchParams.get('locale'));
  const cat = CATEGORIES.find((c) => c[locale].slug === slug || c.key === slug);
  if (!cat) throw new HttpError(404, 'Categoría no encontrada');
  const { page, perPage, offset } = parsePage(url, 50, 10);
  const at = nowIso();
  const total = (
    await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts p JOIN post_translations t ON t.post_id = p.id WHERE p.category_id = ? AND t.locale = ? AND ${VISIBLE}`)
      .bind(cat.id, locale, at)
      .first<{ n: number }>()
  )!.n;
  const { results } = await env.DB.prepare(
    `SELECT ${SELECT_FIELDS(false)} FROM posts p JOIN post_translations t ON t.post_id = p.id
     WHERE p.category_id = ? AND t.locale = ? AND ${VISIBLE}
     ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`,
  )
    .bind(cat.id, locale, at, perPage, offset)
    .all<Row>();
  return json(
    {
      category: { id: cat.id, key: cat.key, ...cat[locale] },
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
      posts: await loadPosts(env, results),
      categories: await latestByCategory(env, locale),
    },
    200,
    PUBLIC_CACHE,
  );
}

/** Tags con al menos una nota visible en ese idioma, de más a menos usados. */
async function listTags(env: Env, url: URL) {
  const locale = parseLocale(url.searchParams.get('locale'));
  const { results } = await env.DB.prepare(
    `SELECT pt.slug, MAX(pt.name) AS name, COUNT(*) AS count FROM post_tags pt JOIN posts p ON p.id = pt.post_id
     WHERE pt.locale = ? AND ${VISIBLE}
     GROUP BY pt.slug ORDER BY count DESC, pt.slug`,
  )
    .bind(locale, nowIso())
    .all<{ slug: string; name: string; count: number }>();
  return json({ locale, tags: results }, 200, PUBLIC_CACHE);
}

async function getTag(env: Env, url: URL, slug: string) {
  const locale = parseLocale(url.searchParams.get('locale'));
  const { page, perPage, offset } = parsePage(url, 50, 10);
  const at = nowIso();
  const head = await env.DB.prepare(
    `SELECT MAX(pt.name) AS name, COUNT(*) AS n FROM post_tags pt JOIN posts p ON p.id = pt.post_id WHERE pt.locale = ? AND pt.slug = ? AND ${VISIBLE}`,
  )
    .bind(locale, slug, at)
    .first<{ name: string | null; n: number }>();
  if (!head?.n) throw new HttpError(404, 'Tag no encontrado');
  const { results } = await env.DB.prepare(
    `SELECT ${SELECT_FIELDS(false)} FROM post_tags pt JOIN posts p ON p.id = pt.post_id JOIN post_translations t ON t.post_id = p.id AND t.locale = pt.locale
     WHERE pt.locale = ? AND pt.slug = ? AND ${VISIBLE}
     ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`,
  )
    .bind(locale, slug, at, perPage, offset)
    .all<Row>();
  return json(
    {
      tag: { slug, name: head.name },
      page,
      per_page: perPage,
      total: head.n,
      total_pages: Math.ceil(head.n / perPage),
      posts: await loadPosts(env, results),
    },
    200,
    PUBLIC_CACHE,
  );
}

/** Listado con borradores, para n8n / revisión (requiere token). */
async function adminList(req: Request, env: Env, url: URL) {
  requireAuth(req, env);
  const { page, perPage, offset } = parsePage(url, 100, 50);
  const status = url.searchParams.get('status');
  const where = status === 'draft' || status === 'published' ? 'WHERE p.status = ?' : '';
  const binds: unknown[] = where ? [status] : [];
  const { results } = await env.DB.prepare(
    `WITH page AS (SELECT id FROM posts p ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?)
     SELECT ${SELECT_FIELDS(false)} FROM page JOIN posts p ON p.id = page.id LEFT JOIN post_translations t ON t.post_id = p.id
     ORDER BY p.created_at DESC`,
  )
    .bind(...binds, perPage, offset)
    .all<Row>();
  return json({ page, per_page: perPage, posts: await loadPosts(env, results) }, 200, NO_STORE);
}

async function adminGet(req: Request, env: Env, id: number) {
  requireAuth(req, env);
  const post = await getPostById(env, id);
  if (!post) throw new HttpError(404, `No existe la nota ${id}`);
  return json({ post }, 200, NO_STORE);
}

// ---------------------------------------------------------------------------
// Markdown para agentes
// ---------------------------------------------------------------------------
// Una URL Rewrite Rule de la zona envía a /api/md?p=<ruta> solo los pedidos con
// Accept: text/markdown, así que el Worker no corre en las visitas normales.
// Devuelve el index.md estático de la página, o un 404 en Markdown si no existe.

const MD_HEADERS = {
  'content-type': 'text/markdown; charset=utf-8',
  'cache-control': 'public, max-age=300',
  vary: 'Accept',
};

// Rutas servidas por reescritura (páginas de confianza) → página real.
const MD_ALIASES: Record<string, string> = { '/about': '/sobre-mi', '/contact': '/contacto', '/privacy': '/privacidad' };

const MD_NOT_FOUND = (p: string) => `---
title: "Página no encontrada / Page not found"
status: 404
---

# Página no encontrada

La ruta \`${p}\` no existe en danielsegovia.com o cambió de dirección.

The path \`${p}\` does not exist on danielsegovia.com or has moved.

## Dónde seguir / Where to go next

- [Índice para agentes (llms.txt)](https://danielsegovia.com/llms.txt)
- [Sitemap](https://danielsegovia.com/sitemap.xml)
- [Inicio](https://danielsegovia.com/) · [Home (English)](https://danielsegovia.com/en/)
- [Búsqueda](https://danielsegovia.com/buscar/)
- [RSS](https://danielsegovia.com/rss.xml)
`;

async function serveMarkdown(req: Request, env: Env, url: URL): Promise<Response> {
  let p = url.searchParams.get('p') || '/';
  if (!p.startsWith('/') || p.includes('..') || p.length > 300) p = '/';
  const clean = p.replace(/\/+$/, '') || '/';
  const target = MD_ALIASES[clean] ?? clean;
  const asset = await env.ASSETS.fetch(new Request(new URL(`${target === '/' ? '' : target}/index.md`, url.origin)));
  const body = req.method === 'HEAD' ? null : undefined;
  if (asset.ok) return new Response(body === null ? null : asset.body, { status: 200, headers: MD_HEADERS });
  return new Response(body === null ? null : MD_NOT_FOUND(clean), { status: 404, headers: MD_HEADERS });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function route(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;
  let match: RegExpMatchArray | null;

  if (path === '/api/md' && (m === 'GET' || m === 'HEAD')) return serveMarkdown(req, env, url);
  if (path === '/api/health' && m === 'GET') {
    return json({ ok: true, service: 'danielsegovia-api', time: nowIso() }, 200, NO_STORE);
  }
  if (path === '/api/home' && m === 'GET') return getHome(env, url);
  if (path === '/api/categories' && m === 'GET') return listCategories();
  if ((match = path.match(/^\/api\/categories\/([a-z0-9-]+)$/)) && m === 'GET') return getCategory(env, url, match[1]);
  if (path === '/api/tags' && m === 'GET') return listTags(env, url);
  if ((match = path.match(/^\/api\/tags\/([a-z0-9-]+)$/)) && m === 'GET') return getTag(env, url, match[1]);

  if (path === '/api/posts') {
    if (m === 'GET') return listPublished(env, url);
    if (m === 'POST') return createOrUpsertPost(req, env, ctx);
  }
  if ((match = path.match(/^\/api\/posts\/(\d+)$/))) {
    const id = Number(match[1]);
    if (m === 'GET') return adminGet(req, env, id);
    if (m === 'PATCH' || m === 'PUT') return patchPost(req, env, ctx, id);
    if (m === 'DELETE') return deletePost(req, env, ctx, id);
  }
  if ((match = path.match(/^\/api\/posts\/([a-z0-9-]+)$/)) && m === 'GET') return getPostBySlug(env, url, match[1]);

  if (path === '/api/admin/posts' && m === 'GET') return adminList(req, env, url);
  if (path === '/api/rebuild' && m === 'POST') {
    requireAuth(req, env);
    return json({ triggered: await triggerRebuild(env, 'manual') }, 202, NO_STORE);
  }

  throw new HttpError(404, 'Endpoint no encontrado');
}

export default {
  async fetch(req, env, ctx): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      return await route(req, env, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, details: e.details }, e.status, NO_STORE);
      console.error(e);
      return json({ error: 'Error interno' }, 500, NO_STORE);
    }
  },

  // Cron horario: si una nota programada pasó a ser visible en la última hora, rebuild.
  // Cron (cada 15 min): si alguna nota programada pasó su publish_at desde la última revisión, rebuild.
  // La marca `last_schedule_check` solo avanza si el rebuild se disparó bien, así ninguna nota se pierde
  // aunque una ejecución falle.
  async scheduled(_event, env) {
    const now = nowIso();
    const last =
      (await env.DB.prepare(`SELECT value FROM site_state WHERE key = 'last_schedule_check'`).first<{ value: string }>())?.value ??
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // published_at > updated_at: la nota se guardó antes de su fecha (programada). Las publicadas
    // "ya" disparan su rebuild al crearse, así que no se cuentan dos veces.
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM posts WHERE status = 'published' AND published_at > ? AND published_at <= ? AND published_at > updated_at`,
    )
      .bind(last, now)
      .first<{ n: number }>();
    const due = row?.n ?? 0;
    let advance = true;
    if (due > 0) advance = (await triggerRebuild(env, `${due} nota(s) programada(s) pasaron su publish_at`)) || !env.DEPLOY_HOOK_URL;
    if (advance) {
      await env.DB.prepare(`INSERT INTO site_state (key, value) VALUES ('last_schedule_check', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`)
        .bind(now)
        .run();
    }
  },
} satisfies ExportedHandler<Env>;
