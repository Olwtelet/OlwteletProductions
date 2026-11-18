'use client';
// Agency | Approach toggle (original chunk app/about/layout: module 36736 `m` + Toggle module 44378 `y`).
// docs/recon/about.md §3.
// - Options are plain next/link anchors (soft navigation, NOT the global page transition).
// - The Toggle keeps its own `useState(defaultOption)`: it is initialised from the pathname once and then only
//   changes on click (quirk kept: browser back/forward does not move the highlight).
// - Click: plays click.mp3 when the option changes, then moves the highlight immediately (before the route resolves).
// - `disableTransition` is on for the first 200 ms after mount (effect on `isVertical`).
// - The wrapper gets `__visible` once no global page transition is active (`useEffect(() => r(!t), [t])`),
//   so it fades in (CSS opacity .5 s) after mount and hides during nav-pill transitions.
// - Scroll on switch: default router scroll, as the original (Next 16.2.1, no data-scroll-behavior on <html>). The
//   router's scrollTop=0/scrollIntoView requests are smooth (html{scroll-behavior:smooth}) and are cancelled by the
//   window.scrollTo(x, y) that SplitType runs after each split (new page, or the old page's observers), so the result
//   depends on the offset and on which reveals already ran (MEASURED wave B, docs/evidence/foundation/wave-b/: from the very
//   bottom both directions ease 168 → 144; from 800/1500 on a hard-loaded page the offset is kept). The earlier
//   `scroll={false}` was removed 2026-11-07 (docs/implementation/about.md D1, foundation.md §10 B1).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { useAppStore } from '@/lib/store';
import { cx } from '@/lib/cx';
import s from './aboutLayoutToggle.module.css';
// Evaluates the About route's slice modules with this layout module, as the original's webpack page entry does at boot
// (reg-about-toggle-timing; see routeModules.ts).
import './routeModules';

export interface ToggleOption {
  label: string;
  id: string;
  href?: string;
}

/** `_` in module 36736 — module-level constant, compared by identity in the Toggle. */
export const ABOUT_TOGGLE_OPTIONS: ToggleOption[] = [
  { label: 'Estúdio', id: 'studio', href: '/about/studio' },
  { label: 'Processo', id: 'process', href: '/about/process' },
];

function ToggleOptionItem({ isActive, option, onClick }: { isActive: boolean; option: ToggleOption; onClick: (o: ToggleOption) => void }) {
  return (
    <li className={cx(s.ToggleOptionContainer, isActive && s.ToggleOptionContainer__active)}>
      {option.href ? (
        // Default router scroll (as the original): see the header note.
        <Link href={option.href} onClick={() => onClick(option)}>
          {option.label}
        </Link>
      ) : (
        <button onClick={() => onClick(option)}>{option.label}</button>
      )}
    </li>
  );
}

export function Toggle({
  options,
  onChange,
  isVertical = false,
  defaultOption = options[0],
}: {
  options: ToggleOption[];
  onChange?: (id: string) => void;
  isVertical?: boolean;
  defaultOption?: ToggleOption;
}) {
  const sound = useOptionalSound();
  const [current, setCurrent] = useState<ToggleOption>(defaultOption);
  const [disableTransition, setDisableTransition] = useState(false);
  const handle = (o: ToggleOption) => {
    if (current !== o) void sound?.playClip('click');
    setCurrent(o);
    if (onChange) onChange(o.id);
  };
  useEffect(() => {
    setDisableTransition(true);
    const t = setTimeout(() => setDisableTransition(false), 200);
    return () => clearTimeout(t);
  }, [isVertical]);
  return (
    <ul className={cx(s.Toggle, isVertical && s.Toggle__vertical, disableTransition && s.Toggle__disableTransition)}>
      <div className={cx(s.Highlight, current === options[1] && s.Highlight__active)} aria-hidden />
      <ToggleOptionItem isActive={current === options[0]} option={options[0]} onClick={handle} />
      <ToggleOptionItem isActive={current === options[1]} option={options[1]} onClick={handle} />
    </ul>
  );
}

export default function AboutLayoutToggle() {
  const pathname = usePathname();
  const transition = useAppStore((st) => st.transition);
  const [isVisible, setIsVisible] = useState(false);
  const defaultOption = ABOUT_TOGGLE_OPTIONS.find(({ href }) => href === pathname);
  useEffect(() => {
    setIsVisible(!transition);
  }, [transition]);
  return (
    <div className={cx(s.AboutLayoutToggle, isVisible && s.AboutLayoutToggle__visible)}>
      <Toggle options={ABOUT_TOGGLE_OPTIONS} defaultOption={defaultOption} />
    </div>
  );
}
