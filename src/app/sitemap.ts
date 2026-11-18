// sitemap.xml: the pages of the Olwtelet Productions site, from the content (projects of src/content/brand.ts and the
// pages of pages.json). URLs need the configured origin (NEXT_PUBLIC_SITE_URL or Vercel's production URL); without
// it the sitemap is empty rather than pointing at an invented address.
import type { MetadataRoute } from 'next';
import { PROJECTS, configuredOrigin } from '@/content/brand';
import { getPages } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = configuredOrigin();
  if (!origin) return [];
  const pages = getPages()
    .filter((p) => p.inSitemap && p.route !== '/contact')
    .map((p) => p.route);
  const routes = ['/', ...PROJECTS.map((p) => `/projects/${p.uid}`), ...pages, '/contact'];
  return [...new Set(routes)].map((route) => ({ url: `${origin}${route === '/' ? '' : route}` || origin }));
}
