'use client';
// Original modules 86436 (CursorArea: div.Container > [children, CursorElement]) and 44563 (CursorElement).
// CursorElement: motion.div.CursorElement.MonoDetail(.BlendMode) — absolute, inset 0, on top of the children —
//   containing motion.div.Wrapper (translateX/translateY/scale motion values) > div.Element (80 px white bubble,
//   mix-blend-mode difference, translate(-50%,-50%)).
//   - window mousemove: remembers the pointer and calls handleMouseMove(e)
//   - every frame (framer frameloop "update"): inside = pointer strictly inside the element rect; on change,
//     scale → 1 (0.4 s, cubicBezier(0,.53,.26,1.18)) or → 0 (0.4 s, cubicBezier(1,-.42,1,.8));
//     x/y lerp toward pointer − rect origin by 0.2 per frame
//   - click: scale [1,0.8,1] 0.2 s cubicBezier(.44,0,.44,1), then handleMouseClick()
// The 0.2 lerp runs once per framer frame with no time term, exactly as the original (owner review 2026-11-08 removed
// the former time-based calibration): the follow speed depends on the display refresh rate, like the original.
import { animate, cubicBezier, frame, cancelFrame, motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import s from './slices.module.css';

const EASE_OUT_SCALE = cubicBezier(1, -0.42, 1, 0.8);
const EASE_IN_SCALE = cubicBezier(0, 0.53, 0.26, 1.18);
const EASE_CLICK = cubicBezier(0.44, 0, 0.44, 1);
const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;

function CursorElement({
  children,
  blendMode = false,
  handleMouseMove,
  handleMouseClick,
}: {
  children?: ReactNode;
  blendMode?: boolean;
  handleMouseMove?: (e: MouseEvent) => void;
  handleMouseClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(0);
  const onMove = useRef(handleMouseMove);
  onMove.current = handleMouseMove;

  useEffect(() => {
    const update = () => {
      if (!ref.current || !pointer.current) return;
      const { top, bottom, left, right } = ref.current.getBoundingClientRect();
      const { x: px, y: py } = pointer.current;
      const isInside = px > left && px < right && py < bottom && py > top;
      if (inside.current !== isInside) {
        if (isInside) animate(scale, 1, { duration: 0.4, ease: EASE_IN_SCALE });
        else animate(scale, 0, { duration: 0.4, ease: EASE_OUT_SCALE });
        inside.current = isInside;
      }
      x.set(lerp(x.get(), px - left, 0.2));
      y.set(lerp(y.get(), py - top, 0.2));
    };
    frame.update(update, true);
    return () => cancelFrame(update);
  }, [scale, x, y]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!ref.current) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      onMove.current?.(e);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <motion.div
      ref={ref}
      className={cx(s.CursorElement, typography.MonoDetail, blendMode && s.CursorElement_BlendMode)}
      onClick={() => {
        animate(scale, [1, 0.8, 1], { duration: 0.2, ease: EASE_CLICK });
        handleMouseClick?.();
      }}
    >
      <motion.div className={s.CursorWrapper} style={{ translateX: x, translateY: y, scale }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** module 86436 */
export function CursorArea({
  onMouseMove,
  onClick,
  text,
  children,
}: {
  onMouseMove?: (e: MouseEvent) => void;
  onClick?: () => void;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.CursorContainer}>
      {children}
      <CursorElement blendMode handleMouseMove={onMouseMove} handleMouseClick={onClick}>
        <div className={s.CursorBubble}>{text}</div>
      </CursorElement>
    </div>
  );
}
