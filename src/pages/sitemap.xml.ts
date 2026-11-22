// Sitemap con alternates hreflang (xhtml:link) por cada URL.
import { LOCALES, type Locale } from '../lib/categories';
import { categoryPages, categoryUrl, getEntries } from '../lib/content';
import { STATIC_PATHS } from '../lib/i18n';
import { abs } from '../lib/schema';

interface Url {
  loc: string;
  lastmod?: string;
  alternates?: Partial<Record<Locale, string>>;
}

export async function GET() {
  const urls: Url[] = [];
  const entriesByLocale = Object.fromEntries(await Promise.all(LOCALES.map(async (l) => [l, await getEntries(l)] as const))) as Record<Locale, Awaited<ReturnType<typeof getEntries>>>;
  const newest = (list: { updatedAt: string }[]) => list.reduce<string | undefined>((m, e) => (!m || e.updatedAt > m ? e.updatedAt : m), undefined);

  for (const l of LOCALES) {
    urls.push({ loc: STATIC_PATHS.home[l], lastmod: newest(entriesByLocale[l]), alternates: STATIC_PATHS.home });
    urls.push({ loc: STATIC_PATHS.about[l], alternates: STATIC_PATHS.about });
    urls.push({ loc: STATIC_PATHS.contact[l], alternates: STATIC_PATHS.contact });
    urls.push({ loc: STATIC_PATHS.privacy[l], alternates: STATIC_PATHS.privacy });
  }

  for (const l of LOCALES) {
    for (const p of await categoryPages(l)) {
      const alternates: Partial<Record<Locale, string>> = {};
      if (p.page === 1) {
        for (const other of LOCALES) {
          const has = other === 'es' || entriesByLocale[other].some((e) => e.category.id === p.category.id);
          if (has) alternates[other] = categoryUrl(other, p.category);
        }
      }
      urls.push({ loc: categoryUrl(l, p.category, p.page), lastmod: newest(p.entries), alternates });
    }
    for (const e of entriesByLocale[l]) urls.push({ loc: e.url, lastmod: e.updatedAt, alternates: e.alternates });
  }

  const body = urls
    .map((u) => {
      const alts = Object.entries(u.alternates ?? {}) as [Locale, string][];
      const links =
        alts.length > 1
          ? alts.map(([l, p]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(p)}"/>`).join('') +
            `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(u.alternates!.es ?? alts[0][1])}"/>`
          : '';
      return `  <url>\n    <loc>${abs(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}${links}\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
