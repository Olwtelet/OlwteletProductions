'use client';
// Contact modal — original client module 78349 (chunk 665). Used by BOTH /contact routes:
//   app/@contact/(.)contact/page  (soft navigation: parallel-slot interception, the current page stays rendered)
//   app/contact/page              (hard load / reload)
// Markup: dialog.ModalDialog[data-lenis-prevent] > button.CloseButton[aria-label="Fechar contato"] > svg, children.
//
// Olwtelet: one lifecycle for every way out (the replica's close only navigated with router.back() and never closed
// the native dialog; after the privacy link the dialog stayed open, and its X then left an invisible layer at /contact
// blocking clicks; Esc closed the dialog but left the URL at /contact and the page locked):
//   open      showModal() once per mount (fresh state: no leftover opacity or closing flag); the page underneath is
//             locked (html overflow hidden) and keeps its scroll position, saved in the /contact history entry and put
//             back when that entry returns (privacy link → Back); the opener is remembered for focus.
//   close     requestClose(): X, Esc, "Concluir", or a native close (close watcher). Runs once per open (repeated X or
//             Esc are ignored; the spot under X ignores clicks for a moment, so a double click cannot reopen the
//             contact through the header link beneath), fades the dialog, closes it natively (top layer, ::backdrop and
//             page inertness go with it), releases the lock, gives focus back to the opener, and only then navigates,
//             exactly once:
//               opened over a page (intercepted)  → router.back(): back to that page, same scroll position;
//               opened directly (/contact load)   → router.replace('/'): a predictable page of the site.
//   unmount   Back / Forward, or a link inside the modal (the @contact slot has a null page on every other route):
//             the same teardown, synchronously, before React removes the dialog.
// Lenis: SmoothScroll destroys it on /contact and builds a new one on the page closed back to; the modal no longer
// stops/starts the stale instance (that put "lenis-stopped" back on <html> and left it there).
import { animate, time } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { ROUTES } from '@/lib/theme';
import { CloseIcon } from './icons';
import { ContactCloseContext, ContactOpenContext, createOpenApi, type CloseReason } from './openContext';
import { readUnder, writeUnder, type Under } from './underContact';
import styles from './contactModal.module.css';

let stopHold: (() => void) | null = null;
/** the position the running hold is putting back */
let holdTarget: Under | null = null;

/** Privacy link → Back reopens the modal over a page that is rendered again: put it back where it was and keep it there
 *  for at least 1.5 s. The About pages render their slices at once in that case (Delay, immediateUnderContact), so the
 *  page is tall enough on its first frame; before, their 500 ms delay kept Estúdio 1068 px tall (1440 × 900), the
 *  position clamped at 168 and a close in that half second showed the page near the top, then jumping to its place.
 *  A single scrollTo is not enough: on the remounted page SplitType puts back the position it read when it split, with
 *  window.scrollTo — MEASURED on Back: (0, 0) five times in the first 12–31 ms, before this hold, then (0, 1200).
 *  The hold ends after 1.5 s and at least HOLD_FRAMES drawn frames: when the browser draws no frame for a while (a long
 *  task, a busy GPU), a deadline in time alone can pass before any frame put the position back. MEASURED on the
 *  previous build: in one run no frame was drawn from before 0.7 s to 2.0 s after Back (across the 1.5 s deadline), in
 *  another for 14.4 s after Back; the hold ended on the first frame after its deadline and the page stayed at
 *  272 / 212 px.
 *  The hold outlives the modal (a close within that window must not drop it), and stops when the URL is neither
 *  /contact nor that page, or at the visitor's first input on the page itself (no dialog open): wheel, touch, a press
 *  or any key (Tab included: its focus scroll must not be undone). */
const HOLD_FRAMES = 45;
function holdUnder(u: Under) {
  stopHold?.();
  const until = performance.now() + 1500;
  let frames = 0;
  let raf = 0;
  const INPUT = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
  const onInput = () => {
    if (document.querySelector('dialog[open]')) return; // the modal's own scrolling, keys and clicks
    stop();
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    for (const t of INPUT) window.removeEventListener(t, onInput, true);
    if (stopHold === stop) {
      stopHold = null;
      holdTarget = null;
    }
  };
  const tick = () => {
    const p = window.location.pathname;
    if ((performance.now() > until && frames >= HOLD_FRAMES) || (p !== ROUTES.contact && p !== u.path)) return stop();
    if (Math.abs(window.scrollY - u.y) > 1) window.scrollTo({ top: u.y, behavior: 'instant' });
    frames++;
    raf = requestAnimationFrame(tick);
  };
  for (const t of INPUT) window.addEventListener(t, onInput, { capture: true, passive: true });
  stopHold = stop;
  holdTarget = u;
  tick();
}

