// Carga notas de ejemplo en la API LOCAL (wrangler dev) para desarrollar las vistas.
// Uso: npm run dev:api  (en otra terminal)  y luego  node scripts/seed-dev.mjs
// Nunca apuntar esto a producción.

const API = process.env.SEED_API ?? 'http://localhost:8787/api';
const TOKEN = process.env.SEED_TOKEN ?? 'local-dev-token';

if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) {
  console.error('seed-dev solo corre contra localhost');
  process.exit(1);
}

const categories = ['tutoriales', 'actualidad', 'inteligencia-artificial', 'seguridad', 'arquitectura', 'negocios'];

const body = (n, lang) =>
  lang === 'es'
    ? `<p>Este es un <strong>artículo de ejemplo</strong> número ${n}, generado para probar el diseño. Incluye <em>cursiva</em>, <u>subrayado</u> y un <a href="https://developers.cloudflare.com/">enlace externo</a>.</p>
<h2>Contexto</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
<ul><li>Primer punto importante</li><li>Segundo punto con <code>código</code></li><li>Tercer punto</li></ul>
<h2>Comparativa</h2>
<table><thead><tr><th>Opción</th><th>Costo</th><th>Latencia</th></tr></thead><tbody><tr><td>Cloudflare D1</td><td>Gratis</td><td>Baja</td></tr><tr><td>Supabase</td><td>Gratis*</td><td>Media</td></tr></tbody></table>
<blockquote><p>Una cita destacada para ver cómo se estiliza.</p></blockquote>
<pre><code>npm create astro@latest</code></pre>
<script>alert('esto debe desaparecer')</script><p onclick="x()">Párrafo final con un atributo peligroso que se elimina.</p>`
    : `<p>This is a <strong>sample article</strong> number ${n}, generated to test the design. It has <em>italics</em> and a <a href="https://developers.cloudflare.com/">link</a>.</p><h2>Context</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`;

// Tags de ejemplo: se reparten entre notas de distintas categorías para probar los cruces.
const TAGS_ES = ['OpenAI', 'Cloudflare', 'Brechas de datos', 'Liderazgo', 'Kubernetes', 'Startups'];
const TAGS_EN = ['OpenAI', 'Cloudflare', 'Data breaches', 'Leadership', 'Kubernetes', 'Startups'];
const pick = (list, n) => [list[n % list.length], list[(n + 2) % list.length]];

let n = 0;
for (const category of categories) {
  const count = category === 'tutoriales' ? 13 : 3;
  for (let i = 1; i <= count; i++) {
    n++;
    const date = new Date(Date.now() - n * 36e5 * 7).toISOString();
    const withEn = i <= 2;
    const payload = {
      category,
      status: 'published',
      published_at: date,
      translations: {
        es: {
          slug: `nota-de-ejemplo-${category}-${i}`,
          title: `Nota de ejemplo ${i} sobre ${category.replace(/-/g, ' ')}: un título bastante descriptivo`,
          excerpt: `Resumen breve de la nota ${i} de ${category}, pensado para la meta description y las tarjetas del home.`,
          content_html: body(n, 'es'),
          tags: pick(TAGS_ES, n),
        },
        ...(withEn && {
          en: {
            slug: `sample-post-${category}-${i}`,
            title: `Sample post ${i} about ${category}: a fairly descriptive title`,
            excerpt: `Short summary of post ${i} in ${category}, used for the meta description and home cards.`,
            content_html: body(n, 'en'),
            tags: pick(TAGS_EN, n),
          },
        }),
      },
    };
    const res = await fetch(`${API}/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(res.status, payload.translations.es.slug, data.error ?? '');
  }
}
