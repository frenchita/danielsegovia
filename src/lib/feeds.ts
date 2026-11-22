import type { Locale } from './categories';
import { getEntries } from './content';
import { STATIC_PATHS, t } from './i18n';
import { abs } from './schema';
import { SITE_NAME } from './site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function rss(locale: Locale): Promise<Response> {
  const entries = (await getEntries(locale)).slice(0, 30);
  const ui = t(locale);
  const items = entries
    .map(
      (e) => `    <item>
      <title>${esc(e.title)}</title>
      <link>${abs(e.url)}</link>
      <guid isPermaLink="true">${abs(e.url)}</guid>
      <pubDate>${new Date(e.publishedAt).toUTCString()}</pubDate>
      <category>${esc(e.category[locale].name)}</category>
      <description>${esc(e.excerpt)}</description>
    </item>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${abs(STATIC_PATHS.home[locale])}</link>
    <description>${esc(ui.siteTagline)}</description>
    <language>${locale}</language>
    <atom:link href="${abs(STATIC_PATHS.rss[locale])}" rel="self" type="application/rss+xml" />
${entries[0] ? `    <lastBuildDate>${new Date(entries[0].publishedAt).toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
