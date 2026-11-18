'use client';
// Grid / List view toggle (bottom-left) — original module 55607 `eN` (container, options `eW`) + module 44378
// (generic Toggle). docs/recon/home-interaction.md §5.
//  - rendered only while workgridState === 'work', inside AnimatePresence: motion.div opacity 0→1 / exit 0 with the
//    framer default transition (0.3 s, ease [.25,.1,.35,1]).
//  - Toggle keeps its own selected option (default = first), plays click.mp3 when the option changes, then calls
//    onChange(id). isVertical below 1024 px (Olwtelet: the replica's !isMinLarge was also true at exactly 1024, see
//    the call site); every isVertical change (incl. the mount) disables the highlight transition for 200 ms.
//  - The buttons carry a pt-BR accessible name ("Ver em grade" / "Ver em lista") and aria-pressed.
import { AnimatePresence, motion } from 'framer-motion';
import { createElement, useEffect, useState, type ReactNode } from 'react';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { cx } from '@/lib/cx';
import { useAppStore, type HomeView } from '@/lib/store';
import { useMediaQueries } from '@/lib/useMediaQueries';
import styles from './gridListToggle.module.css';

interface ToggleOption<T extends string> {
  id: T;
  label: ReactNode;
  href?: string;
  /** accessible name of an icon-only option */
  ariaLabel?: string;
}

// Inline SVG components exactly as the original (`ek`/`eA` + createElement; path attributes FROM-CODE,
// = docs/recon/svg/chrome-gridlist-toggle-{grid,list}.live.svg). Stroke colours are overridden by the CSS.
function GridIcon() {
  return createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 20 20' },
    createElement('path', {
      stroke: '#000',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 1.19,
      d: 'M8.546 2.857H2.99v5.556h5.556zM17.276 2.857h-5.555v5.556h5.555zM17.276 11.588h-5.555v5.555h5.555zM8.546 11.588H2.99v5.555h5.556z',
    }),
  );
}
function ListIcon() {
  return createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 20 20' },
    createElement('path', {
      stroke: '#fff',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 0.952,
      d: 'M7.131 5.238H17.45M7.131 10H17.45M7.131 14.762H17.45M3.163 5.238h.008M3.163 10h.008M3.163 14.762h.008',
    }),
  );
}

const VIEW_OPTIONS: ToggleOption<HomeView>[] = [
  { id: 'grid', label: <GridIcon />, ariaLabel: 'Ver em grade' },
  { id: 'list', label: <ListIcon />, ariaLabel: 'Ver em lista' },
];

/** module 44378 `v` */
function ToggleOptionItem<T extends string>({ isActive, option, onClick }: { isActive: boolean; option: ToggleOption<T>; onClick: (o: ToggleOption<T>) => void }) {
  return (
    <li className={cx(styles.ToggleOptionContainer, isActive && styles.ToggleOptionContainer__active)}>
      <button onClick={() => onClick(option)} aria-label={option.ariaLabel} aria-pressed={isActive}>
        {option.label}
      </button>
    </li>
  );
}

/** module 44378 `g` */
function Toggle<T extends string>({
  options,
  onChange,
  isVertical = false,
  defaultOption = options[0],
}: {
  options: ToggleOption<T>[];
  onChange?: (id: T) => void;
  isVertical?: boolean;
  defaultOption?: ToggleOption<T>;
}) {
  const sound = useOptionalSound();
  const [current, setCurrent] = useState(defaultOption);
  const [disableTransition, setDisableTransition] = useState(false);
  const select = (o: ToggleOption<T>) => {
    if (current !== o) void sound?.playClip('click');
    setCurrent(o);
    if (onChange) onChange(o.id);
  };
  useEffect(() => {
    setDisableTransition(true);
    const id = setTimeout(() => setDisableTransition(false), 200);
    return () => clearTimeout(id);
  }, [isVertical]);
  return (
    <ul className={cx(styles.Toggle, isVertical && styles.Toggle__vertical, disableTransition && styles.Toggle__disableTransition)}>
      <div className={cx(styles.Highlight, current === options[1] && styles.Highlight__active)} aria-hidden />
      <ToggleOptionItem isActive={current === options[0]} option={options[0]} onClick={select} />
      <ToggleOptionItem isActive={current === options[1]} option={options[1]} onClick={select} />
    </ul>
  );
}

const containerMotion = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

/** module 55607 `eN` */
export function GridListToggle({ onChange }: { onChange: (id: HomeView) => void }) {
  const mq = useMediaQueries();
  // original `eN`: `{ workgridState: i } = (0, p.P)()` — whole-store subscription (re-renders on every store write)
  const { workgridState } = useAppStore();
  return (
    <AnimatePresence>
      {workgridState === 'work' && (
        <motion.div key="grid-list-container" className={styles.GridListToggleContainer} {...containerMotion}>
          <Toggle
            options={VIEW_OPTIONS}
            // Olwtelet: vertical below 1024 px, as the CSS bands. The replica used !isMinLarge (innerWidth <= 1024), so at
            // exactly 1024 px (an iPad in landscape) the toggle was vertical inside the desktop-sized CSS and its
            // highlight hung 15 px below the pill.
            isVertical={mq.isBelowLargeCss}
            onChange={(id) => {
              if (id === 'grid' || id === 'list') onChange(id);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GridListToggle;
