// Small runtime helpers shared by the grid engine (all FROM-CODE, module references in comments).
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

/**
 * Original `D.yn = CustomEase.create("custom", ".23,1,.32,1")` (module 29652). Registered under a private id so a
 * "custom" ease created by another area cannot collide with it (only the returned function is used, as the original).
 */
export const EASE_YN = CustomEase.create('grid-engine-yn', '.23,1,.32,1');

/** Original `E.Fr()` (module 66754): mobile user-agent test. */
export function isMobileUA(): boolean {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false;
  return /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** Original `U.qE` (module 7755): clamp. */
export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Camera rest distance (`V = 3.43`, module 55607). */
export const CAMERA_Z = 3.43;

/**
 * Olwtelet: grid offset at rest. The 11×11 spiral puts slot 0 (the published project, src/content/brand.ts) one half
 * tile below-left of the screen centre, which on a phone leaves that tile half outside the screen. Resting at
 * (+0.5, +0.5) centres slot 0; the in-development entry (slot 2) sits on the next diagonal. Used for the initial view
 * and for Carousel.center() (return to the home).
 */
export const HOME_FOCUS = { x: 0.5, y: 0.5 } as const;

/** Test-only debug hook: set `window.__WG_DEBUG__ = true` (Playwright addInitScript) to expose engine internals. */
export function debugEnabled(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __WG_DEBUG__?: boolean }).__WG_DEBUG__ === true;
}
