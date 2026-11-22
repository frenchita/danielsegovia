// Imágenes Open Graph (1200x630) generadas en el build con satori + resvg.
// Rutas: /og/{es|en}/home.png, /og/{locale}/about.png, /og/{locale}/{categoria}.png, /og/{locale}/{categoria}/{slug}.png
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { CATEGORIES, LOCALES } from '../../lib/categories';
import { getEntries } from '../../lib/content';
import { t } from '../../lib/i18n';

type Card = {
  kicker: string;
  title: string;
  footer: string;
  color: string;
  ink: string;
};

const NEUTRAL = { color: '#1756e1', ink: '#1449c0' };

export const getStaticPaths: GetStaticPaths = async () => {
  const paths: { params: { path: string }; props: Card }[] = [];
  for (const l of LOCALES) {
    const ui = t(l);
    paths.push({ params: { path: `${l}/home` }, props: { kicker: 'danielsegovia.com', title: 'Daniel Segovia', footer: ui.siteTagline, ...NEUTRAL } });
    paths.push({ params: { path: `${l}/about` }, props: { kicker: ui.about, title: 'Daniel Segovia', footer: 'Chief Technology Officer', ...NEUTRAL } });
    for (const c of CATEGORIES) {
      paths.push({ params: { path: `${l}/${c.key}` }, props: { kicker: 'danielsegovia.com', title: c[l].name, footer: c[l].description, color: c.color, ink: c.ink } });
    }
    for (const e of await getEntries(l)) {
      paths.push({ params: { path: `${l}/${e.category.key}/${e.slug}` }, props: { kicker: e.category[l].name, title: e.title, footer: 'Daniel Segovia · danielsegovia.com', color: e.category.color, ink: e.category.ink } });
    }
  }
  return paths;
};

const require = createRequire(import.meta.url);
let fonts: Promise<{ name: string; data: Buffer; weight: 300 | 700; style: 'normal' }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(require.resolve('@fontsource/comic-neue/files/comic-neue-latin-300-normal.woff')),
    readFile(require.resolve('@fontsource/comic-neue/files/comic-neue-latin-700-normal.woff')),
  ]).then(([regular, bold]) => [
    { name: 'Comic Neue', data: regular, weight: 300 as const, style: 'normal' as const },
    { name: 'Comic Neue', data: bold, weight: 700 as const, style: 'normal' as const },
  ]));

const h = (type: string, style: Record<string, unknown>, children: unknown) => ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const { kicker, title, footer, color, ink } = props as Card;
  const titleSize = title.length > 90 ? 52 : title.length > 60 ? 60 : 72;

  const tree = h(
    'div',
    { width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: '#ffffff', color: '#111111', fontFamily: 'Comic Neue', borderBottom: `20px solid ${color}` },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: '20px' }, [
        h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', border: `4px solid ${color}`, borderRadius: '10px', color: ink, fontSize: '26px', fontWeight: 700 }, 'DS'),
        h('div', { display: 'flex', fontSize: '28px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: ink }, kicker),
      ]),
      h('div', { display: 'flex', fontSize: `${titleSize}px`, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-1px' }, title),
      h('div', { display: 'flex', fontSize: '26px', color: '#555555', lineHeight: 1.35 }, footer),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: await loadFonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};

