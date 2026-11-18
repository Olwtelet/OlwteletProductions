'use client';
// Intro DOM layer of the home WorkGrid (grid-engine). Renders, in the original DOM order (module 55607 `tA`):
//   <AnimatePresence> Loader `eJ` (while !beginIntroAnimation && workgridState === 'intro')
//   SoundInteraction `eL`       (while  beginIntroAnimation && workgridState === 'intro')
// Loader = "OLWTELET" / "PRODUCTIONS" (BRAND.loaderWords) + #02b7b6 progress bar (THREE.DefaultLoadingManager batches);
// it fades in 0.5 s at hydration (SSR opacity:0), splits when progress > 95, and fades out 0.5 s at T0.
// docs/recon/intro-and-chrome.md §3-§5, §8.
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { cx } from '@/lib/cx';
import { useAppStore } from '@/lib/store';
import { introStore, useIntro, useLoadingProgress } from './introStore';
import { SoundInteraction } from './SoundInteraction';
import s from './loader.module.css';
import type { WorkGridData } from './types';
import { BRAND } from '@/content/brand';

const [TEXT_1, TEXT_2] = BRAND.loaderWords; // eK, eX
// e$ (framer: a transition with only `duration` uses its default 'easeOut')
const LOADER_VARIANTS = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.5 } };

function Loader({ onLoaded }: { onLoaded: () => () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const n = useLoadingProgress();
  // original: `useEffect(() => { n > 95 && (r(!0), e()); }, [n, e])` — the arrow returns e()'s canceller, which React
  // uses as the effect cleanup: the next progress change (or the unmount) cancels that 1500 ms timer.
  useEffect(() => {
    if (n > 95) {
      setIsLoaded(true);
      return onLoaded();
    }
  }, [n, onLoaded]);
  return (
    <motion.div className={s.Wrapper} {...LOADER_VARIANTS}>
      <div className={cx(s.LoaderText, isLoaded && s.Loaded)}>
        <h2>
          <span>{TEXT_1}</span>
        </h2>
        <h2>
          <span>{TEXT_2}</span>
        </h2>
      </div>
      <div className={s.ProgressBar} style={{ transform: `scaleX(${n / 100})` }} />
    </motion.div>
  );
}

export function WorkGridLoader({ data }: { data: WorkGridData }) {
  void data;
  const workgridState = useAppStore((st) => st.workgridState);
  const begin = useIntro((st) => st.begin);
  const R = useCallback(() => introStore.scheduleBegin(), []);
  return (
    <>
      <AnimatePresence>{!begin && workgridState === 'intro' && <Loader key="loader" onLoaded={R} />}</AnimatePresence>
      {begin && workgridState === 'intro' && <SoundInteraction />}
    </>
  );
}

export default WorkGridLoader;
