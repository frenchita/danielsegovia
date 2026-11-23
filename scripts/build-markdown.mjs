// Post-build: genera una versión Markdown (index.md) de cada página HTML de dist/.
// El Worker la sirve cuando un agente pide `Accept: text/markdown` o `?mode=agent`.
// Uso: node scripts/build-markdown.mjs [dist]

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const DIST = process.argv[2] ?? 'dist';
const SITE = 'https://danielsegovia.com';

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
td.use(gfm);
td.remove(['script', 'style', 'noscript', 'svg', 'picture', 'ins', 'button', 'form', 'iframe']);
// Las imágenes del sitio son decorativas (foto, SVG de carrera): se dejan como texto alternativo.
td.addRule('img', { filter: 'img', replacement: (_c, node) => (node.getAttribute('alt') ? `*${node.getAttribute('alt')}*` : '') });

const meta = (html, re) => html.match(re)?.[1]?.trim() ?? '';
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const yaml = (s) => JSON.stringify(decode(s));

function extractMain(html) {
  let main = meta(html, /<main[^>]*>([\s\S]*)<\/main>/i);
  main = main
    .replace(/<aside class="ads[\s\S]*?<\/aside>/gi, '') // anuncios
    .replace(/<div class="share[\s\S]*?<\/div>/gi, '') // botones de compartir
    .replace(/<div id="search"[\s\S]*?<\/div>/gi, '') // widget de búsqueda
    .replace(/<div class="code-head">[\s\S]*?<\/button><\/div>/gi, ''); // cabecera de bloques de código (lenguaje + copiar)
  // Links relativos → absolutos, para que el Markdown sirva fuera del sitio.
  return main.replace(/href="\/(?!\/)/g, `href="${SITE}/`);
}

function toMarkdown(html) {
  const title = decode(meta(html, /<title>([^<]*)<\/title>/i));
  const description = meta(html, /<meta name="description" content="([^"]*)"/i);
  const canonical = meta(html, /<link rel="canonical" href="([^"]*)"/i);
  const lang = meta(html, /<html lang="([^"]*)"/i);
  const published = meta(html, /<meta property="article:published_time" content="([^"]*)"/i);
  const modified = meta(html, /<meta property="article:modified_time" content="([^"]*)"/i);
  const section = meta(html, /<meta property="article:section" content="([^"]*)"/i);

  const front = [
    '---',
    `title: ${yaml(title)}`,
    description && `description: ${yaml(description)}`,
    canonical && `url: ${canonical}`,
    lang && `lang: ${lang}`,
    published && `author: "Daniel Segovia"`,
    published && `published: ${published}`,
    modified && `modified: ${modified}`,
    section && `section: ${yaml(section)}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const body = td
    .turndown(extractMain(html))
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const footer = `\n\n---\n\nSitio: ${SITE}/ · Índice para agentes: ${SITE}/llms.txt · Sitemap: ${SITE}/sitemap.xml`;
  return `${front}\n\n${body}${footer}\n`;
}

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['_astro', 'og', 'pagefind', 'images'].includes(entry.name)) continue;
      yield* htmlFiles(p);
    } else if (entry.name === 'index.html' || entry.name === '404.html') {
      yield p;
    }
  }
}

let count = 0;
for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  const out = file.endsWith('404.html') ? file.replace(/404\.html$/, '404.md') : file.replace(/index\.html$/, 'index.md');
  await writeFile(out, toMarkdown(html));
  count++;
}
console.log(`[markdown] ${count} páginas convertidas a Markdown en ${relative('.', DIST).split(sep).join('/') || DIST}`);
