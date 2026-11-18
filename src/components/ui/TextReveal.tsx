'use client';
// Original module 49854 (docs/recon/about.md §4.3). SplitType lines/words/chars; each line is a mask
// (.split-line overflow hidden) and its chars|words slide `y: calc(100% + 10px) → calc(0% + 0px)` with
// ease [0.93,0,0.03,1]:
//   char: 1 s, stagger .01, per-line start delay .1   (H1s, award cells — default)
//   word: 1.5 s, stagger .03, per-line .15            (paragraphs)
//   line: 2 s, stagger .07, per-line .15
// Triggers once when any pixel enters the viewport; the optional MonoDetail `sectionName` label fades in
// (1 s, delay 1 s) and indents the first line by its width. Every "-" becomes U+2011. After the last line
// finishes the split is reverted to plain text.
//   <TextReveal sectionName="Agency" text={copy} depth="word" />
import { animate, stagger, time, useInView } from 'framer-motion';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { EASE_XQ } from '@/lib/easings';
import { cx } from '@/lib/cx';
import { typography } from './typography';
import { useSplit } from './useSplit';
import styles from './textReveal.module.css';

export type RevealDepth = 'char' | 'word' | 'line';

export const REVEAL_TIMING: Record<RevealDepth, { duration: number; delay: number; lineDelay: number }> = {
  char: { duration: 1, delay: 0.01, lineDelay: 0.1 },
  word: { duration: 1.5, delay: 0.03, lineDelay: 0.15 },
  line: { duration: 2, delay: 0.07, lineDelay: 0.15 },
};

export interface TextRevealProps {
  sectionName?: string | null;
  text?: string | null;
  /** indent the first line by 2em when there is no sectionName */
  indent?: boolean;
  depth?: RevealDepth;
  className?: string;
  textClassName?: string;
}

/** React ids (`«r1»`, `_r_1_`, `:r1:`) made CSS-selector safe (original: replaceAll(":", "_")). */
function safeId(id: string) {
  return 'tr' + id.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function TextReveal({ sectionName, text = '', indent = false, depth = 'char', className, textClassName }: TextRevealProps) {
  const content = text === null ? '' : text.replaceAll('-', '‑');
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const id = safeId(String(useId()));
  const { splitText, selectors, setIsAnimationOver } = useSplit(id, 'lines,words,chars');
  const [started, setStarted] = useState(false);
  const inView = useInView(containerRef, { once: true });

  const animateLines = useCallback(
    (lineCount: number) => {
      if (!selectors || !splitText) return;
      const unit = depth === 'word' ? selectors.word : depth === 'line' ? selectors.line : selectors.char;
      const { duration, delay, lineDelay } = REVEAL_TIMING[depth];
      // The original runs a one-segment sequence per line and calls play() at once (module 49854); its framer build (12.x)
      // makes that one main-thread JSAnimation per char|word|line, its keyframe resolution forced here, so every unit
      // starts at framer's effect time T0 (no first-frame 40 ms rule) and ticks from the next frame. framer 14's
      // sequence Timeline and transform groups cost about 2× that in this effect in profiled traces (2026-11-12,
      // acceptance item A1, ProjectTitle.tsx), so the same animations are started directly: `isSync` makes the plain JSAnimation (explicit
      // keyframes) and `startTime: T0` keeps the original's start. Values, stagger, duration and easing are the original's.
      const t0 = time.now();
      for (let n = 0; n < lineCount; n++) {
        const last = n === lineCount - 1;
        const sel = ` ${selectors.line}:nth-child(${n + 1}) ${unit}`;
        const controls = animate(sel, { y: ['calc(100% + 10px)', 'calc(0% + 0px)'] }, { duration, delay: stagger(delay, { startDelay: n * lineDelay }), ease: EASE_XQ, isSync: true, startTime: t0 });
        controls.then(() => {
          if (last) setIsAnimationOver(true);
        });
      }
    },
    [selectors, splitText, depth, setIsAnimationOver],
  );

  const applyIndent = useCallback(() => {
    if (!textRef.current) return;
    if (labelRef.current) textRef.current.style.setProperty('--text-indent', `${labelRef.current.offsetWidth}px`);
    else if (indent) textRef.current.style.setProperty('--text-indent', '2em');
  }, [indent]);

  useEffect(() => {
    applyIndent();
    if (!splitText || !inView || started) return;
    const lineCount = splitText.lines?.length || 0;
    if (labelRef.current) animate([[labelRef.current, { opacity: [0, 1] }, { duration: 1, delay: 1, ease: EASE_XQ }]]);
    setStarted(true);
    animateLines(lineCount);
  }, [id, inView, splitText, content, animateLines, applyIndent, started]);

  return (
    <div ref={containerRef} className={cx(styles.Container, className)} style={{ visibility: inView && started ? 'visible' : 'hidden' }}>
      {sectionName && (
        <div ref={labelRef} className={cx(styles.SectionName, typography.MonoDetail)}>
          {sectionName}
        </div>
      )}
      <div id={id} ref={textRef} className={cx(styles.Text, textClassName)}>
        {content}
      </div>
    </div>
  );
}

export default TextReveal;
