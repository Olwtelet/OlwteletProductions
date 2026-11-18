'use client';
// Cookie banner — original chunk 1388 module 96895 (component) + 95865 (hook → @/lib/consent useCookieConsent).
// docs/recon/intro-and-chrome.md §12, design-system.md §4.11.
// - Rendered on the server hidden (store default showCookieBanner:false); on mount the hook reads
//   localStorage.CookieBanner: absent → shown; {status:"true"} → hidden + consent; {status:"false"} → stays hidden.
// - No enter/exit animation: visible ⇄ `display:none` instantly. Accept/Decline write {date, status} and drive the
//   gtag consent update (only when a Google tag is configured).
// - Reusable: the root layout renders one, and home-ui renders a second one on "/" (the original duplicates it;
//   both share the store so they show/hide together).
// Olwtelet Productions: the banner asks for consent to analytics cookies, so it exists only when analytics is
// configured (NEXT_PUBLIC_GA_ID). Without it the site sets no analytics cookie and shows no banner.
// Final API (kept): default export `CookieBanner({ slices })`.
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { useCookieConsent } from '@/lib/consent';
import { RichText } from '@/lib/prismic/RichText';
import type { CookieBannerData } from '@/lib/types';
import s from './cookieBanner.module.css';

const ANALYTICS_CONFIGURED = !!process.env.NEXT_PUBLIC_GA_ID;

export default function CookieBanner({ slices }: { slices: CookieBannerData }) {
  return ANALYTICS_CONFIGURED ? <CookieBannerView slices={slices} /> : null;
}

function CookieBannerView({ slices }: { slices: CookieBannerData }) {
  const { showCookieBanner, handleCookieBanner } = useCookieConsent();
  return (
    // styled variant `visibility`: true → the container class again, false → container + _Hide
    <div className={cx(s.CookieBannerContainer, showCookieBanner ? s.CookieBannerContainer : s.CookieBannerContainer_Hide)}>
      <div className={s.CookieBannerContent}>
        <div className={cx(s.CookieBannerDescription, typography.MonoDetail)}>
          <RichText field={slices.main_text} />
        </div>
        <button className={s.CookieBannerButton} onClick={() => handleCookieBanner(true)}>
          {slices.accept_text}
        </button>
        {/* `color: "grey"` variant → class without CSS in the original */}
        <button className={s.CookieBannerButton} onClick={() => handleCookieBanner(false)}>
          {slices.decline_text}
        </button>
      </div>
    </div>
  );
}
