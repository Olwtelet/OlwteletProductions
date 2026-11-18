'use client';
// Commit timing of the original's per-route CSS (foundation.md §11, MEASURED docs/evidence/foundation/wave-d/).
//
// The original is a webpack build of Next 16.2.1: every route segment ships its own CSS chunks as React
// `<link rel="stylesheet" precedence>` resources. When a client navigation needs a chunk that is not in the document yet,
// React suspends the commit until that stylesheet loads and then commits from the `<link>` load event — outside the
// Scheduler's MessageChannel loop. commitRoot schedules the passive-effects callback at its very start, so the Scheduler
// posts its message immediately, ahead of any vsync that arrives during the commit: the passive phase (the old page's
// useEffect cleanups — useSplit's ResizeObserver.disconnect() — and the new page's mount effects) runs before the next
// rendering step. A removed split target's ResizeObserver therefore never fires, and SplitType never restores the
// clamped offset over the router's smooth scroll (case study → nav About lands at 144, not at the bottom).
// Navigations that need no new chunk (about ↔ about, project → project) commit inside a Scheduler task
// on both sites; their passive message is only posted when that task ends, so a frame can run first and the removed
// targets' callbacks fire (the offsets kept by the about toggles depend on that).
//
// This build (Turbopack) puts all CSS in two global chunks loaded on every page, so every navigation commits inside a
// Scheduler task. On the navigations where the original would have loaded a new route stylesheet, this component
// schedules a sync update from a layout effect of the navigation commit: React then flushes that commit's passive
// effects at the end of the commit task, before the browser can render — the original's order. Nothing is rendered.
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';

/**
 * React-managed CSS chunks of the original's routes (SSR `<link rel="stylesheet">` of each route, MEASURED 2026-11-07),
 * without the five chunks every route has and without e96fd3a1 / baf2942a / 52ff…, which its lazy chunks load on every
 * page within seconds of a hard load (present before every measured click). Names stand for the original's files:
 * shared = abb1dc4e, content = 357c2c56, project = 476a00d4, home = 02b0644b, apply = 94429422, contact = 821e7068.
 */
export function originalRouteCss(pathname: string): readonly string[] {
  if (pathname === '/' || pathname === '/index') return ['home'];
  if (pathname === '/contact') return ['contact'];
  if (/^\/projects\/[^/]+\/?$/.test(pathname)) return ['shared', 'project'];
  // /about/*, legal and other [uid] pages
  return ['shared', 'content'];
}

export function RouteCssCommit() {
  const pathname = usePathname() || '/';
  const loaded = useRef<Set<string> | null>(null);
  const [, flushPassive] = useState(0);

  useLayoutEffect(() => {
    const need = originalRouteCss(pathname);
    if (!loaded.current) {
      // hard load: the route's own chunks are in the SSR document
      loaded.current = new Set(need);
      return;
    }
    let suspendedOnStylesheet = false;
    for (const chunk of need)
      if (!loaded.current.has(chunk)) {
        loaded.current.add(chunk);
        suspendedOnStylesheet = true;
      }
    // A setState in a layout effect is a SyncLane update: performSyncWorkOnRoot first flushes the pending passive effects
    // of this (transition) commit, synchronously, at the end of the commit task.
    if (suspendedOnStylesheet) flushPassive((n) => n + 1);
  }, [pathname]);

  return null;
}

export default RouteCssCommit;