/** Closing goes back one entry, to the page itself. The visitor already sees that page under the modal; the browser
 *  restores the page entry's own saved position instead, smoothly (html scroll-behavior: smooth). They differ after
 *  Back → scroll → Forward to /contact, and the page slid ~2400 px by itself after the close. (history.scrollRestoration
 *  cannot help: it belongs to the /contact entry, and the page entry's own "auto" is the one used.) The page is held
 *  where it is seen, or at the position a running hold is putting back, through the traversal. */
function keepPlaceOnBack(path: string) {
  holdUnder({ path, y: holdTarget?.y ?? Math.round(window.scrollY) });
}

/** Once the dialog is closed, what lies under X receives the clicks (the header's "Vamos conversar" sits there at every
 *  width): the second click of a double click on X reopened the contact and pushed a second /contact. Clicks on that
 *  spot are swallowed for a moment after X. */
function shieldSpot(el: HTMLElement | null) {
  const r = el?.getBoundingClientRect();
  if (!r) return;
  const until = performance.now() + 700;
  const TYPES = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const;
  const onEvent = (e: Event) => {
    if (performance.now() > until) return off();
    const { clientX: x, clientY: y } = e as MouseEvent;
    if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  const off = () => {
    for (const t of TYPES) window.removeEventListener(t, onEvent, true);
  };
  for (const t of TYPES) window.addEventListener(t, onEvent, true);
  window.setTimeout(off, 750);
}

/** after a close, focus an opener that was unmounted while the modal was open (the nav "Contato" pill is not rendered on
 *  /contact): wait for the page to come back, then focus the equivalent link, unless focus already moved elsewhere */
function refocusWhenBack(selector: string) {
  const until = performance.now() + 2000;
  const tick = () => {
    if (document.activeElement && document.activeElement !== document.body) return;
    const el = window.location.pathname !== ROUTES.contact ? document.querySelector<HTMLElement>(selector) : null;
    if (el) el.focus({ preventScroll: true });
    else if (performance.now() < until) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function ContactModal({ children, intercepted = false }: { children: ReactNode; intercepted?: boolean }) {
  const sound = useOptionalSound();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const alive = useRef(true);
  const leavingByLink = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const openerSelector = useRef<string | null>(null);
  const savedOverflow = useRef<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // first render of a push navigation runs before the commit, while the URL is still the page underneath's: its path
  // and scroll position are the ones to keep (on a Back / Forward to /contact the URL is already /contact)
  const [openedOver] = useState<Under | null>(() =>
    typeof window !== 'undefined' && window.location.pathname !== ROUTES.contact ? { path: window.location.pathname, y: window.scrollY } : null,
  );

  // idempotent, synchronous: native close, scroll lock released, focus back to the opener
  const teardown = useCallback((restoreFocus: boolean) => {
    const el = ref.current;
    if (el?.open && restoreFocus) el.close();
    if (savedOverflow.current !== null) {
      document.documentElement.style.overflow = savedOverflow.current;
      savedOverflow.current = null;
    }
    const o = opener.current;
    opener.current = null;
    if (!restoreFocus) return;
    const a = document.activeElement;
    if (o?.isConnected && (a === document.body || a === null || (el && el.contains(a)))) o.focus({ preventScroll: true });
    else if (openerSelector.current) refocusWhenBack(openerSelector.current);
  }, []);

  const requestClose = useCallback(
    async (reason: CloseReason = 'button') => {
      const el = ref.current;
      if (!el || closing.current) return;
      closing.current = true;
      el.inert = true; // nothing inside reacts during the fade
      if (reason === 'button') shieldSpot(closeButton.current);
      if (reason === 'button' || reason === 'escape') void sound?.playClip('click');
      if (el.open) await animate(el, { opacity: 0 });
      if (!alive.current) return; // Back during the fade already unmounted the modal: no second navigation
      teardown(true);
      if (intercepted) {
        const path = readUnder()?.path ?? openedOver?.path;
        if (path) keepPlaceOnBack(path);
        router.back();
      } else router.replace(ROUTES.home);
    },
    [intercepted, router, sound, teardown, openedOver],
  );

  // entrance animations of the flow are started on the first frame of the open dialog (see openContext.ts)
  const openApi = useMemo(() => createOpenApi(), []);
  // time of the mount effect that calls showModal() — the original's framer `createdAt` for the entrance animations
  const showAt = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    closing.current = false;
    alive.current = true;
    leavingByLink.current = false;
    el.inert = false;
    el.style.opacity = '';
    const a = document.activeElement;
    opener.current = a instanceof HTMLElement && a !== document.body ? a : null;
    // the bottom navigation is not rendered on /contact: remember how to find its "Contato" link again
    openerSelector.current = opener.current?.closest('nav') ? `nav a[href="${ROUTES.contact}"]` : null;
    // the page underneath keeps its place: on a fresh open its path and scroll go into this /contact history entry; when
    // the modal comes back through history (privacy link → Back), that entry's own values are put back (holdUnder).
    // Per entry, not one shared value: with two /contact entries in history the other one's page position was used.
    if (intercepted) {
      if (openedOver) {
        if (window.location.pathname === ROUTES.contact) writeUnder(openedOver);
      } else {
        const u = readUnder();
        if (u) holdUnder(u);
      }
    }
    if (savedOverflow.current === null) {
      savedOverflow.current = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }
    if (!el.open) {
      showAt.current = performance.now();
      el.showModal();
    }
    // once per mount: `intercepted` and the first-render position are fixed for the life of this modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a link inside the dialog that leaves /contact (e.g. "Política de privacidade"): the slot unmounts the modal on the
  // new page; focus then stays on that page instead of jumping back to the opener behind it
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('/') && !href.startsWith(ROUTES.contact)) {
        leavingByLink.current = true;
        stopHold?.(); // the new page starts at its own top
      }
    };
    el.addEventListener('click', onClick, true);
    return () => el.removeEventListener('click', onClick, true);
  }, []);

  // unmount (Back / Forward, a link to another page): a layout cleanup runs before React detaches the <dialog>, so the
  // native close and the focus restoration still work
  useLayoutEffect(
    () => () => {
      alive.current = false;
      teardown(!leavingByLink.current);
    },
    [teardown],
  );

  // Runs right after the effect above on mount, on the first frame of the open dialog: the entrance animations are
  // started imperatively (no React render in that frame) from an explicit start time `t0`.
  // The original's framer (chunk 3478 l.338, `onKeyframesResolved`) starts an animation at
  //   resolvedAt − createdAt > 40 ms ? resolvedAt : createdAt
  // with createdAt = the mount-effect task (showModal) and resolvedAt = its frame batch on the first open frame.
  // MEASURED (scripts/contact-legal/debug-anchor.mjs): hard load → showModal 62–92 ms before the first open frame,
  // container spring starts on that frame (+0.3 ms); soft navigation → 19–32 ms before, spring starts at showModal
  // (−0.2…−5 ms). The same rule is applied here with performance.now() in this first-frame callback as `resolvedAt`
  // (as the original's frame batch, which reads performance.now(); the rAF timestamp is the frame's begin time, which
  // can predate a long hydration task by ~100 ms on a hard load — MEASURED). framer 14 would re-apply its own 40 ms
  // rule on its first tick (a frame later), hence the explicit `startTime` passed by the listeners.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const show = showAt.current;
      const now = performance.now();
      const t0 = show === null || now - show > 40 ? now : show;
      time.set(t0);
      openApi.fire(t0);
    });
    return () => cancelAnimationFrame(id);
  }, [openApi]);

  return (
    <dialog
      ref={ref}
      className={styles.ModalDialog}
      data-lenis-prevent
      // Esc: the same close as X (the browser would otherwise close the dialog on its own, leaving the URL at /contact)
      onCancel={(e) => {
        e.preventDefault();
        void requestClose('escape');
      }}
      // a close the page did not start (e.g. a repeated Esc through the browser's close watcher): same way out
      onClose={() => {
        if (!closing.current && alive.current) void requestClose('native');
      }}
    >
      <button ref={closeButton} className={styles.CloseButton} onClick={() => void requestClose('button')} aria-label="Fechar contato">
        <CloseIcon />
      </button>
      <ContactCloseContext.Provider value={requestClose}>
        <ContactOpenContext.Provider value={openApi}>{children}</ContactOpenContext.Provider>
      </ContactCloseContext.Provider>
    </dialog>
  );
}

export default ContactModal;
