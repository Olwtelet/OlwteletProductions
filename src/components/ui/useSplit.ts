'use client';
// Original module 55692 `useSplit(id, types, revertOnEnd = true)`: SplitType on `#id` with classes
// `split-line` / `split-word` / `split-char` (+ the id as splitClass). Re-splits on ResizeObserver until the
// animation is over, then reverts to plain text. Kept identical to the original, including its race: a ResizeObserver
// callback queued by the revert's own reflow can re-split after revert() when React has not yet run the effect cleanup
// that disconnects the observer (foundation.md §5 item 15).
import { useCallback, useEffect, useRef, useState } from 'react';
import SplitType from 'split-type';

type SplitOptions = NonNullable<ConstructorParameters<typeof SplitType>[1]>;

export interface SplitSelectors {
  line: string;
  word: string;
  char: string;
}

export function useSplit(id: string, types: string = 'lines,words,chars', revertOnEnd = true) {
  const [isAnimationOver, setIsAnimationOver] = useState(false);
  const [splitText, setSplitText] = useState<SplitType | null>(null);
  const [selectors, setSelectors] = useState<SplitSelectors | null>(null);
  const [reverted, setReverted] = useState(false);
  const ro = useRef<ResizeObserver | null>(null);

  const split = useCallback(() => {
    // original: `if (!e) return;` — no element check. A ResizeObserver callback for a target removed by a navigation
    // still runs `new SplitType('#id')` (no element: a no-op split) whose closing window.scrollTo(savedX, savedY)
    // cancels the router's smooth scroll-to-top: the original's observable scroll result after leaving such a page
    // (MEASURED, foundation.md item 18, docs/evidence/foundation/wave-b/).
    if (!id) return;
    setSplitText(
      new SplitType(`#${id}`, {
        types: types as SplitOptions['types'],
        splitClass: id,
        lineClass: 'split-line',
        charClass: 'split-char',
        wordClass: 'split-word',
      }),
    );
    setSelectors({ line: `.${id}.split-line`, word: `.${id}.split-word`, char: `.${id}.split-char` });
  }, [id, types]); // original deps [e, t] (module 55692)

  useEffect(() => {
    split();
  }, [id, types, split]);

  useEffect(() => {
    if (!id || (revertOnEnd && reverted)) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (!ro.current) ro.current = new ResizeObserver(split);
    ro.current.observe(el);
    return () => {
      if (ro.current) {
        ro.current.disconnect();
        ro.current = null;
      }
    };
  }, [id, reverted, revertOnEnd, split]);

  useEffect(() => {
    if (splitText && revertOnEnd && isAnimationOver && !reverted) {
      setReverted(true);
      splitText.revert();
    }
  }, [revertOnEnd, isAnimationOver, reverted, splitText]);

  const latest = useRef<SplitType | null>(null);
  latest.current = splitText;
  useEffect(
    () => () => {
      latest.current?.revert();
    },
    [],
  );

  return { splitText, selectors, setIsAnimationOver };
}
