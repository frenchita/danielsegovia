import type { Locale } from './categories';
import { TIMEZONE } from './site';

export const UI = {
  es: {
    htmlLang: 'es',
    ogLocale: 'es_AR',
    home: 'Inicio',
    about: 'Sobre mí',
    search: 'Buscar',
    latest: 'Novedades',
    moreCategories: 'Más categorías',
    related: 'Notas relacionadas',
    latestPost: 'Último post',
    noPosts: 'Pronto habrá publicaciones en esta categoría.',
    readMore: 'Leer nota',
    page: 'Página',
    prev: 'Anterior',
    next: 'Siguiente',
    pagination: 'Paginado',
    breadcrumb: 'Ruta de navegación',
    mainNav: 'Categorías',
    by: 'Por',
    publishedOn: 'Publicado el',
    updatedOn: 'Actualizado el',
    source: 'Fuente original',
    inSpanish: 'En español',
    footerNav: 'Enlaces',
    social: 'Redes',
    otherLang: 'English',
    otherLangLabel: 'Read in English',
    ad: 'Publicidad',
    rights: 'Todos los derechos reservados.',
    siteTagline: 'Tecnología, IA, seguridad y arquitectura de software',
    homeTitle: 'Daniel Segovia | CTO · Tecnología, IA y Arquitectura de Software',
    homeDescription:
      'Blog de Daniel Segovia, CTO con más de 24 años en desarrollo de software: tutoriales, actualidad, inteligencia artificial, seguridad, arquitectura y negocios.',
    homeIntro:
      'Soy CTO en Terrand y llevo más de 24 años construyendo software, liderando equipos de tecnología y productos digitales. Acá escribo sobre lo que veo en la industria: inteligencia artificial, seguridad, arquitectura y el negocio detrás de la tecnología.',
    photoAlt: 'Daniel Segovia, Chief Technology Officer',
    aboutTitle: 'Sobre mí | Daniel Segovia, CTO',
    aboutDescription:
      'Daniel Segovia, Chief Technology Officer con más de 24 años de experiencia en desarrollo de software, arquitectura, liderazgo tecnológico y productos digitales.',
    aboutHeading: '¿Quién soy?',
    careerHeading: 'Mi carrera',
    careerAlt: 'Línea de tiempo de mi carrera en la industria IT',
    contact: 'Contacto',
    email: 'Email',
    searchTitle: 'Buscar | Daniel Segovia',
    searchDescription: 'Buscá entre todas las notas del sitio.',
    notFoundTitle: 'Página no encontrada',
    notFoundText: 'La página que buscás no existe o cambió de dirección.',
    backHome: 'Volver al inicio',
    minRead: 'min de lectura',
    isNew: 'Nuevo',
    toc: 'En esta nota',
    share: 'Compartir',
    copyLink: 'Copiar link',
    copied: 'Link copiado',
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    home: 'Home',
    about: 'About',
    search: 'Search',
    latest: 'Latest',
    moreCategories: 'More categories',
    related: 'Related posts',
    latestPost: 'Latest post',
    noPosts: 'Posts in this category are coming soon.',
    readMore: 'Read post',
    page: 'Page',
    prev: 'Previous',
    next: 'Next',
    pagination: 'Pagination',
    breadcrumb: 'Breadcrumb',
    mainNav: 'Categories',
    by: 'By',
    publishedOn: 'Published on',
    updatedOn: 'Updated on',
    source: 'Original source',
    inSpanish: 'In Spanish',
    footerNav: 'Links',
    social: 'Social',
    otherLang: 'Español',
    otherLangLabel: 'Leer en español',
    ad: 'Advertisement',
    rights: 'All rights reserved.',
    siteTagline: 'Technology, AI, security and software architecture',
    homeTitle: 'Daniel Segovia | CTO · Technology, AI and Software Architecture',
    homeDescription:
      'Daniel Segovia, CTO with 24+ years in software development, writes about tutorials, tech news, artificial intelligence, security, architecture and business.',
    homeIntro:
      'I am CTO at Terrand and have spent more than 24 years building software, leading technology teams and digital products. Here I write about what I see in the industry: artificial intelligence, security, architecture and the business behind technology.',
    photoAlt: 'Daniel Segovia, Chief Technology Officer',
    aboutTitle: 'About | Daniel Segovia, CTO',
    aboutDescription:
      'Daniel Segovia, Chief Technology Officer with more than 24 years of experience in software development, architecture, technology leadership, and digital products.',
    aboutHeading: 'Who am I?',
    careerHeading: 'My career',
    careerAlt: 'Timeline of my career in the IT industry',
    contact: 'Contact',
    email: 'Email',
    searchTitle: 'Search | Daniel Segovia',
    searchDescription: 'Search all posts on the site.',
    notFoundTitle: 'Page not found',
    notFoundText: 'The page you are looking for does not exist or has moved.',
    backHome: 'Back to home',
    minRead: 'min read',
    isNew: 'New',
    toc: 'In this post',
    share: 'Share',
    copyLink: 'Copy link',
    copied: 'Link copied',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type UIStrings = (typeof UI)[Locale];
export const t = (locale: Locale) => UI[locale];

/** Prefijo de ruta por idioma: español en la raíz, inglés en /en. */
export const prefix = (locale: Locale) => (locale === 'es' ? '' : '/en');

export const STATIC_PATHS = {
  home: { es: '/', en: '/en/' },
  about: { es: '/sobre-mi/', en: '/en/about/' },
  search: { es: '/buscar/', en: '/en/search/' },
  rss: { es: '/rss.xml', en: '/en/rss.xml' },
} as const;

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}
