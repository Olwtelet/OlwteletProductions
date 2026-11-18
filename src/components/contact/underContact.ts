// The page under the contact modal: its path and scroll position, kept in the /contact history entry's own state (Next
// keeps custom keys of an entry on Back / Forward: traverse navigations preserve custom history state, app-router
// HistoryUpdater). Written when the modal opens over a page (ContactModal), read when that entry comes back through
// history (privacy link → Back), so each /contact entry puts back its own page's position.
// A module of its own, so the About pages' Delay can read it without loading the modal.
import { ROUTES } from '@/lib/theme';

export const UNDER_KEY = 'olwContactUnder';
export type Under = { path: string; y: number };

export function readUnder(): Under | null {
  const u = (window.history.state as Record<string, unknown> | null)?.[UNDER_KEY] as Under | undefined;
  return u && typeof u.y === 'number' && typeof u.path === 'string' ? u : null;
}

export function writeUnder(u: Under) {
  // the router's own keys (__NA, tree) are kept; no URL: nothing changes for the router
  window.history.replaceState({ ...(window.history.state ?? {}), [UNDER_KEY]: u }, '');
}

/** The URL is already /contact and that entry holds a position: a page rendering now is the page under the contact
 *  modal that a history traversal brought back (privacy link → Back). With `path`, that entry must also have been
 *  opened over that page (a page already mounted under its own URL, checked at a popstate). Never true on the server
 *  or on a hard load (a /contact document renders the contact page itself, not the page underneath). */
export function isRestoringUnderContact(path?: string | null): boolean {
  if (typeof window === 'undefined' || window.location.pathname !== ROUTES.contact) return false;
  const u = readUnder();
  return u !== null && (path == null || u.path === path);
}
