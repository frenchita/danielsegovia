import { SITE_URL } from '../lib/site';

export const GET = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /buscar/\nDisallow: /en/search/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
