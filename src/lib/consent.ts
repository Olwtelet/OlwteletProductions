// Cookie-consent hook (FROM-CODE chunk 1388 module 95865). Storage contract:
//   localStorage.CookieBanner = JSON {date, status: 'true' | 'false'}
// - key absent  -> banner shown
// - status true -> hidden, consent granted
// - status false-> hidden (never shown again), consent stays denied
// Each mounted instance pushes gtag('consent','update', …) when `isConsent` changes (the original's home page
// renders two banners, hence two pushes). gtag only exists when NEXT_PUBLIC_GA_ID is set (root layout).
import { useCallback, useEffect } from 'react';
import { appStore, shallowEqual, useAppStore } from './store';

export const COOKIE_CONSENT_KEY = 'CookieBanner';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function useCookieConsent() {
  const { isConsent, showCookieBanner } = useAppStore((s) => ({ isConsent: s.isConsent, showCookieBanner: s.showCookieBanner }), shallowEqual);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch {}
    if (raw) {
      try {
        if (JSON.parse(raw).status === 'true') appStore.set({ isConsent: true, showCookieBanner: false });
      } catch {}
    } else appStore.set({ showCookieBanner: true });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      // Olwtelet: only analytics storage follows the choice; advertising signals stay denied (no ads on this site)
      window.gtag('consent', 'update', {
        analytics_storage: isConsent ? 'granted' : 'denied',
      });
    }
  }, [isConsent]);

  const handleCookieBanner = useCallback((accepted: boolean) => {
    appStore.set({ showCookieBanner: false, isConsent: accepted });
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ date: new Date(), status: accepted.toString() }));
    } catch {}
  }, []);

  return {
    showCookieBanner,
    isConsent,
    handleCookieBanner,
    setShowCookieBanner: (v: boolean) => appStore.set({ showCookieBanner: v }),
    setIsConsent: (v: boolean) => appStore.set({ isConsent: v }),
  };
}
