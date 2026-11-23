// Carga del contenido en tiempo de build desde la API (GET /api/posts).
// Se ejecuta una sola vez por build (memoizado) y todo lo demás se calcula en memoria.

import { CATEGORIES, LOCALES, categoryByKey, type Category, type Locale } from './categories';
import { STATIC_PATHS, prefix } from './i18n';
import { PAGE_SIZE } from './site';

export interface ApiTag {
  slug: string;
  name: string;
}

export interface Translation {
  slug: string;
  title: string;
  excerpt: string;
  content_html: string;
  tags?: ApiTag[];
  updated_at: string;
}

export interface TagLink extends ApiTag {
  url: string;
}

export interface ApiPost {
  id: number;
  category: string;
  status: 'published';
  source_url: string | null;
  published_at: string;
  updated_at: string;
  translations: Partial<Record<Locale, Translation>>;
}

/** Una nota en un idioma concreto, lista para renderizar. */
export interface Entry {
  id: number;
  locale: Locale;
  category: Category;
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  sourceUrl: string | null;
  publishedAt: string;
  updatedAt: string;
  url: string;
  ogImage: string;
  /** URL de la misma nota en el otro idioma, si existe. */
  alternates: Partial<Record<Locale, string>>;
  readingMinutes: number;
  /** Publicada hace menos de 48 h (al momento del build). */
  isNew: boolean;
  /** Índice: h2 de la nota con su ancla. */
  toc: { id: string; text: string }[];
  tags: TagLink[];
}

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;
const BUILD_TIME = Date.now();

const env = (key: string): string | undefined => (import.meta.env as Record<string, string | undefined>)[key] ?? process.env[key];

const CONTENT_API = (env('CONTENT_API') ?? 'https://danielsegovia.com/api').replace(/\/$/, '');
const ALLOW_EMPTY = env('ALLOW_EMPTY_CONTENT') === '1';

