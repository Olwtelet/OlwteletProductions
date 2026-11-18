'use client';
// Original module 25144 `handlePageTransition(href, isNavOrigin)`:
//   ignored while transitioning or when href === pathname; otherwise set the work-grid filters from the
//   URL (?zone/client/feature/service, first value only) and the transition intent.
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { appStore, filtersFromSearchParams, setWorkGridFilters, useAppStore } from '@/lib/store';
import { useOptionalSound } from '@/components/providers/SoundProvider';

export function usePageTransition() {
  const pathname = usePathname() || '/';
  // Original: `{ setTransitionIntent, isTransitioning, setWorkGridFilters } = useStore()` — a WHOLE-store subscription,
  // so every TransitionLink (header, nav, footer, the 93 list rows, Related work…) re-renders on every store write,
  // and the guard reads the render-time isTransitioning. Kept for the same main-thread cost between a grid click and
  // the transition fill (audit home-01, docs/implementation/home-ui.md wave-B notes).
  const { isTransitioning } = useAppStore();
  const handlePageTransition = useCallback(
    (href: string, isNavOrigin = false) => {
      if (isTransitioning || href === pathname) return;
      const url = new URL(href, window.location.origin);
      setWorkGridFilters(filtersFromSearchParams(url.searchParams));
      appStore.set({ transitionIntent: { href, origin: isNavOrigin ? 'nav' : undefined } });
    },
    [isTransitioning, pathname],
  );
  return { handlePageTransition };
}

export interface TransitionNavigateOptions {
  /** mark the intent as coming from the nav/logo (original `isNavOrigin`) */
  isNavOrigin?: boolean;
  /** also play click.mp3 like a TransitionLink (the original grid tile click does NOT) */
  sound?: boolean;
}

/**
 * Programmatic navigation through the page-transition layer (e.g. a work-grid tile click).
 *   const navigate = useTransitionNavigate();  navigate(`/projects/${uid}`);
 */
export function useTransitionNavigate() {
  const { handlePageTransition } = usePageTransition();
  const sound = useOptionalSound();
  return useCallback(
    (href: string, opts?: TransitionNavigateOptions) => {
      handlePageTransition(href, opts?.isNavOrigin ?? false);
      if (opts?.sound) void sound?.playClip('click');
    },
    [handlePageTransition, sound],
  );
}
