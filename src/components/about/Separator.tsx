'use client';
// Original module 47301: `motion.hr.styles_Separator`. On the About pages it is rendered without motion props
// (static 1 px rule, no draw-in — docs/recon/about.md §7.6).
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cx } from '@/lib/cx';
import s from './separator.module.css';

export function Separator({ className, ...rest }: HTMLMotionProps<'hr'>) {
  return <motion.hr className={cx(s.Separator, className)} {...rest} />;
}

export default Separator;
