// Configuración del sitio. Todo lo de acá es público.

export const SITE_URL = 'https://danielsegovia.com';
export const SITE_NAME = 'Daniel Segovia';
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

export const AUTHOR = {
  name: 'Daniel Segovia',
  jobTitle: 'Chief Technology Officer',
  worksFor: { name: 'Terrand', url: 'https://terrand.app' },
  email: 'support@24237215.hubspot-inbox.com',
  alumniOf: [] as string[],
  knowsAbout: [
    'Software Architecture',
    'Software Development',
    'Engineering Leadership',
    'Artificial Intelligence',
    'Cybersecurity',
    'Cloud Computing',
    'Digital Products',
  ],
};

export const SOCIALS = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/danielsegovia/' },
  { name: 'Instagram', url: 'https://www.instagram.com/danielsegovia_cto/' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@danisegovia_cto' },
  { name: 'YouTube', url: 'https://www.youtube.com/@daniel_segovia/' },
] as const;

export interface AdSlot {
  /** data-ad-slot del bloque en AdSense. */
  id: string;
  width: number;
  height: number;
  /** En desktop queda fijo en la columna lateral mientras se scrollea. */
  sticky?: boolean;
  /** Nombre del bloque en AdSense (referencia). */
  name: string;
}

/**
 * AdSense. Mientras `client` esté vacío no se renderiza ningún anuncio ni el ads.txt.
 * Bloques fijos (no responsive): el espacio queda reservado con su medida exacta (CLS = 0).
 */
export const ADSENSE: { client: string; slots: AdSlot[] } = {
  client: 'ca-pub-3288067525064259',
  slots: [
    { id: '1092052285', width: 300, height: 600, sticky: true, name: 'Pagina Articulo Lateral Grande' },
    { id: '3932791867', width: 300, height: 250, name: 'Pagina Articulo Lateral Chico' },
  ],
};

/** Notas por página en el listado de categorías. */
export const PAGE_SIZE = 10;
