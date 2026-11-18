'use client';
// Original CaseStudy `em` (module 17160) + `ei`.
// div.Container (margin 24px 0 56px) > h1.Text.LargeTitle[style --scale-font] — uppercase, centred.
// SplitType "lines" (NOT reverted, re-split by a ResizeObserver for the life of the page). While the container is
// in view (framer useInView defaults: not once) the h1 gets `.Text__visible` (opacity 0→1, CSS 0.5 s
// ease-in-out) — it goes back to 0 when the title leaves the viewport. The first time it is in view, one
// sequence runs (all at t=0, 0.8 s, ease Iz [0.53,0.02,0,1]): every line opacity 0→1, the first line
// y −40px→0, the last line y +40px→0.
import { animate, time, useInView } from 'framer-motion';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useSplit } from '@/components/ui/useSplit';
import { typography } from '@/components/ui/typography';
import { EASE_IZ } from '@/lib/easings';
import { cx } from '@/lib/cx';
import { safeDomId } from './media';
import s from './caseStudy.module.css';

const TIMING = { duration: 0.8, delay: 0, ease: EASE_IZ };
/**
 * Engine of the title animations (2026-11-12, acceptance item A1, docs/evidence/verify/acceptance/a1a2/).
 * The original calls `animate(sequence)` with three segments at t = 0 and then `play()` (module 17160 `em`). Its framer
 * build (12.x) turns the sequence into one animation per element and value — opacity on WAAPI, `y` as a main-thread
 * JSAnimation — and the explicit `play()` forces their keyframe resolution inside this effect, so every `y` starts at
 * framer's effect time T0 (no first-frame 40 ms rule) and ticks from the next frame. Segments on the same element and
 * value overwrite each other, so a ONE-line title gets only the last segment (+40px → 0).
 * framer 14 compiles the sequence into a Timeline with compositor transform groups that it then moves to the main
 * thread: in profiled traces about 2× the original's work in this passive-effect task. With that path the divider line
 * started +13 to +18 ms later than the original's in the 2026-11-12 runs (+5 to +7 ms in the 2026-11-11 runs); starting
 * the same animations directly removed that lag on variant builds. So, here:
 *   - opacity on every line, as before (WAAPI);
 *   - `y` with `isSync` (framer 14 then makes the plain JSAnimation, no transform group, no resolver: numeric keyframes,
 *     as the original's resolver produces) and `startTime: T0`, the original's start;
 *   - the first line's `y` only when it is not also the last line (the sequence's overwrite).
 * Values, the `y` start, duration, easing and the end state are the original's; the opacity (WAAPI) start is backdated
 * to its creation by framer 14, the original's starts when ready (a1a2 SUMMARY L1, not changed).
 */
/** Olwtelet: accented letters (Á, É, Ç…) reach the line above at the title's 0.9 leading (caseStudy.module.css) */
const ACCENTED = /[À-ÖØ-öø-ÿ]/;

const edgeLine = (selector: string, sign: number, startTime: number) => animate(selector, { y: [40 * sign, 0] }, { ...TIMING, isSync: true, startTime });

export function ProjectTitle({ text, scaleFactor }: { text?: string | null; scaleFactor?: number }) {
  const value = text || '';
  const id = safeDomId(String(useId()));
  const { splitText, selectors, setIsAnimationOver } = useSplit(id, 'lines', false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!splitText || !inView || !selectors || done) return;
    const t0 = time.now();
    const first = `${selectors.line}:first-child`;
    const last = `${selectors.line}:last-child`;
    const oneLine = document.querySelector(first) === document.querySelector(last);
    const controls = [
      animate(selectors.line, { opacity: [0, 1] }, TIMING),
      ...(oneLine ? [] : [edgeLine(first, -1, t0)]),
      edgeLine(last, 1, t0),
    ];
    let cancelled = false;
    void Promise.all(controls).then(() => {
      if (cancelled) return;
      setIsAnimationOver(true);
      setDone(true);
    });
    return () => {
      cancelled = true;
      controls.forEach((c) => c.stop());
    };
  }, [splitText, inView, selectors, done, setIsAnimationOver]);

  return (
    <div ref={ref} className={s.TitleContainer}>
      <h1
        id={id}
        className={cx(s.TitleText, typography.LargeTitle, inView && s.TitleText__visible, ACCENTED.test(value) && s.TitleText_Accented)}
        style={scaleFactor ? ({ '--scale-font': scaleFactor } as CSSProperties) : undefined}
      >
        {value}
      </h1>
    </div>
  );
}
