'use client';
// Reveal block — original client module 37492 (+ variants module 8460, separator module 47301).
//   div.styles_Container__47ljQ (motion)
//     hr.styles_Separator__rFyRk   hidden {scaleX:0} → visible {scaleX:1, 1 s easeOut}
//     div.layout_Grid (motion)     hidden {opacity:0} → visible {opacity:1, 0.2 s}
// Trigger: framer useInView(ref) (module 61792, amount "some"); once visible it never goes back (the effect only
// ever sets VISIBLE).
import { motion, useInView, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { layout } from '@/components/ui/layout';
import styles from './legal.module.css';

export const REVEAL_STATE = { HIDDEN: 'hidden', VISIBLE: 'visible' } as const;
type RevealState = (typeof REVEAL_STATE)[keyof typeof REVEAL_STATE];

/** module 8460 `Wb` */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};
/** module 8460 `vC` */
export const separatorVariants: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 1, ease: 'easeOut' } },
};

export function RevealBlock({ children, isNoGrid }: { children: ReactNode; isNoGrid?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [state, setState] = useState<RevealState>(REVEAL_STATE.HIDDEN);

  useEffect(() => {
    if (inView) setState(REVEAL_STATE.VISIBLE);
  }, [inView]);

  return (
    <motion.div ref={ref} className={styles.Container}>
      <motion.hr className={styles.Separator} variants={separatorVariants} animate={state} initial={REVEAL_STATE.HIDDEN} />
      <motion.div className={isNoGrid ? undefined : layout.Grid} variants={fadeVariants} animate={state} initial={REVEAL_STATE.HIDDEN}>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default RevealBlock;
