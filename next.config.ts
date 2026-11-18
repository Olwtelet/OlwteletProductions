import type { NextConfig } from 'next';

/**
 * Content Security Policy: every image, video, model and font of the site is served from its own origin (/brand/**,
 * /projects/**, /assets/**, /fonts/**); the only third-party hosts are the Adobe Fonts kit (ballinger-mono).
 * The Google tag hosts are allowed only when the tag is configured (NEXT_PUBLIC_GA_ID, see src/app/layout.tsx).
 * `upgrade-insecure-requests` only when the public origin is https (NEXT_PUBLIC_SITE_URL), so plain-http local
 * servers keep working. Production only: `next dev` needs eval for React's dev tooling.
 */
function contentSecurityPolicy(): string {
  const ga = !!process.env.NEXT_PUBLIC_GA_ID;
  const gaScript = ga ? ' https://www.googletagmanager.com' : '';
  const gaConnect = ga ? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com' : '';
  const gaImg = ga ? ' https://*.google-analytics.com https://*.googletagmanager.com' : '';
  const https = (process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https://');
  return [
    "default-src 'self'",
    'worker-src blob:',
    `script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'${gaScript}`,
    "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
    "font-src 'self' https://use.typekit.net https://p.typekit.net",
    `connect-src 'self'${gaConnect}`,
    `img-src 'self' blob: data:${gaImg} https://p.typekit.net`,
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets a verification build live beside the main one (e.g. NEXT_DIST_DIR=.next-verify next build &&
  // NEXT_DIST_DIR=.next-verify next start -p 3002) without touching the running servers' .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: false,
  images: { unoptimized: true },
  // keep the dev "N" route indicator out of the visual comparisons (scripts/compare.mjs)
  devIndicators: false,
  async redirects() {
    return [
      // /about has no page of its own: the Estúdio view is the default
      { source: '/about', destination: '/about/studio', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // /index and /index?<query> answer 200 with the home document; the URL stays /index.
      { source: '/index', destination: '/' },
    ];
  },
  async headers() {
    if (!isProd) return [];
    return [
      { source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: contentSecurityPolicy() }] },
      { source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] },
    ];
  },
};

export default nextConfig;
