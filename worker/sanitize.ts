// Sanitizado de HTML con allowlist usando HTMLRewriter (nativo de Workers, sin dependencias).
// Todo lo que no está permitido se elimina: tags desconocidos se "desenvuelven" (queda el texto),
// tags peligrosos se eliminan con su contenido, y se quitan atributos no permitidos.

const ALLOWED: Record<string, readonly string[]> = {
  p: [], br: [], hr: [],
  strong: [], em: [], u: [], s: [], del: [], mark: [], sub: [], sup: [], small: [],
  a: ['href', 'title'],
  h2: ['id'], h3: ['id'], h4: ['id'],
  ul: [], ol: ['start'], li: [],
  blockquote: ['cite'], q: ['cite'], cite: [],
  // class solo se acepta como "language-xxx" (lenguaje del bloque de código, ver abajo).
  code: ['class'], pre: ['class'], kbd: [], abbr: ['title'],
  table: [], caption: [], thead: [], tbody: [], tfoot: [], tr: [],
  th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'],
  figure: [], figcaption: [],
  dl: [], dt: [], dd: [],
};

// Equivalencias: se renombran en lugar de descartarse.
const RENAME: Record<string, string> = { b: 'strong', i: 'em', h1: 'h2', h5: 'h4', h6: 'h4', strike: 's' };

// Se eliminan junto con todo su contenido.
const DROP = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'noscript',
  'template', 'svg', 'math', 'form', 'input', 'button', 'select', 'option', 'textarea',
  'head', 'title', 'meta', 'link', 'base', 'canvas', 'video', 'audio', 'source', 'track',
  'img', 'picture', 'dialog', 'portal',
]);

const SITE_HOST = 'danielsegovia.com';
const LANG_CLASS_RE = /^language-[a-z0-9+#-]{1,20}$/i;

function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('#')) return href;
  try {
    const url = new URL(href);
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') return url.toString();
  } catch {
    /* href inválido */
  }
  return null;
}

function isExternal(href: string): boolean {
  try {
    const url = new URL(href);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== SITE_HOST && !url.hostname.endsWith('.' + SITE_HOST);
  } catch {
    return false;
  }
}

export async function sanitizeHtml(input: string): Promise<string> {
  const rewriter = new HTMLRewriter()
    .on('*', {
      element(el) {
        let tag = el.tagName.toLowerCase();
        if (DROP.has(tag)) {
          el.remove();
          return;
        }
        if (RENAME[tag]) {
          tag = RENAME[tag];
          el.tagName = tag;
        }
        const allowedAttrs = ALLOWED[tag];
        if (!allowedAttrs) {
          el.removeAndKeepContent();
          return;
        }
        for (const [name] of [...el.attributes]) {
          if (!allowedAttrs.includes(name.toLowerCase())) el.removeAttribute(name);
        }
        if (tag === 'a') {
          const href = el.getAttribute('href');
          const safe = href ? safeHref(href) : null;
          if (!safe) {
            el.removeAttribute('href');
          } else {
            el.setAttribute('href', safe);
            if (isExternal(safe)) {
              el.setAttribute('target', '_blank');
              el.setAttribute('rel', 'noopener noreferrer');
            }
          }
        }
        if (tag === 'code' || tag === 'pre') {
          // Única clase permitida: el lenguaje del bloque, p. ej. "language-bash".
          const lang = (el.getAttribute('class') ?? '').split(/\s+/).find((c) => LANG_CLASS_RE.test(c));
          if (lang) el.setAttribute('class', lang.toLowerCase());
          else el.removeAttribute('class');
        }
        if (tag === 'blockquote' || tag === 'q') {
          const cite = el.getAttribute('cite');
          if (cite && !safeHref(cite)) el.removeAttribute('cite');
        }
      },
    })
    .onDocument({
      comments(c) {
        c.remove();
      },
      doctype() {
        /* se ignora: es un fragmento */
      },
    });

  const out = await rewriter.transform(new Response(input, { headers: { 'content-type': 'text/html; charset=utf-8' } })).text();
  return out.trim();
}

/** Texto plano (para validar que el contenido no quedó vacío). */
export function textLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim().length;
}
