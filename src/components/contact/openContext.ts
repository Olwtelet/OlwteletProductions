'use client';
// "The dialog has opened" signal shared by the contact modal and the flow inside it.
// In the original (older framer-motion) the entrance animations (container fade, title move, "LET'S TALK") are timed
// from the open: from the first frame of the open dialog on a hard load, from `showModal()` after a client-side
// (intercepted) navigation — MEASURED, see ContactModal.tsx. framer-motion 14 times animations from a clock it
// caches per synchronous task, which made them start ~150 ms early (created inside the long hydration task) or
// ~45 ms late (created in a later task) on the dev server — MEASURED. So the entrance animations are started
// imperatively from the modal's first rAF after showModal (no React render in that frame), with framer's clock set
// to the anchor the modal passes (`ts`).
//   useOnContactOpen((ts) => animate(opacity, 1, {...}))
import { createContext, useContext, useEffect, useRef } from 'react';

export type OpenListener = (ts: number) => void;
export interface ContactOpenApi {
  /** register a callback for the open frame; called at once (with the stored timestamp) if already open */
  onOpen: (cb: OpenListener) => () => void;
}

/** Outside a modal: "opens" on the next frame after mount. */
export const ContactOpenContext = createContext<ContactOpenApi>({
  onOpen: (cb) => {
    const id = requestAnimationFrame(cb);
    return () => cancelAnimationFrame(id);
  },
});

export function createOpenApi(): ContactOpenApi & { fire: (ts: number) => void } {
  const listeners = new Set<OpenListener>();
  let openedAt: number | null = null;
  return {
    onOpen(cb) {
      if (openedAt !== null) {
        cb(openedAt);
        return () => {};
      }
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    fire(ts) {
      openedAt = ts;
      for (const l of [...listeners]) l(ts);
      listeners.clear();
    },
  };
}

/** Run `cb(ts)` once, on the first frame of the open dialog. */
export function useOnContactOpen(cb: OpenListener) {
  const api = useContext(ContactOpenContext);
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => api.onOpen((ts) => ref.current(ts)), [api]);
}

/** Olwtelet: the modal's single way out (ContactModal requestClose), for the flow's own "Concluir" button. */
export type CloseReason = 'button' | 'escape' | 'native' | 'finish';
export const ContactCloseContext = createContext<((reason?: CloseReason) => void | Promise<void>) | null>(null);
export function useContactClose() {
  return useContext(ContactCloseContext);
}
