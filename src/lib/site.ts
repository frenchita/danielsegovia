// Configuración del sitio. Todo lo de acá es público.

export const SITE_URL = 'https://danielsegovia.com';
export const SITE_NAME = 'Daniel Segovia';
/** Clave de IndexNow (pública por diseño): se verifica en `${SITE_URL}/${INDEXNOW_KEY}.txt` (public/). */
export const INDEXNOW_KEY = '7a669adce612802c5669089207e4bd22';
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
  { name: 'GitHub', url: 'https://github.com/frenchita' },
] as const;

/** Notas por página en el listado de categorías. */
export const PAGE_SIZE = 10;
