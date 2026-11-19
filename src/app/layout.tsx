// Root layout — composition and DOM order reproduced from the original RSC tree (design-system.md §4):
// <html><head>[preconnect] <link typekit></head>
// <body> SoundProvider > SmoothScroll > [JSON-LD ×2, page, ThemeController, LayoutWrapper(order 1: Header+Nav),
//        CookieBanner, (gtag scripts), TransitionLayer, @contact slot]
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import CookieBanner from '@/components/chrome/CookieBanner';
import Header, { ShortDescription } from '@/components/chrome/Header';
import Nav from '@/components/chrome/Nav';
import { TabTitle } from '@/components/chrome/TabTitle';
import { SmoothScroll } from '@/components/providers/SmoothScroll';
import { SoundProvider } from '@/components/providers/SoundProvider';
import { ThemeController } from '@/components/providers/ThemeController';
import { TransitionLayer } from '@/components/transition/TransitionLayer';
import { LayoutWrapper } from '@/components/ui/LayoutWrapper';
import { BRAND, configuredOrigin } from '@/content/brand';
import { getPageThemes, getSettings } from '@/lib/content';
import { rootMetadata } from '@/lib/seo';

/**
 * Adobe Fonts kit (ballinger-mono, the MonoDetail face). Default: the kit the replica was built with (gtx3zug), kept so
 * the typography stays as built. EXTERNAL DEPENDENCY: that kit is licensed to its owner, not to Olwtelet Productions;
 * set NEXT_PUBLIC_TYPEKIT_KIT to a kit licensed for this site (docs/OLWTELET.md).
 */
const TYPEKIT_KIT = process.env.NEXT_PUBLIC_TYPEKIT_KIT || 'gtx3zug';
/** SRI only for the original kit (the hash is that kit's CSS, FROM-CODE home.html head). */
const TYPEKIT_SRI: Record<string, string> = { gtx3zug: 'sha384-zYG6sGlM2bOiMj7IpEfpbLFemxFK2wA2WeEpmJU5Uq/3msWOKl7PBHBoGPKyNfHK' };
/** Google tag: only loaded when configured (NEXT_PUBLIC_GA_ID); the cookie banner exists only then. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Defaults (the tab title TAB_TITLE with no template, description, Open Graph site name and locale, metadataBase when the
// origin is configured).
// Icons: src/app/favicon.ico, icon.svg, apple-icon.png and manifest.ts (file conventions).
export const metadata: Metadata = rootMetadata();
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#000000' };

/** Organization + WebSite structured data from the brand facts (URLs only when the site origin is configured). */
function structuredData(): object[] {
  const origin = configuredOrigin();
  const sameAs = [BRAND.links.site.href, BRAND.links.github.href, BRAND.links.linkedin.href];
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    ...(origin ? { url: origin, logo: `${origin}${BRAND.assets.logoPng}` } : {}),
    description: BRAND.description,
    email: BRAND.contact.email,
    address: { '@type': 'PostalAddress', addressLocality: BRAND.location.city, addressRegion: BRAND.location.region, addressCountry: BRAND.location.countryCode },
    founder: { '@type': 'Person', name: BRAND.creator.name, alternateName: BRAND.creator.pseudonym, sameAs },
    sameAs,
  };
  const website = { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND.name, inLanguage: BRAND.locale, ...(origin ? { url: origin } : {}) };
  return [organization, website];
}
/** JSON inside <script>: "<" escaped so no string can close the tag. */
function jsonLd(item: unknown): string {
  return JSON.stringify(item, null, 2).replace(/</g, '\\u003c');
}

export default function RootLayout({ children, contact }: { children: ReactNode; contact: ReactNode }) {
  const settings = getSettings();
  const pageThemes = getPageThemes();
  const sri = TYPEKIT_SRI[TYPEKIT_KIT];
  return (
    // No data-scroll-behavior (as the original, Next 16.2.1): the router's scroll-to-top on navigation then runs under the
    // CSS html{scroll-behavior:smooth}, i.e. it animates and is cancelled by any later window.scrollTo (SplitType restores
    // its saved offset after each split) — docs/implementation/foundation.md §5.5.
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://use.typekit.net" />
        <link rel="stylesheet" href={`https://use.typekit.net/${TYPEKIT_KIT}.css`} {...(sri ? { integrity: sri } : {})} crossOrigin="anonymous" />
      </head>
      <body>
        {/* keeps the tab title (TAB_TITLE) mounted while Next swaps the metadata <title> of a client navigation */}
        <TabTitle />
        <SoundProvider>
          <SmoothScroll>
            {structuredData().map((item, i) => (
              <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(item) }} />
            ))}
            {children}
            <ThemeController pageThemes={pageThemes} />
            <LayoutWrapper order={1}>
              <Header slices={settings.header.data}>
                <ShortDescription>{BRAND.tagline}</ShortDescription>
              </Header>
              <Nav />
            </LayoutWrapper>
            <CookieBanner slices={settings.cookieBanner.data} />
            {GA_ID && (
              <>
                <Script defer strategy="beforeInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
                <Script defer id="gtag-datalayer" strategy="beforeInteractive">{`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('consent', 'default', {
                  'analytics_storage': 'denied',
                  'ad_storage': 'denied',
                  'ad_user_data': 'denied',
                  'ad_personalization': 'denied'
                });

                gtag('config', ${JSON.stringify(GA_ID)});`}</Script>
              </>
            )}
            <TransitionLayer colors={pageThemes} />
            {contact}
          </SmoothScroll>
        </SoundProvider>
      </body>
    </html>
  );
}
