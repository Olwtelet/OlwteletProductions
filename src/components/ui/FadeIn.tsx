'use client';
// Original module 36222: motion.div.styles_Container__Yo_Vo {position:relative; z-index:1}
// opacity 0,y 20 → 1,0 over 0.8 s, ease [0.93,0,0.03,1], `delay` s, once the block enters the viewport
// (useInView once, margin 0, amount "some").
//   <FadeIn delay={1}><Media/></FadeIn>
import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { fadeInUp } from './motion';
import styles from './fadeIn.module.css';

export function FadeIn({ children, delay = 0, className }: { children?: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref} className={cx(className, styles.Container)} {...fadeInUp(delay, inView)}>
      {children}
    </motion.div>
  );
}

export default FadeIn;
