'use client';
// Original module 25655 "TransitionElement" (design-system.md §6.1/§6.2).
// Fixed z-index 1000 layer under the chrome (z 9999). While a transition runs it mounts
//   AnimatePresence(popLayout) > div(display:contents) > motion.div.Fill (bg = pageThemes[to].secondaryColor,
//   EXACT key only, else #DFDFDF) + motion.div.Underlay (bg = live --color-secondary; painted above the fill).
// router.push(to) fires when the fill's ENTER animation completes; the layer is removed when the pathname
// changes, which plays the exit variants.
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useState } from 'react';
import { resolveHomeHref } from '@/components/home/ui/homeAlias';
import { EASE_TRANSITION } from '@/lib/easings';
import { appStore, useAppStore, type PageTransition } from '@/lib/store';
import { DEFAULT_FILL, fillColorFor, TRANSITION_VARIANT as V } from '@/lib/theme';
import type { PageThemes } from '@/lib/types';
import { RouteCssCommit } from './RouteCssCommit';
import styles from './transitionLayer.module.css';

/** Underlay variants (`d`) — default ease (easeOut) when only a duration is given. */
export const UNDERLAY_VARIANTS: Variants = {
  initial: { opacity: 0 },
  [V.ADD_LAYER_ENTER]: { opacity: [0, 1], transition: { duration: 0.5, ease: 'easeOut' } },
  [V.ADD_LAYER_EXIT]: { opacity: 0, transition: { duration: 0.5, delay: 0.5, ease: 'easeOut' } },
  [V.FADE_LAYER_ENTER]: { opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  [V.FADE_LAYER_EXIT]: { opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  [V.SNAP]: { opacity: 0, transition: { duration: 0.1, ease: 'easeOut' } },
};

/** Fill variants (`m`) */
export const FILL_VARIANTS: Variants = {
  initial: { transform: 'translateY(100%)', opacity: 0 },
  [V.ADD_LAYER_ENTER]: {
    opacity: [0, 1],
    transform: ['translateY(100%)', 'translateY(0)'],
    transition: { duration: 0.5, ease: EASE_TRANSITION },
  },
  [V.ADD_LAYER_EXIT]: { opacity: 0, transition: { delay: 0.5, duration: 0.5, ease: 'easeOut' } },
  [V.SNAP]: { opacity: 0, transform: ['translateY(100%)'], transition: { duration: 0.5, ease: EASE_TRANSITION } },
  [V.FADE_LAYER_ENTER]: {
    opacity: [0, 1],
    transform: ['translateY(0%)', 'translateY(0%)'],
    transition: { duration: 0.5, ease: EASE_TRANSITION },
  },
  [V.FADE_LAYER_EXIT]: {
    opacity: [1, 0],
    transform: ['translateY(0%)', 'translateY(0%)'],
    transition: { delay: 0.5, duration: 0.5, ease: 'easeOut' },
  },
};

export const TransitionLayer = memo(function TransitionLayer({ colors }: { colors: PageThemes }) {
  const transition = useAppStore((s) => s.transition);
  const isTransitioning = useAppStore((s) => s.isTransitioning);
  const [active, setActive] = useState<PageTransition | null>(null);
  const [fill, setFill] = useState(DEFAULT_FILL);
  const router = useRouter();
  const pathname = usePathname();

  const onFillComplete = useCallback(() => {
    // Original module 25655: `C = useCallback(() => { t && router.push(t.to) }, [t, router])` on EVERY completion of
    // the fill animation. After the ENTER it navigates; after the EXIT (the exiting fill keeps this closure) it pushes
    // the current URL again, which the router records as a replaceState (MEASURED, audit navigation-08: push then
    // replace). With a stale transition — Enter on the keyboard-focused "Let's Talk" on "/" runs the grid's Enter
    // handler AND the /contact navigation — the exit push navigates the page under the open modal to the project
    // (MEASURED, audit contact-legal-02, docs/evidence/grid-engine/wave-b/kb-letstalk/).
    // "/" goes straight to the session's home alias (original router quirk, home/ui/homeAlias.ts), so the history
    // gets one push of the aliased URL, as on the original, instead of push "/" + replace.
    if (transition) router.push(transition.to === '/' ? resolveHomeHref('/', '') : transition.to);
  }, [transition, router]);

  useEffect(() => {
    if (!transition) return;
    setFill(fillColorFor(transition.to, colors));
    appStore.set({ isTransitioning: true });
    setActive(transition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition]);

  useEffect(() => {
    appStore.set({ isTransitioning: false });
    setActive(null);
  }, [pathname]);

  useEffect(() => {
    if (!isTransitioning) setFill(DEFAULT_FILL);
  }, [isTransitioning]);

  return (
    <div className={styles.TransitionElementContainer}>
      {/* commit timing of the original's per-route stylesheets (renders nothing, foundation.md §11) */}
      <RouteCssCommit />
      <AnimatePresence mode="popLayout">
        {transition && active && (
          <div key="list-container" className={styles.AnimatePresenceListContainer}>
            <motion.div
              key="transitionFill"
              className={styles.TransitionElementFill}
              style={{ backgroundColor: fill }}
              variants={FILL_VARIANTS}
              animate={active.enterVariant}
              exit={active.exitVariant}
              onAnimationComplete={onFillComplete}
            />
            <motion.div key="underlay" className={styles.Underlay} variants={UNDERLAY_VARIANTS} animate={active.enterVariant} exit={active.exitVariant} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default TransitionLayer;
