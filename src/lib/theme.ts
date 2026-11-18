// Route constants + per-route theme resolution (FROM-CODE modules 72175, 96383, 90322, 84866, 25655, 96026).
import type { PageThemes, Theme } from './types';

/** Module 72175 `oI` */
export const ROUTES = {
  home: '/',
  contact: '/contact',
  projects: '/projects',
  about: '/about',
} as const;

/** Module 72175 `VI` (order matters for `toTemplate`) */
export const ROUTE_TEMPLATES = {
  page: '/[uid]',
  project: '/projects/[uid]',
  aboutSection: '/about/[uid]',
} as const;

/** Module 72175 `EF` */
export const API_ROUTES = { contact: '/api/contact' } as const;

/** Module 90322 `dA`: initial store theme and default transition-fill colour (#DFDFDF). */
export const INITIAL_THEME: Theme = { primaryColor: '#000000', secondaryColor: '#DFDFDF' };
/** Module 90322 `n0`: fallback when no pageThemes key matches. */
export const FALLBACK_THEME: Theme = { primaryColor: '#FFFFFF', secondaryColor: '#202020' };
/** Fill colour used when the target has no exact pageThemes key (= dA.secondaryColor). */
export const DEFAULT_FILL = INITIAL_THEME.secondaryColor;

/** Module 96383 `aM`: drop the query string. */
export function stripSearch(href: string): string {
  return href.split('?')[0];
}

/**
 * Module 96383 `Be`: map a concrete path to its route template.
 * Returns the path itself if it is one of ROUTES, else the first template with the same segment count whose
 * non-`[uid]` segments match, else null.
 */
export function toTemplate(href: string): string | null {
  const t = href.includes('?') ? stripSearch(href) : href;
  if ((Object.values(ROUTES) as string[]).includes(t)) return t;
  const parts = t.split('/');
  for (const tpl of Object.values(ROUTE_TEMPLATES).filter((e) => e.split('/').length === parts.length)) {
    const tp = tpl.split('/');
    for (let i = 0; i < tp.length; i++) {
      if (tp[i] !== '[uid]' && tp[i] !== parts[i]) break;
      else if (i === tp.length - 1) return tpl;
    }
  }
  return null;
}

/** Module 96383 `Z5` */
export function fillTemplate(template: string, uid: string): string {
  return template.replace('[uid]', uid);
}

/**
 * Module 84866 theme lookup: `pageThemes[path] || pageThemes[toTemplate(path)] || n0`.
 * Pass `transition ? transition.to : pathname` to reproduce the "theme changes on click" behaviour.
 */
export function resolveTheme(path: string, pageThemes: PageThemes): Theme {
  if (pageThemes[path]) return pageThemes[path];
  const tpl = toTemplate(path);
  return tpl && pageThemes[tpl] ? pageThemes[tpl] : FALLBACK_THEME;
}

/** Module 25655 transition fill: `pageThemes[to]?.secondaryColor` with an EXACT key only, else #DFDFDF. */
export function fillColorFor(href: string, pageThemes: PageThemes): string {
  return href && pageThemes[href] ? pageThemes[href].secondaryColor : DEFAULT_FILL;
}

/** Module 20859 transition variant names */
export const TRANSITION_VARIANT = {
  NONE: 'none',
  ADD_LAYER_ENTER: 'add-layer-enter',
  ADD_LAYER_EXIT: 'add-layer-exit',
  FADE_LAYER_ENTER: 'fade-layer-enter',
  FADE_LAYER_EXIT: 'fade-layer-exit',
  SNAP: 'snap',
} as const;
export type TransitionVariant = (typeof TRANSITION_VARIANT)[keyof typeof TRANSITION_VARIANT];

/** Module 84866: FADE pair when the target path is exactly "/", ADD pair otherwise (NONE/SNAP never chosen). */
export function transitionVariantsFor(href: string): { enterVariant: TransitionVariant; exitVariant: TransitionVariant } {
  return stripSearch(href) === ROUTES.home
    ? { enterVariant: TRANSITION_VARIANT.FADE_LAYER_ENTER, exitVariant: TRANSITION_VARIANT.FADE_LAYER_EXIT }
    : { enterVariant: TRANSITION_VARIANT.ADD_LAYER_ENTER, exitVariant: TRANSITION_VARIANT.ADD_LAYER_EXIT };
}

/** Nav indicator index (module 96026): 0 for "/" and /projects/*, 1 for /about/*, 2 for /contact, else null. */
export function navIndexFor(path: string): 0 | 1 | 2 | null {
  if (path === ROUTES.home || path.includes(ROUTES.projects)) return 0;
  if (path.includes(ROUTES.about)) return 1;
  if (path === ROUTES.contact) return 2;
  return null;
}
