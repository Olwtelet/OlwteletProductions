'use client';
// Circular "PLAY/MUTE" cursor — original modules 86436 (CursorContainer) + 44563 (Cursor). docs/recon/about.md §7.2
// - window mousemove stores the pointer; every frame: inside = pointer within the overlay rect; on change the scale
//   animates to 1 (0.4 s, cubic-bezier(0,.53,.26,1.18)) or 0 (0.4 s, cubic-bezier(1,-.42,1,.8)); x/y follow the
//   pointer with lerp(…, 0.2).
// - click: scale [1, .8, 1] over 0.2 s (cubic-bezier(.44,0,.44,1)), then the handler.
// The lerp(…, 0.2) runs once per framer frame (useAnimationFrame, module 51001) with no time term, exactly as the
// original: the follow speed depends on the display refresh rate (owner review 2026-11-08 removed the former
// 60 fps calibration).
import { animate, cubicBezier, motion, useAnimationFrame, useMotionValue } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import s from './cursor.module.css';

const EASE_LEAVE = cubicBezier(1, -0.42, 1, 0.8);
const EASE_ENTER = cubicBezier(0, 0.53, 0.26, 1.18);
const EASE_CLICK = cubicBezier(0.44, 0, 0.44, 1);

const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;

export function Cursor({
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
  const ref = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(0);

  useAnimationFrame(() => {
    if (!ref.current || !pointer.current) return;
    const { top, bottom, left, right } = ref.current.getBoundingClientRect();
    const { x: px, y: py } = pointer.current;
    const isInside = px > left && px < right && py < bottom && py > top;
    if (inside.current !== isInside) {
      if (isInside) animate(scale, 1, { duration: 0.4, ease: EASE_ENTER });
      else animate(scale, 0, { duration: 0.4, ease: EASE_LEAVE });
      inside.current = isInside;
    }
    x.set(lerp(x.get(), px - left, 0.2));
    y.set(lerp(y.get(), py - top, 0.2));
  });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      if (handleMouseMove) handleMouseMove(e);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={ref}
      className={cx(s.CursorElement, typography.MonoDetail, blendMode && s.CursorElement_BlendMode)}
      onClick={() => {
        animate(scale, [1, 0.8, 1], { duration: 0.2, ease: EASE_CLICK });
        if (handleMouseClick) handleMouseClick();
      }}
    >
      <motion.div className={s.Wrapper} style={{ translateX: x, translateY: y, scale }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function CursorContainer({
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
    <div className={s.Container}>
      {children}
      <Cursor blendMode handleMouseMove={onMouseMove} handleMouseClick={onClick}>
        <div className={s.Element}>{text}</div>
      </Cursor>
    </div>
  );
}

export default CursorContainer;
