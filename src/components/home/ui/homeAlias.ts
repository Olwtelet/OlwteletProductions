'use client';
// Emulation of the original's "home URL aliasing" (home-interaction.md §9; Next 16.2.1 client router behaviour on
// the original, absent from the local Next 16.4.5 dev router). MEASURED on the original (scripts/home-ui/probe-alias.mjs,
// docs/evidence/home-ui/probe-alias-original.json + logo-nav-trace-1440.json):
//   S1 hard load /?zone=product → Filter → "All" (push "/")                         → lands on /?zone=product
//   S3 hard load /?zone=product → project → (40 s) → logo (transition push "/")     → lands on /?zone=product
//   S4 hard load /?zone=product → toggle Product off (push "/?")                     → stays   /?zone=product
//      … → AI (push /?zone=product&feature=ai) → "All"                              → lands on /
//   S2 hard load / → Product → project → logo                                       → lands on /
//   S5 hard load /projects/x → logo → Product → project → logo                      → lands on /
// Rule reproduced (INFERRED from these 5 cases): a client navigation to "/" with an EMPTY query lands on the query of
// the session's hard-load URL when that hard load was on "/" with a query; the alias is dropped as soon as the home
// shows a different non-empty query (a filter push / back / forward to another query). Expiry of the original's
// router-cache entry (if any) is unknown: ≥ 40 s measured, treated as session-long here.
let alias: string | undefined;

// Olwtelet Productions: the alias is disabled (always ''), so "Todos" and "Ver todos os projetos" always clear the
// filters, including after a hard load of a filtered URL. The functions keep their signatures for the callers.
const ALIAS_ENABLED = false;

function init() {
  if (alias !== undefined || typeof window === 'undefined') return;
  if (!ALIAS_ENABLED) {
    alias = '';
    return;
  }
  let first: URL;
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    first = new URL(nav?.name || location.href);
  } catch {
    first = new URL(location.href);
  }
  alias = first.pathname === '/' && first.search.length > 1 ? first.search : '';
}

/** '?zone=…' or '' */
export function getHomeAlias(): string {
  init();
  return alias || '';
}

/** Call with the home's current `?query` ('' when none) every time it changes. */
export function noteHomeSearch(search: string) {
  init();
  if (search && search !== alias) alias = '';
}

/** Where a navigation to "/" + `search` lands (search '' or '?' → alias). */
export function resolveHomeHref(pathname: string, search: string): string {
  const s = search === '?' ? '' : search;
  if (s) return pathname + s;
  const a = getHomeAlias();
  return a ? pathname + a : pathname + search;
}
