'use client';
// Head of the page underneath the intercepted contact modal.
//
// Original (Next 16.2.1, mirror pretty/chunks__3794 module 10425 `findHeadInCache`): the router renders the head of
// the first leaf found in the `children` slot. While /contact is intercepted, `children` still holds the page the
// modal was opened from, so the document keeps THAT page's whole head (title, description, canonical, og:*,
// twitter:*) — MEASURED over /, /careers, /careers/<job>, /about/agency, project pages, through X / Esc / Back — and
// the intercepted route's own head (the static `/_head` segment: charset, viewport, favicon) is never rendered.
// Next 16.4.5 renders the navigated route's own head instead (`root.head`), which would drop the page's title and
// metas. The intercepted segment stays static (no headers(), same prefetch segments as the original) and this
// component re-renders the underlying page's metadata elements as React 19 hoistables, in the same commit that
// removes them, so document.title never changes on any frame.
//
// Snapshot: on a push navigation (Let's talk) the first render happens before the commit, while document.head is
// still the page's head and location is still the page's URL. On a history navigation back to the intercepted
// entry (popstate: location is already /contact) the last snapshot taken on an open is reused.
// While the URL is not /contact nothing is rendered, so the head is the new page's own. (Olwtelet: the in-modal Privacy
// Policy link now closes the modal — the @contact slot has a null page on every other route — so this only covers the
// frames before that unmount.)
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type HeadItem = { tag: 'title'; text: string } | { tag: 'meta' | 'link'; props: Record<string, string> };

/** DOM attribute → React prop for the attributes the metadata elements carry. */
const PROPS: Record<string, string> = {
  name: 'name',
  property: 'property',
  content: 'content',
  'http-equiv': 'httpEquiv',
  rel: 'rel',
  href: 'href',
  hreflang: 'hrefLang',
  media: 'media',
  type: 'type',
  title: 'title',
};

/** Last snapshot taken on an open (module scope: survives a remount on a history navigation). */
let lastSnapshot: HeadItem[] | null = null;

function readHead(): HeadItem[] {
  const items: HeadItem[] = [];
  for (const el of Array.from(document.head.children)) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'title') {
      items.push({ tag, text: el.textContent ?? '' });
      continue;
    }
    // charset, viewport and the favicon are part of the intercepted route's own head too (kept by Next): not copied
    const keep =
      (tag === 'meta' && (el.hasAttribute('property') || (el.hasAttribute('name') && el.getAttribute('name') !== 'viewport'))) ||
      (tag === 'link' && /^(canonical|alternate)$/i.test(el.getAttribute('rel') || ''));
    if (!keep) continue;
    const props: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) if (PROPS[a.name]) props[PROPS[a.name]] = a.value;
    items.push({ tag: tag as 'meta' | 'link', props });
  }
  return items;
}

function initialItems(): HeadItem[] {
  if (typeof document === 'undefined') return [];
  if (window.location.pathname !== '/contact' || lastSnapshot === null) lastSnapshot = readHead();
  return lastSnapshot;
}

export function UnderlyingHead() {
  const pathname = usePathname();
  const [items] = useState(initialItems);
  if (pathname !== '/contact') return null;
  return (
    <>
      {items.map((it, i) =>
        it.tag === 'title' ? <title key={i}>{it.text}</title> : it.tag === 'meta' ? <meta key={i} {...it.props} /> : <link key={i} {...it.props} />,
      )}
    </>
  );
}

export default UnderlyingHead;
