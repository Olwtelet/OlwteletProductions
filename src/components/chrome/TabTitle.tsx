'use client';
// The tab title that stays mounted through client navigations.
// - Every route's metadata already sends <title>TAB_TITLE</title> in its server head (src/lib/seo.ts). This element only
//   covers the moment when, on a client navigation, Next swaps one route's metadata <title> for the next: the old one
//   is removed a frame before the new one arrives (MEASURED 2026-11-19: project → privacy policy, Back across a
//   reload, 10-40 ms with no <title> and the tab showing the URL).
// - It renders only after hydration, so the server HTML keeps its single metadata <title>.
// - It is NOT hoisted to <head>: `itemProp` makes React render it in place, at the start of <body>. A hoisted one breaks
//   the hydration of the metadata <title>. React acquires a hoisted <title> by taking the document's FIRST <title>; when
//   that one already belongs to another component, it inserts a new, empty <title> and fills it afterwards. Next
//   hydrates the metadata a little after the layout, so a hoisted title here (or a server-rendered one in the layout)
//   always came first. MEASURED 2026-11-19: an empty <title> on every hard load, the browser's own tab title falling
//   back to the URL for 0-2 ms, a third <title> left orphaned. In <body> it never comes first while <head> has a title
//   (document.title is the first <title> in tree order), so the metadata title hydrates as is. It counts only in the
//   gap, when <head> has none. (node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js,
//   `case "title"` in the hoistable commit, and isHostHoistableType.)
// - It never changes document.title: its text is the same TAB_TITLE already shown. `itemProp` here only opts out of
//   hoisting; with no itemScope around it, microdata readers ignore it.
// Next's docs recommend the Metadata API over a manual <title> in the root layout
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md); the metadata title stays the one
// in the server HTML, and this adds only the continuity the metadata swap lacks.
import { useSyncExternalStore } from 'react';
import { TAB_TITLE } from '@/content/brand';

const subscribe = () => () => {};

export function TabTitle() {
  // false on the server and while hydrating; true from the client render that follows hydration
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated ? <title itemProp="name">{TAB_TITLE}</title> : null;
}

export default TabTitle;
