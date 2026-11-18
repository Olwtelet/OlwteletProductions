'use client';
// Original module 42686: renders children only after `delay` ms (setTimeout from mount).
//   <Delay delay={500}><Slices/></Delay>
// Olwtelet: `immediateUnderContact` renders the children at once when the page is under the contact modal that a
// history traversal brought back. Two ways in:
//   - the page mounts under it (privacy link → Back: the privacy page had replaced this page, so it mounts again,
//     behind the reopened modal): the first render is already complete;
//   - the page mounted under its own URL less than `delay` ms before a Back / Forward to one of its /contact entries:
//     the delay ends at that popstate (location and history.state already belong to the /contact entry).
// The page must have its full height on its first frame under the modal, so the position kept in the /contact history
// entry can be put back behind it (ContactModal, holdUnder). MEASURED with the 500 ms delay: Estúdio was 1068 px tall
// (1440 × 900) for about half a second after Back, the position clamped at 168 instead of 1200, and an X or Esc in that
// time faded the modal out over the page near the top, which then jumped to 1200 (docs/OLWTELET.md, second round of
// the owner, item 2). Every other mount keeps the delay; on the server and on a hard load the condition is false, so
// hydration sees the same empty first render as before.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isRestoringUnderContact } from '@/components/contact/underContact';

export function Delay({ children, delay = 0, immediateUnderContact = false }: { children?: ReactNode; delay?: number; immediateUnderContact?: boolean }) {
  const [ready, setReady] = useState(() => immediateUnderContact && isRestoringUnderContact());
  // the page's own path while the delay runs (the URL at mount, when it is not /contact)
  const ownPath = useRef<string | null>(null);
  useEffect(() => {
    if (ready) return;
    ownPath.current ??= window.location.pathname;
    const id = setTimeout(() => setReady(true), delay);
    const onPop = () => {
      if (immediateUnderContact && isRestoringUnderContact(ownPath.current)) setReady(true);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      clearTimeout(id);
      window.removeEventListener('popstate', onPop);
    };
  }, [delay, ready, immediateUnderContact]);
  return ready ? <>{children}</> : null;
}

export default Delay;
