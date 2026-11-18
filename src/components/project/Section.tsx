'use client';
// Original module 37492 (Section) + 8460 (variants) + 47301 (Separator) + 66416 (Label) + 61856 (Stagger).
//
// Section: div.Container{margin-bottom:40px} > [motion.hr.Separator (scaleX 0→1, 1 s easeOut),
//   motion.div(.layout_Grid unless isNoGrid) (opacity 0→1, 0.2 s)]. Triggered by framer useInView (defaults:
//   amount "some", not once) — the state is set to "visible" the first time and never goes back.
// Stagger: motion.div.Container{display:contents} with the same variants (inherited from the Section body);
//   on mount every child (recursing through display:contents children) is set to {opacity:0, translateY:10px},
//   and when its own 0.2 s variant animation completes, child i animates to {opacity:1, translateY:0px}
//   over 0.5 s easeOut with delay 0.2·i.
import { animate, motion, useInView, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { layout } from '@/components/ui/layout';
import { label, typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import s from './caseStudy.module.css';

export const SECTION_STATE = { HIDDEN: 'hidden', VISIBLE: 'visible' } as const;
/** module 8460 `Wb` */
export const BODY_VARIANTS: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.2 } } };
/**
 * module 8460 `vC` (scaleX 0 → 1, 1 s, easeOut).
 * projects-D11-hr-scaleX (docs/evidence/verify/bundler/SUMMARY.md §4, docs/evidence/verify/chain/SUMMARY.md): the
 * original's framer build runs this as a plain JS animation on its frame loop — one inline `transform` write per frame,
 * ending with `transform: none`. framer-motion 14.10.1 would group it into a compositor (WAAPI) transform animation.
 * `isSync` makes `animateMotionValue` return a plain `JSAnimation` directly, which needs explicit keyframes: `[0, 1]` is
 * the hidden state's 0 written out (the Section never goes back to hidden). The result runs on the main thread like the
 * original's. The original reaches its JS animation through the asynchronous keyframe-resolution path (start =
 * resolvedAt when resolution lands > 40 ms after creation, else createdAt; its chunk 3478 l.336–341). `isSync` skips that
 * path, but the local JSAnimation applies the same 40 ms rule on its first frame (motion-dom JSAnimation.mjs tick →
 * resolveStartTime), so the starts are identical when the original resolves in the next frame batch, the usual case;
 * only a forced resolution on the original makes them differ. Values, duration and easing are the original's; only the
 * engine choice is pinned.
 */
export const SEPARATOR_VARIANTS: Variants = { hidden: { scaleX: 0 }, visible: { scaleX: [0, 1], transition: { duration: 1, ease: 'easeOut', isSync: true } } };

export function Section({ children, isNoGrid = false }: { children?: ReactNode; isNoGrid?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [state, setState] = useState<'hidden' | 'visible'>(SECTION_STATE.HIDDEN);
  useEffect(() => {
    if (inView) setState(SECTION_STATE.VISIBLE);
  }, [inView]);
  return (
    <motion.div ref={ref} className={s.Section}>
      <motion.hr className={s.Separator} variants={SEPARATOR_VARIANTS} animate={state} initial={SECTION_STATE.HIDDEN} />
      <motion.div className={isNoGrid ? '' : layout.Grid} variants={BODY_VARIANTS} animate={state} initial={SECTION_STATE.HIDDEN}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** module 66416: motion.p.MonoDetail.Label (10px dot + text). */
export function Label({ children }: { children?: ReactNode }) {
  return <motion.p className={cx(typography.MonoDetail, label.Label)}>{children}</motion.p>;
}

/** CaseStudy `c`: Section with an optional Label as first grid child. */
export function LabelledSection({ label: text = '', children }: { label?: string; children?: ReactNode }) {
  return (
    <Section>
      {text && <Label>{text}</Label>}
      {children}
    </Section>
  );
}

type StaggerTarget = Element;
const flatten = (el: Element): StaggerTarget[] => {
  const out: StaggerTarget[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const c = el.children.item(i);
    if (!c) continue;
    if (window.getComputedStyle(c).display === 'contents') out.push(...flatten(c));
    else out.push(c);
  }
  return out;
};
const shown = (i: number) => ({ props: { opacity: 1, translateY: '0px' }, transition: { duration: 0.5, ease: 'easeOut' as const, delay: 0.2 * i } });
const hiddenProps = () => ({ props: { opacity: 0, translateY: '10px' }, transition: { duration: 0 } });

/** module 61856 */
export function Stagger({ children }: { children?: ReactNode }) {
  const items = useRef<StaggerTarget[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const run = (els: StaggerTarget[], get: (i: number) => { props: Record<string, string | number>; transition: Record<string, unknown> }) => {
    els.forEach((el, i) => {
      const { props, transition } = get(i);
      animate(el, props, transition);
    });
  };
  useEffect(() => {
    if (!ref.current) return;
    items.current = flatten(ref.current);
    run(items.current, hiddenProps);
    return () => {
      items.current = [];
    };
  }, []);
  return (
    <motion.div ref={ref} className={s.Stagger} variants={BODY_VARIANTS} onAnimationComplete={() => run(items.current, shown)}>
      {children}
    </motion.div>
  );
}
