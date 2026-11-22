// Fuente única de verdad de las categorías (la usa el sitio y la API).
// `id` y `key` deben coincidir con migrations/0001_init.sql.

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export interface CategoryLocale {
  slug: string;
  name: string;
  /** Usada como meta description de la página de la categoría. */
  description: string;
}

export interface CategoryColors {
  /** Color de acento (bordes, líneas, decoración). */
  color: string;
  /** Variante oscura para texto sobre blanco (contraste AA). */
  ink: string;
  /** Fondo suave para badges. */
  tint: string;
}

export interface Category extends CategoryColors {
  id: number;
  key: string;
  es: CategoryLocale;
  en: CategoryLocale;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 1,
    key: 'tutoriales',
    color: '#1756e1',
    ink: '#1449c0',
    tint: '#e8eefc',
    es: { slug: 'tutoriales', name: 'Tutoriales', description: 'Guías prácticas paso a paso sobre desarrollo de software, herramientas, cloud e inteligencia artificial.' },
    en: { slug: 'tutorials', name: 'Tutorials', description: 'Practical step-by-step guides on software development, tools, cloud and artificial intelligence.' },
  },
  {
    id: 2,
    key: 'actualidad',
    color: '#e5484d',
    ink: '#c62a2f',
    tint: '#fdeced',
    es: { slug: 'actualidad', name: 'Actualidad', description: 'Las noticias de tecnología que importan, explicadas con contexto y criterio técnico.' },
    en: { slug: 'news', name: 'News', description: 'The technology news that matters, explained with context and technical judgment.' },
  },
  {
    id: 3,
    key: 'inteligencia-artificial',
    color: '#7c3aed',
    ink: '#6527d1',
    tint: '#f1eafd',
    es: { slug: 'inteligencia-artificial', name: 'Inteligencia Artificial', description: 'Modelos, herramientas y casos reales de inteligencia artificial aplicada a productos y equipos.' },
    en: { slug: 'artificial-intelligence', name: 'Artificial Intelligence', description: 'Models, tools and real-world cases of artificial intelligence applied to products and teams.' },
  },
  {
    id: 4,
    key: 'seguridad',
    color: '#0f9d58',
    ink: '#0b7a43',
    tint: '#e3f5ec',
    es: { slug: 'seguridad', name: 'Seguridad', description: 'Ciberseguridad, vulnerabilidades y buenas prácticas para proteger aplicaciones e infraestructura.' },
    en: { slug: 'security', name: 'Security', description: 'Cybersecurity, vulnerabilities and best practices to protect applications and infrastructure.' },
  },
  {
    id: 5,
    key: 'arquitectura',
    color: '#f08c00',
    ink: '#a85b00',
    tint: '#fef1dd',
    es: { slug: 'arquitectura', name: 'Arquitectura', description: 'Arquitectura de software, sistemas distribuidos, escalabilidad y decisiones técnicas.' },
    en: { slug: 'architecture', name: 'Architecture', description: 'Software architecture, distributed systems, scalability and technical decision-making.' },
  },
  {
    id: 6,
    key: 'negocios',
    color: '#d6249f',
    ink: '#ad1680',
    tint: '#fce8f5',
    es: { slug: 'negocios', name: 'Negocios', description: 'Tecnología y negocio: estrategia, liderazgo, startups y el impacto de la tecnología en las empresas.' },
    en: { slug: 'business', name: 'Business', description: 'Technology and business: strategy, leadership, startups and the impact of technology on companies.' },
  },
];

export const categoryByKey = (key: string) => CATEGORIES.find((c) => c.key === key);
export const categoryById = (id: number) => CATEGORIES.find((c) => c.id === id);

/** Variables CSS de color de una categoría, para usar en `style`. */
export const catStyle = (c: CategoryColors) => `--cat:${c.color};--cat-ink:${c.ink};--cat-tint:${c.tint}`;
