// framer-motion presets of the original (chunk 1388 module 18554). Spread them on motion components:
//   <motion.div {...chromeFade}>…</motion.div>
import type { Variants, MotionProps, Transition } from 'framer-motion';
import { EASE_UO, EASE_VV, EASE_XQ, EASE_ZW } from '@/lib/easings';

/** `v.BU` — chrome entrance: opacity 0→1, 0.3 s, delay 0.4, ease [0.5,1,0.89,1]; exit identical. */
export const chromeFade: Pick<MotionProps, 'initial' | 'animate' | 'exit'> = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, delay: 0.4, ease: EASE_UO } },
  exit: { opacity: 0, transition: { duration: 0.3, delay: 0.4, ease: EASE_UO } },
};
/** delay used by the header widgets (`$ = 0.4`) */
export const CHROME_DELAY = 0.4;

/** `v.z1(delay)` — client logo slide: y 100% → 0%, 0.6 s, delay e+0.4+0.6, ease xQ; exit back to 100%. */
export const slideUp = (delay: number): Pick<MotionProps, 'initial' | 'animate' | 'exit'> => ({
  initial: { y: '100%', opacity: 1, transition: { duration: 0.6, delay: 0, ease: EASE_XQ } },
  animate: { y: '0%', opacity: 1, transition: { duration: 0.6, delay: delay + 0.4 + 0.6, ease: EASE_XQ } },
  exit: { y: '100%', opacity: 1, transition: { duration: 0.6, delay: 0, ease: EASE_XQ } },
});

/** `v.ny(delay)` — "×" path draw (use with `custom={i}`, initial "hidden", animate "visible", exit "hidden"). */
export const crossPath = (delay: number): Variants => ({
  hidden: (i: number) => ({
    pathLength: 0,
    transition: { pathLength: { duration: 0.3, delay: 0.3 + 0.3 * i, ease: EASE_XQ } },
  }),
  visible: (i: number) => ({
    pathLength: 1,
    transition: { pathLength: { duration: 0.3, delay: delay + 0.5 - 0.05 + 0.3 * i, ease: EASE_XQ } },
  }),
});

/** `v.SI(delay, inView)` — FadeIn: opacity 0,y 20 → 1,0 (0.8 s, ease xQ) when inView. */
export const fadeInUp = (delay: number, inView: boolean): Pick<MotionProps, 'initial' | 'animate'> => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: inView ? 1 : 0, y: inView ? 0 : 20, transition: { delay, duration: 0.8, ease: EASE_XQ } },
});

/** `v.vV` — intro title move (custom = 'mobile' | 'desktop'). */
export const introTitleMove: Variants = {
  initial: (device: string) => ({ left: '50%', top: '50%', x: '-50%', y: '-50%', scale: device === 'mobile' ? 1 : 1.2 }),
  animate: { left: '0%', top: '-18%', x: '0%', y: '0%', scale: 1, transition: { delay: 0.6, duration: 0.8, ease: EASE_VV } },
};

/** `v.q1` */
export const riseOut: Variants = {
  hidden: { y: 0, opacity: 0 },
  visible: { y: -100, opacity: 1, transition: { duration: 0.5, delay: 0.3, ease: EASE_ZW } },
};

// Main-thread transforms (the original's framer build runs every transform animation — `y`, `scaleX`… — on its JS frame
// loop, one inline write per frame; framer-motion 14 groups transform tracks into compositor animations):
//   - explicit keyframes (ProjectTitle, TextReveal, Section separator): `isSync: true` → a plain JSAnimation. Until
//     2026-11-12 ProjectTitle and TextReveal used `animate(sequence)` with framer's `mix` as the segment mixer
//     (`MAIN_THREAD_MIXER`, removed): same engine, but framer 14's sequence Timeline and transform groups made the
//     title's passive-effect task about twice the original's in profiled traces (acceptance item A1, docs/evidence/verify/acceptance/a1a2/);
//   - variants that animate from the current value: mainThreadTransforms below.

/**
 * framer's default transition for a transform value that has none (motion-dom `getDefaultTransition` →
 * `underDampedSpring`); the original's framer build uses the same values (docs/recon/design-system.md §9).
 */
const TRANSFORM_DEFAULT_SPRING = { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 } as const;
const keepOnMainThread = () => {};
/**
 * Main-thread engine for VARIANT transforms that animate from the current value (2026-11-12, acceptance item A2,
 * docs/evidence/verify/acceptance/a1a2/). Neither `isSync` (needs explicit keyframes) nor a mixer (ignored for numeric
 * keyframes) applies there. A value transition with `onUpdate` makes framer 14 keep the element's transform group on
 * its JS frame loop (`canAccelerateTransform` → `hasOnUpdate`), as the original's framer build runs every transform:
 * one inline write per frame. Values, timing and easing are unchanged: `transition` is copied into the transform's own
 * entry; without one, `default: {}` leaves framer's defaults to the other values (opacity keeps its 0.3 s tween) and the
 * transform gets framer's default spring written out. `transition` must not contain `onUpdate`, an entry for one of
 * `keys` or `default` (they would be overridden or ignored for the transform), so those are rejected.
 * Known framer 14 difference that remains (not changed by this): its keyframes resolve synchronously when the value
 * exists, so the start is the creation time with no 40 ms rule; the original's resolve in the next frame and start
 * there when that frame comes more than 40 ms later.
 */
export function mainThreadTransforms(keys: readonly string[], transition?: Transition): Transition {
  const flat = transition as (Record<string, unknown> & { onUpdate?: unknown }) | undefined;
  if (flat && (flat.onUpdate || keys.some((k) => k in flat) || 'default' in flat))
    throw new Error('mainThreadTransforms: the transition must not contain onUpdate, an entry for one of the keys, or default');
  const own = { ...(transition ?? TRANSFORM_DEFAULT_SPRING), onUpdate: keepOnMainThread };
  return { ...(transition ?? { default: {} }), ...Object.fromEntries(keys.map((k) => [k, own])) } as Transition;
}
