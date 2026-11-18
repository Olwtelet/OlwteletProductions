'use client';
// Stagger container — original client module 61856.
//   div.styles_Container__tmcc8 {display:contents} (motion, variants Wb, inherits the parent's animate state)
// On mount every leaf child (display:contents children are flattened) is set to {opacity:0, translateY:"10px"}
// (duration 0). When the container's own variant animation completes, child i animates to
// {opacity:1, translateY:"0px"} with {duration:0.5, ease:"easeOut", delay:0.2*i}.
import { animate, motion, type Transition } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { fadeVariants } from './RevealBlock';
import styles from './legal.module.css';

type Step = (i: number) => { props: Record<string, string | number>; transition: Transition };
const visibleStep: Step = (i) => ({
  props: { opacity: 1, translateY: '0px' },
  transition: { duration: 0.5, ease: 'easeOut', delay: 0.2 * i },
});
const hiddenStep: Step = () => ({
  props: { opacity: 0, translateY: '10px' },
  transition: { duration: 0 },
});

function leaves(el: Element): Element[] {
  const out: Element[] = [];
  const kids = el.children;
  for (let i = 0; i < kids.length; i++) {
    const n = kids.item(i);
    if (!n) continue;
    if (window.getComputedStyle(n).display === 'contents') out.push(...leaves(n));
    else out.push(n);
  }
  return out;
}

function run(els: Element[], step: Step) {
  for (const i in els) {
    const { props, transition } = step(Number(i));
    animate(els[i] as HTMLElement, props, transition);
  }
}

export function Stagger({ children }: { children: ReactNode }) {
  const items = useRef<Element[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !items.current) return;
    items.current = leaves(ref.current);
    run(items.current, hiddenStep);
    return () => {
      items.current = [];
    };
  }, []);

  return (
    <motion.div ref={ref} className={styles.Stagger} variants={fadeVariants} onAnimationComplete={() => run(items.current, visibleStep)}>
      {children}
    </motion.div>
  );
}

export default Stagger;
