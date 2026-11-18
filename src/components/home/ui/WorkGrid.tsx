'use client';
// Home page client root — original module 55607 `tA` (WorkGrid). docs/recon/home-interaction.md §1, §5, §6.
// DOM order (FROM-CODE): div.styles_Container > [loader (AnimatePresence) + intro ghost, <aside> list view,
// grid/list toggle, R3F canvas]. The loader/ghost and the canvas belong to grid-engine (WorkGridLoader /
// WorkGridCanvas); this root only places them and owns the view mode in component state, as the original
// (`[t, i] = useState(eR.GRID)`; the toggle calls that React setter). The store's homeView (original caseStudyView)
// is written only by the unmount reset here and by the no-WebGL2 branch in WorkGridCanvas; nothing reads it.
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WorkGridCanvas } from '@/components/home/workgrid/WorkGridCanvas';
import { WorkGridLoader } from '@/components/home/workgrid/WorkGridLoader';
import type { WorkGridData } from '@/components/home/workgrid/types';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { setHomeView, useAppStore, type HomeView } from '@/lib/store';
import { GridListToggle } from './GridListToggle';
import { getHomeAlias } from './homeAlias';
import { ListView } from './ListView';
import type { ListProject } from './listData';
import styles from './workGrid.module.css';

export function WorkGrid({ data, projects }: { data: WorkGridData; projects: ListProject[] }) {
  // original `tA` reads the zustand store without a selector (`(0,p.P)()`): it re-renders, with the whole list
  // (tT > tL > every tb row) and the canvas, on EVERY store write. That render cost is part of the observable timing
  // (e.g. the ≈50 ms main-thread task between a tile click and the transition fill, MEASURED on the original:
  // docs/evidence/grid-engine/wave-b/click/), so the subscription is mirrored.
  useAppStore();
  // original `[t, i] = (0, a.useState)(eR.GRID)`: the view is component state; same-value toggle clicks bail out in React
  const [view, setView] = useState<HomeView>('grid');
  const router = useRouter();
  const sound = useOptionalSound();
  const setAudioInteractionMode = sound?.setAudioInteractionMode;

  // original: unmount cleanup `k("grid")` (setCaseStudyView), a write that notifies even when the value is unchanged
  useEffect(() => () => setHomeView('grid'), []);

  // Arriving on "/" (empty query) by a client navigation (logo, Work, "See all work"…) lands on the session's home
  // alias on the original (router quirk, ./homeAlias.ts). TransitionLayer already pushes the aliased URL (as the
  // original does); this replace only covers a plain <Link href="/"> or Back/Forward landing on a bare "/".
  useEffect(() => {
    if (location.pathname === '/' && !location.search) {
      const a = getHomeAlias();
      if (a) router.replace('/' + a, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // original: useEffect(() => setAudioInteractionMode(t === LIST ? SCROLL : DRAG), [t])
  useEffect(() => {
    setAudioInteractionMode?.(view === 'list' ? 'scroll' : 'drag');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <div className={styles.Container}>
      <WorkGridLoader data={data} />
      <aside>
        <ListView projects={projects} isOpen={view === 'list'} />
      </aside>
      <GridListToggle onChange={setView} />
      <WorkGridCanvas data={data} />
    </div>
  );
}

export default WorkGrid;
