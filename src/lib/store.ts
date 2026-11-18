// Global client store (the original uses one zustand store, module 5572). Implemented with
// useSyncExternalStore: `appStore.get/set/subscribe`, `useAppStore(selector)`.
import { useRef, useSyncExternalStore } from 'react';
import { INITIAL_THEME, type TransitionVariant } from './theme';
import type { Theme } from './types';

export type WorkgridState = 'loading' | 'intro' | 'work';
export type HomeView = 'grid' | 'list';

export interface TransitionIntent {
  href: string;
  origin?: 'nav';
}
export interface PageTransition {
  from: string;
  to: string;
  enterVariant: TransitionVariant;
  exitVariant: TransitionVariant;
}
/** Active work-grid filters. The original keeps arrays but its URL parser only ever stores the first value. */
export interface WorkGridFilters {
  zone?: string;
  feature?: string;
  service?: string;
  client?: string;
}
/** Client logo shown beside the site's logo on project pages (first item of the original store `logos[]`, which holds
 *  up to two; see headerLogos). */
export interface HeaderLogo {
  id: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string | null;
}

export interface AppState {
  // --- workgrid / intro (module 17488)
  /** 'intro' at load (original); 'work' after the intro, immediately on non-home routes or after any navigation. 'loading' is reserved for the grid engine. */
  workgridState: WorkgridState;
  /** pathname === '/' (grid keeps rendering every frame) */
  isWorkGridRender: boolean;
  workGridFilters: WorkGridFilters;
  /** original `caseStudyView` */
  homeView: HomeView;
  graphicsTier: 0 | 1;

  // --- transitions (module 20859)
  transitionIntent: TransitionIntent | null;
  transition: PageTransition | null;
  isTransitioning: boolean;

  // --- theme / chrome (module 5572 second slice)
  theme: Theme;
  headerLogo: HeaderLogo | null;
  /** original store `logos[]` (23 projects publish two); first item === headerLogo, cleared together with it */
  headerLogos: HeaderLogo[];
  showContactCta: boolean;
  isConsent: boolean;
  showCookieBanner: boolean;
  aboutIntersectingSection: string;


  // --- contact (module 5572 other slices)
  /** "LAST UPDATED" label of copy sections (the former job pages set it); never set now, kept for the readers */
  lastUpdated: string | null;
  contactFlowStep: number;
  contactFormComplexity: number;
  name: string;

  // --- about team UI
  currentDepartmentId: string | null;
  currentEmployee: unknown;
  teamGroups: unknown;
  currentTeams: unknown;
  isFaceTransitioning: boolean;
}

export const initialAppState: AppState = {
  workgridState: 'intro',
  isWorkGridRender: true,
  workGridFilters: {},
  homeView: 'grid',
  graphicsTier: 0,
  transitionIntent: null,
  transition: null,
  isTransitioning: false,
  theme: INITIAL_THEME,
  headerLogo: null,
  headerLogos: [],
  showContactCta: true,
  isConsent: false,
  showCookieBanner: false,
  aboutIntersectingSection: '',
  lastUpdated: null,
  contactFlowStep: 1,
  contactFormComplexity: 0,
  name: '',
  currentDepartmentId: null,
  currentEmployee: null,
  teamGroups: null,
  currentTeams: null,
  isFaceTransitioning: false,
};

type Listener = () => void;
let state: AppState = initialAppState;
const listeners = new Set<Listener>();

export const appStore = {
  get(): AppState {
    return state;
  },
  /**
   * Shallow-merge a partial state (or an updater) and notify every listener, as zustand's `setState` (original module
   * 41535 / 35867): any partial object, even one that changes no value, gives a new state object and notifies. Only an
   * updater that returns the current state object itself is ignored. Whole-store readers (`useAppStore()`) re-render on
   * every call; selector readers still bail out when their selected value is equal (useAppStore's getSnapshot cache).
   */
  set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
    const p = typeof patch === 'function' ? patch(state) : patch;
    if (Object.is(p, state)) return;
    state = { ...state, ...p };
    for (const l of listeners) l();
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** test helper */
  reset() {
    state = initialAppState;
    for (const l of listeners) l();
  },
};

/**
 * Subscribe to a slice of the store.
 * @example const isTransitioning = useAppStore((s) => s.isTransitioning);
 * @example const { theme, transition } = useAppStore((s) => ({ theme: s.theme, transition: s.transition }), shallowEqual);
 */
export function useAppStore<T = AppState>(
  selector: (s: AppState) => T = (s) => s as unknown as T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const cache = useRef<{ s: AppState; v: T } | null>(null);
  const serverCache = useRef<{ v: T } | null>(null);
  const getSnapshot = () => {
    const s = appStore.get();
    const c = cache.current;
    if (c && c.s === s) return c.v;
    const v = selector(s);
    if (c && isEqual(c.v, v)) {
      c.s = s;
      return c.v;
    }
    cache.current = { s, v };
    return v;
  };
  const getServerSnapshot = () => {
    if (!serverCache.current) serverCache.current = { v: selector(initialAppState) };
    return serverCache.current.v;
  };
  return useSyncExternalStore(appStore.subscribe, getSnapshot, getServerSnapshot);
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  return true;
}

// ------------------------------------------------------------------ actions (named like the original setters)

/** Module 17488: only writes when the JSON differs. */
export function setWorkGridFilters(filters: WorkGridFilters) {
  if (JSON.stringify(appStore.get().workGridFilters) !== JSON.stringify(filters)) appStore.set({ workGridFilters: filters });
}

/** Module 87417: keep only the first value of each param. */
export function filtersFromSearchParams(sp: URLSearchParams): WorkGridFilters {
  const out: WorkGridFilters = {};
  for (const k of ['zone', 'client', 'feature', 'service'] as const) {
    const v = sp.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export const setWorkgridState = (workgridState: WorkgridState) => appStore.set({ workgridState });
export const setTransitionIntent = (transitionIntent: TransitionIntent | null) => appStore.set({ transitionIntent });
export const setHeaderLogo = (headerLogo: HeaderLogo | null) => appStore.set({ headerLogo });
export const setShowContactCta = (showContactCta: boolean) => appStore.set({ showContactCta });
export const setHomeView = (homeView: HomeView) => appStore.set({ homeView });
