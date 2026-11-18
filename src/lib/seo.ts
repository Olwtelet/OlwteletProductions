// Metadata builders. Olwtelet Productions: titles, descriptions and Open Graph come from src/content/brand.ts and the
// content records (pages.json, home.json, projects.json). Server-only.
//
// Origin: canonical URLs and absolute og:url/og:image need the site's public address. It is read from
// NEXT_PUBLIC_SITE_URL (or, on Vercel, VERCEL_PROJECT_PRODUCTION_URL) — never invented. Without one, canonicals are
// left out and Open Graph images are omitted (a relative og:image would resolve to localhost).
// Icons come from the file conventions in src/app (favicon.ico, icon.svg, apple-icon.png) and app/manifest.ts.
import 'server-only';
import type { Metadata } from 'next';
import { BRAND, configuredOrigin } from '@/content/brand';
import { getHome, getPage, getProject } from './content';
import type { Project, SeoRecord } from './types';

export const SITE_ORIGIN: string | null = configuredOrigin();
export const SITE_NAME = BRAND.name;
export const DEFAULT_OG_IMAGE = BRAND.assets.ogImage;

/** `Página · Olwtelet Productions` */
export function pageTitle(title: string): string {
  return `${title} · ${BRAND.name}`;
}

function absolute(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!SITE_ORIGIN) return null;
  return SITE_ORIGIN + (url.startsWith('/') ? url : `/${url}`);
}

function parseRobots(v: string | null): { index: boolean; follow: boolean } | null {
  if (!v) return null;
  const parts = v.split(',').map((s) => s.trim().toLowerCase());
  return { index: !parts.includes('noindex'), follow: !parts.includes('nofollow') };
}

/** Root metadata (layout): defaults every route inherits. */
export function rootMetadata(): Metadata {
  return {
    ...(SITE_ORIGIN ? { metadataBase: new URL(SITE_ORIGIN) } : {}),
    applicationName: BRAND.name,
    // default = the brand name only: it is also what the bare 404 shell of a segment notFound() shows before hydration
    title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
    description: BRAND.description,
    authors: [{ name: `${BRAND.creator.name} (${BRAND.creator.pseudonym})`, url: BRAND.links.site.href }],
    creator: BRAND.creator.name,
    openGraph: { siteName: BRAND.name, locale: BRAND.ogLocale, type: 'website' },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

/** Content SeoRecord → Next Metadata. */
export function metadataFromSeo(seo: SeoRecord): Metadata {
  const md: Metadata = {};
  if (seo.title != null) md.title = { absolute: seo.title };
  if (seo.description) md.description = seo.description;
  const canonical = absolute(seo.canonical);
  if (canonical) md.alternates = { canonical };
  const robots = parseRobots(seo.robots);
  const googleBot = parseRobots(seo.googlebot);
  if (robots) md.robots = { ...robots, ...(googleBot ? { googleBot } : {}) };
  const og = seo.og || {};
  if (Object.keys(og).length) {
    const image = absolute(og.image);
    md.openGraph = {
      siteName: og.site_name || BRAND.name,
      locale: BRAND.ogLocale,
      type: 'website',
      ...(og.title ? { title: og.title } : {}),
      ...(og.description ? { description: og.description } : {}),
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [{ url: image, alt: og.title || BRAND.name }] } : {}),
    };
  }
  const tw = seo.twitter || {};
  if (Object.keys(tw).length) {
    const image = absolute(tw.image);
    md.twitter = {
      ...(tw.card ? { card: tw.card as 'summary_large_image' } : {}),
      ...(tw.title ? { title: tw.title } : {}),
      ...(tw.description ? { description: tw.description } : {}),
      ...(image ? { images: [image] } : {}),
    };
  }
  return md;
}

/** Project pages: "<title> · Olwtelet Productions", description = summary, image = the project's Open Graph image. */
export function projectSeo(p: Project): SeoRecord {
  const d = p.data || {};
  const title = pageTitle(d.title);
  const ogTitle = d.meta_title || title;
  const description: string | null = d.meta_description || null;
  const image: string = (d.meta_image && d.meta_image.url) || DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    canonical: `/projects/${p.uid}`,
    robots: null,
    googlebot: null,
    og: { title: ogTitle, ...(description ? { description } : {}), site_name: SITE_NAME, image },
    twitter: { card: 'summary_large_image', title: ogTitle, ...(description ? { description } : {}), image },
    icons: [],
    headRobots: null,
  };
}

export function projectMetadata(uid: string): Metadata {
  const p = getProject(uid);
  if (!p) return notFoundMetadata;
  return metadataFromSeo(projectSeo(p));
}

export function homeMetadata(): Metadata {
  return metadataFromSeo(getHome().seo);
}

/** Any non-project route recorded in pages.json (/about/studio, /about/process, /contact, /privacy-policy). */
export function routeMetadata(route: string): Metadata {
  const page = getPage(route);
  if (page) return metadataFromSeo(page.seo);
  const pm = /^\/projects\/([^/]+)$/.exec(route);
  if (pm) return projectMetadata(pm[1]);
  return notFoundMetadata;
}

/** 404 pages: "Página não encontrada · Olwtelet Productions", never indexed. */
export const notFoundMetadata: Metadata = {
  title: { absolute: pageTitle('Página não encontrada') },
  description: 'Página não encontrada.',
  robots: { index: false, follow: true },
};

/** Kept for the 404 routes' generateMetadata (same as notFoundMetadata now: the title is in the server head). */
export const notFoundHeadMetadata: Metadata = notFoundMetadata;