async function fetchAllPosts(): Promise<ApiPost[]> {
  const posts: ApiPost[] = [];
  let page = 1;
  for (;;) {
    const url = `${CONTENT_API}/posts?per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) {
      throw new Error(`[content] ${url} respondió ${res.status} (${type})`);
    }
    const data = (await res.json()) as { posts: ApiPost[]; total_pages: number };
    if (!Array.isArray(data.posts)) throw new Error(`[content] respuesta inesperada de ${url}`);
    posts.push(...data.posts);
    if (page >= (data.total_pages || 1)) break;
    page++;
  }
  return posts;
}

let cache: Promise<ApiPost[]> | undefined;

export function getPosts(): Promise<ApiPost[]> {
  cache ??= fetchAllPosts().catch((err) => {
    // Nunca publicar un sitio vacío por un error de red: el build falla salvo que se pida explícitamente.
    if (ALLOW_EMPTY) {
      console.warn(`${err}\n[content] ALLOW_EMPTY_CONTENT=1 → se genera el sitio sin notas`);
      return [];
    }
    throw err;
  });
  return cache;
}

export const categoryUrl = (locale: Locale, cat: Category, page = 1) =>
  `${prefix(locale)}/${cat[locale].slug}/${page > 1 ? `page/${page}/` : ''}`;

export const postUrl = (locale: Locale, cat: Category, slug: string) => `${prefix(locale)}/${cat[locale].slug}/${slug}/`;

export const tagUrl = (locale: Locale, slug: string, page = 1) => `${STATIC_PATHS.tags[locale]}${slug}/${page > 1 ? `page/${page}/` : ''}`;

export const ogPath = (key: string) => `/og/${key}.png`;

const stripTags = (s: string) => s.replace(/<[^>]*>/g, ' ');
const decodeEntities = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'seccion';
}

/** Tablas con scroll horizontal en mobile + anclas en los h2 para el índice. */
function decorateHtml(html: string): { html: string; toc: { id: string; text: string }[] } {
  const toc: { id: string; text: string }[] = [];
  const used = new Set<string>();
  const out = html
    .replace(/<table/g, '<div class="table-wrap"><table')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (_m, attrs: string | undefined, inner: string) => {
      const text = decodeEntities(stripTags(inner)).replace(/\s+/g, ' ').trim();
      const existing = attrs?.match(/id="([^"]+)"/)?.[1];
      let id = existing ?? slugify(text);
      let n = 2;
      while (used.has(id)) id = `${existing ?? slugify(text)}-${n++}`;
      used.add(id);
      toc.push({ id, text });
      return `<h2 id="${id}">${inner}</h2>`;
    });
  return { html: out, toc };
}

const readingMinutes = (html: string) => Math.max(1, Math.round(stripTags(html).split(/\s+/).filter(Boolean).length / 200));

function toEntry(p: ApiPost, locale: Locale): Entry | null {
  const tr = p.translations[locale];
  const category = categoryByKey(p.category);
  if (!tr || !category) return null;
  const alternates: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) {
    const other = p.translations[l];
    if (other) alternates[l] = postUrl(l, category, other.slug);
  }
  const { html, toc } = decorateHtml(tr.content_html);
  return {
    id: p.id,
    locale,
    category,
    slug: tr.slug,
    title: tr.title,
    excerpt: tr.excerpt,
    html,
    toc,
    readingMinutes: readingMinutes(tr.content_html),
    isNew: BUILD_TIME - new Date(p.published_at).getTime() < NEW_WINDOW_MS,
    sourceUrl: p.source_url,
    publishedAt: p.published_at,
    updatedAt: tr.updated_at > p.updated_at ? tr.updated_at : p.updated_at,
    url: postUrl(locale, category, tr.slug),
    ogImage: ogPath(`${locale}/${category.key}/${tr.slug}`),
    alternates,
    tags: (tr.tags ?? []).map((t) => ({ ...t, url: tagUrl(locale, t.slug) })),
  };
}

/** Notas de un idioma, de la más nueva a la más vieja. */
export async function getEntries(locale: Locale): Promise<Entry[]> {
  const posts = await getPosts();
  return posts
    .map((p) => toEntry(p, locale))
    .filter((e): e is Entry => e !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.id - a.id);
}

export async function getEntriesByCategory(locale: Locale, cat: Category) {
  return (await getEntries(locale)).filter((e) => e.category.id === cat.id);
}

export interface CategoryBucket {
  category: Category;
  url: string;
  /** Último post en el idioma pedido; si no hay, el último en español (marcado con `fallback`). */
  latest: Entry | null;
  fallback: boolean;
  hasPage: boolean;
}

/** Los 6 buckets del home / "Más categorías". */
export async function getBuckets(locale: Locale): Promise<CategoryBucket[]> {
  const entries = await getEntries(locale);
  const esEntries = locale === 'es' ? entries : await getEntries('es');
  return CATEGORIES.map((category) => {
    const own = entries.find((e) => e.category.id === category.id) ?? null;
    const es = own ? null : esEntries.find((e) => e.category.id === category.id) ?? null;
    const hasPage = locale === 'es' || own !== null;
    return {
      category,
      url: hasPage ? categoryUrl(locale, category) : categoryUrl('es', category),
      latest: own ?? es,
      fallback: !own && !!es,
      hasPage,
    };
  });
}

/** Rutas de categoría (con paginado) para getStaticPaths. En inglés solo si hay notas. */
export async function categoryPages(locale: Locale) {
  const pages: { category: Category; page: number; totalPages: number; entries: Entry[] }[] = [];
  for (const category of CATEGORIES) {
    const all = await getEntriesByCategory(locale, category);
    if (locale !== 'es' && all.length === 0) continue;
    const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    for (let page = 1; page <= totalPages; page++) {
      pages.push({ category, page, totalPages, entries: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) });
    }
  }
  return pages;
}

/** ¿Existe la página de la categoría en ese idioma? */
export async function categoryHasPage(locale: Locale, cat: Category) {
  return locale === 'es' || (await getEntriesByCategory(locale, cat)).length > 0;
}

/** Las páginas de tag con menos notas que esto llevan noindex y no van al sitemap (contenido escaso). */
export const MIN_TAG_POSTS_TO_INDEX = 2;

export interface TagGroup extends TagLink {
  /** Notas del tag, de la más nueva a la más vieja. */
  entries: Entry[];
  indexable: boolean;
}

/** Tags de un idioma con sus notas, de más a menos usados. El nombre visible sale de la nota más reciente. */
export async function getTags(locale: Locale): Promise<TagGroup[]> {
  const map = new Map<string, TagGroup>();
  for (const e of await getEntries(locale)) {
    for (const t of e.tags) {
      let g = map.get(t.slug);
      if (!g) map.set(t.slug, (g = { ...t, entries: [], indexable: false }));
      g.entries.push(e);
    }
  }
  const groups = [...map.values()];
  for (const g of groups) g.indexable = g.entries.length >= MIN_TAG_POSTS_TO_INDEX;
  return groups.sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name, locale));
}

/** Rutas de tag (con paginado) para getStaticPaths. */
export async function tagPages(locale: Locale) {
  const pages: { tag: TagGroup; page: number; totalPages: number; entries: Entry[] }[] = [];
  for (const tag of await getTags(locale)) {
    const totalPages = Math.max(1, Math.ceil(tag.entries.length / PAGE_SIZE));
    for (let page = 1; page <= totalPages; page++) {
      pages.push({ tag, page, totalPages, entries: tag.entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) });
    }
  }
  return pages;
}

/** Relacionadas: primero las que comparten más tags (de cualquier categoría), después las de la misma categoría. */
export async function relatedEntries(entry: Entry, limit = 3) {
  const own = new Set(entry.tags.map((t) => t.slug));
  return (await getEntries(entry.locale))
    .filter((e) => e.id !== entry.id)
    .map((e) => ({ e, shared: e.tags.filter((t) => own.has(t.slug)).length, sameCat: e.category.id === entry.category.id }))
    .filter((x) => x.shared > 0 || x.sameCat)
    .sort((a, b) => b.shared - a.shared || Number(b.sameCat) - Number(a.sameCat))
    .slice(0, limit)
    .map((x) => x.e);
}
