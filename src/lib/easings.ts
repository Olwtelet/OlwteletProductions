// Every named easing of the original (docs/recon/design-system.md §6.4). Arrays are cubic-bezier control points
// usable as framer-motion `ease`; *_CSS strings are ready for CSS transitions.

export type Bezier = [number, number, number, number];

/** module 29652 `ZW` — q1 variant (y 0→-100, 0.5 s, delay 0.3), list-view rows */
export const EASE_ZW: Bezier = [0, 0.81, 0.22, 1];
/** module 29652 `o7` */
export const EASE_O7: Bezier = [0.23, 1, 0.85, 0.95];
/** module 29652 `UO` — chrome fade-in (0.3 s, delay 0.4) */
export const EASE_UO: Bezier = [0.5, 1, 0.89, 1];
/** module 29652 `xQ` — client logo slide, cross pathLength, TextReveal, FadeIn, filter panel */
export const EASE_XQ: Bezier = [0.93, 0, 0.03, 1];
/** module 29652 `Iz` */
export const EASE_IZ: Bezier = [0.53, 0.02, 0, 1];
/** module 29652 `yn` = gsap CustomEase.create("custom", ".23,1,.32,1") */
export const EASE_YN: Bezier = [0.23, 1, 0.32, 1];
export const EASE_YN_GSAP = '.23,1,.32,1';
/** TransitionElement `u` — fill enter (0.5 s) */
export const EASE_TRANSITION: Bezier = [0.21, 0.76, 0.21, 1];
/** framer default `easeOut` used whenever only `duration` is given (theme lerp 1 s, underlay, exits) */
export const EASE_OUT: Bezier = [0, 0, 0.58, 1];
/** framer default keyframes ease for non-transform values with no transition (view-toggle mount fade, 0.3 s) */
export const EASE_FRAMER_DEFAULT: Bezier = [0.25, 0.1, 0.35, 1];
/** `vV` variant — loader/intro title move (0.8 s, delay 0.6) */
export const EASE_VV: Bezier = [0.64, 0.01, 0.01, 1];

/** framer default spring for transform values */
export const SPRING_DEFAULT = { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 } as const;
/** framer default for scale* values (motion-dom `criticallyDampedSpring`): damping 30, or 2·√550 when the target is 0 */
export const SPRING_SCALE = { type: 'spring', stiffness: 550, damping: 30, restSpeed: 10 } as const;
export const SPRING_SCALE_TO_ZERO = { type: 'spring', stiffness: 550, damping: 2 * Math.sqrt(550), restSpeed: 10 } as const;

/** CSS easings */
export const CSS_EASE_UP = 'cubic-bezier(.16,1,.3,1)'; // nav/header/filter ease-up/down keyframes (0.7–1 s)
export const CSS_EASE_INDICATOR = 'cubic-bezier(.93,-.24,.4,1.17)'; // nav indicator + toggle highlight translate 0.7 s
export const CSS_EASE_LOADER = 'cubic-bezier(1,.01,.22,1)'; // loader progress bar 0.6 s, loader h2 0.5 s
export const CSS_EASE_LOADER_EXIT = 'cubic-bezier(.81,-.01,0,1)'; // loader text exit 1 s, delay .2
export const CSS_EASE_LIST_HOVER = 'cubic-bezier(0,.5,.22,1)'; // list-view row hover fill 0.28 s
export const CSS_EASE_TRAIL_IN = 'cubic-bezier(0,.462,.362,1)'; // careers cursor image trail
export const CSS_EASE_TRAIL_OUT = 'cubic-bezier(.373,0,.34,1)';

/** gsap names used by the audio engine */
export const GSAP_SINE_OUT = 'sine.out';
export const GSAP_SINE_IN = 'sine.in';

/** Lenis easing: 1 − (1 − t)^4, duration 0.7 s */
export const lenisEasing = (t: number) => 1 - Math.pow(1 - t, 4);

/** Evaluate a cubic-bezier easing at progress x (0..1). Same algorithm family as framer/CSS (Newton + bisection). */
export function cubicBezier([x1, y1, x2, y2]: Bezier): (x: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-7) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (hi - lo > 1e-7) {
      const v = sx(t);
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}
