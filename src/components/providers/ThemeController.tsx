'use client';
// Original module 84866 ("ThemeAndTransitionWatcher"). Renders nothing. Effects, in the original order:
//  1. theme lerp: on every store-theme change, read the current inline --color-primary/--color-secondary of
//     <html> and animate a motion value 0→1 over 1 s (framer easeOut = cubic-bezier(0,0,.58,1)); each frame
//     writes `#${new THREE.Color(from).lerp(new THREE.Color(to), p).getHexString()}` (linear-light lerp).
//     First load: inline vars are empty → THREE.Color("") = white, so e.g. "/" goes white→#000000.
//  2. transitionIntent → transition {from, to, enter/exit variant} (FADE pair only when the target path is "/")
//  3. visitedPaths (component state, consecutive duplicates collapsed)
//  4. workgridState = 'work' when visitedPaths.length > 1 or pathname !== "/"
//  5. theme = pageThemes[to ?? pathname] || pageThemes[template] || #FFFFFF/#202020   (⇒ changes ON CLICK)
//  6. isTransitioning false → transition = null
//  7. isWorkGridRender = pathname === "/"
//  8. header client logo cleared when leaving /projects/* (or when a transition starts from a project)
//  9. SFX: target includes /projects → riser.mp3; target "/" → swipe.mp3
import { animate, useMotionValue } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { lerpHex } from '@/lib/color';
import { appStore, shallowEqual, useAppStore } from '@/lib/store';
import { resolveTheme, ROUTES, transitionVariantsFor } from '@/lib/theme';
import type { PageThemes } from '@/lib/types';
import { useOptionalSound } from './SoundProvider';

export const THEME_LERP_SECONDS = 1;

export function ThemeController({ pageThemes }: { pageThemes: PageThemes }) {
  const sound = useOptionalSound();
  const playClip = sound?.playClip;
  const { theme, transition, isTransitioning, transitionIntent } = useAppStore(
    (s) => ({ theme: s.theme, transition: s.transition, isTransitioning: s.isTransitioning, transitionIntent: s.transitionIntent }),
    shallowEqual,
  );
  const [visitedPaths, setVisitedPaths] = useState<string[]>([]);
  const pathname = usePathname() || '/';
  const progress = useMotionValue(0);

  // 1. theme lerp
  useEffect(() => {
    const html = document.documentElement;
    const fromPrimary = html.style.getPropertyValue('--color-primary');
    const fromSecondary = html.style.getPropertyValue('--color-secondary');
    animate(progress, [0, 1], {
      duration: THEME_LERP_SECONDS,
      ease: 'easeOut',
      onUpdate: (p) => {
        html.style.setProperty('--color-primary', lerpHex(fromPrimary, theme.primaryColor, p));
        html.style.setProperty('--color-secondary', lerpHex(fromSecondary, theme.secondaryColor, p));
      },
    });
  }, [theme, progress]);

  // 2. intent → transition
  useEffect(() => {
    if (!transitionIntent || transitionIntent.href === pathname) return;
    appStore.set({ transition: { from: pathname, to: transitionIntent.href, ...transitionVariantsFor(transitionIntent.href) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionIntent]);

  // 3. visited paths: this component's own state, as the original's `[b, L] = useState([])` (not a store write, so a
  //    route change does not notify the store's subscribers one more time)
  useEffect(() => {
    setVisitedPaths((v) => (v[v.length - 1] === pathname ? v : [...v, pathname]));
  }, [pathname]);

  // 4. skip the intro gate on non-home routes / after any navigation
  useEffect(() => {
    if (visitedPaths.length > 1 || pathname !== ROUTES.home) appStore.set({ workgridState: 'work' });
  }, [visitedPaths, pathname]);

  // 5. theme from the transition target (on click) or the current path
  useEffect(() => {
    appStore.set({ theme: resolveTheme(transition ? transition.to : pathname, pageThemes) });
  }, [transition, pathname, pageThemes]);

  // 6. end of transition
  useEffect(() => {
    if (!isTransitioning) appStore.set({ transition: null });
  }, [isTransitioning]);

  // 7. grid renders continuously only on "/"
  useEffect(() => {
    appStore.set({ isWorkGridRender: pathname === ROUTES.home });
  }, [pathname]);

  // 8. header client logo
  useEffect(() => {
    const fromProject = !!transition && transition.from.includes(ROUTES.projects);
    if (!pathname.includes(ROUTES.projects) || fromProject) appStore.set({ headerLogo: null, headerLogos: [] });
  }, [pathname, transition]);

  // 9. transition sounds
  useEffect(() => {
    if (transition && transition.to !== pathname && playClip) {
      if (transition.to.includes(ROUTES.projects)) void playClip('riser');
      if (transition.to === ROUTES.home) void playClip('swipe');
    }
  }, [transition, playClip, pathname]);

  return null;
}

export default ThemeController;
