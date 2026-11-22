// Builders de datos estructurados (JSON-LD, schema.org).

import type { Category, Locale } from './categories';
import type { Entry } from './content';
import { STATIC_PATHS, t } from './i18n';
import { AUTHOR, SITE_NAME, SITE_URL, SOCIALS } from './site';

export const abs = (path: string) => new URL(path, SITE_URL).toString();

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

type Json = Record<string, unknown>;

export function person(locale: Locale, image: string): Json {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: AUTHOR.name,
    url: abs(STATIC_PATHS.about[locale]),
    image: abs(image),
    jobTitle: AUTHOR.jobTitle,
    description: t(locale).aboutDescription,
    worksFor: { '@type': 'Organization', name: AUTHOR.worksFor.name, url: AUTHOR.worksFor.url },
    knowsAbout: AUTHOR.knowsAbout,
    sameAs: SOCIALS.map((s) => s.url),
  };
}

export function website(locale: Locale): Json {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: abs('/'),
    name: SITE_NAME,
    description: t(locale).siteTagline,
    inLanguage: ['es', 'en'],
    publisher: { '@id': PERSON_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${abs(STATIC_PATHS.search.es)}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(crumbs: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

export function collectionPage(locale: Locale, cat: Category, path: string, entries: Entry[], crumbs: Crumb[]): Json[] {
  return [
    {
      '@type': 'CollectionPage',
      '@id': `${abs(path)}#webpage`,
      url: abs(path),
      name: cat[locale].name,
      description: cat[locale].description,
      inLanguage: locale,
      isPartOf: { '@id': WEBSITE_ID },
      breadcrumb: { '@id': `${abs(path)}#breadcrumb` },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: entries.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(e.url), name: e.title })),
      },
    },
    { ...breadcrumbList(crumbs), '@id': `${abs(path)}#breadcrumb` },
  ];
}

export function blogPosting(entry: Entry, crumbs: Crumb[]): Json[] {
  const url = abs(entry.url);
  const words = entry.html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      url,
      headline: entry.title.slice(0, 110),
      description: entry.excerpt,
      image: [abs(entry.ogImage)],
      datePublished: entry.publishedAt,
      dateModified: entry.updatedAt,
      inLanguage: entry.locale,
      articleSection: entry.category[entry.locale].name,
      wordCount: words,
      author: { '@id': PERSON_ID, '@type': 'Person', name: AUTHOR.name, url: abs(STATIC_PATHS.about[entry.locale]) },
      publisher: { '@id': PERSON_ID },
      isPartOf: { '@id': WEBSITE_ID },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      ...(entry.sourceUrl ? { isBasedOn: entry.sourceUrl } : {}),
      ...(Object.keys(entry.alternates).length > 1
        ? {
            workTranslation: Object.entries(entry.alternates)
              .filter(([l]) => l !== entry.locale)
              .map(([l, p]) => ({ '@type': 'BlogPosting', '@id': `${abs(p!)}#article`, inLanguage: l })),
          }
        : {}),
    },
    { ...breadcrumbList(crumbs), '@id': `${url}#breadcrumb` },
  ];
}

export function profilePage(locale: Locale, path: string, image: string): Json[] {
  return [
    {
      '@type': 'ProfilePage',
      '@id': `${abs(path)}#webpage`,
      url: abs(path),
      name: t(locale).aboutTitle,
      inLanguage: locale,
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': PERSON_ID },
    },
    person(locale, image),
  ];
}

export const graph = (nodes: Json[]) => ({ '@context': 'https://schema.org', '@graph': nodes });
