// robots.txt from the brand origin (only when configured: a sitemap URL must be absolute).
import type { MetadataRoute } from 'next';
import { configuredOrigin } from '@/content/brand';

export default function robots(): MetadataRoute.Robots {
  const origin = configuredOrigin();
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    ...(origin ? { sitemap: `${origin}/sitemap.xml`, host: origin } : {}),
  };
}
