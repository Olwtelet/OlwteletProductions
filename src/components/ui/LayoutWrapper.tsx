'use client';
// Original module 37974. Fixed full-screen, pointer-events:none container (descendants get pointer-events:all).
// Renders NOTHING until workgridState === 'work', then mounts its children 500 ms later.
// If it mounts while the state is already 'work' (e.g. home after a client navigation) it renders at once.
//   order 0 → z 10000 (home page UI: Filter button), 1 → z 9999 (root chrome: Header + Nav), 2 → z 9998 (unused)
import { useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { cx } from '@/lib/cx';
import styles from './layoutWrapper.module.css';

export const LAYOUT_WRAPPER_DELAY_MS = 500;

export function LayoutWrapper({ children, order = 1, hidden = false }: { children?: ReactNode; order?: 0 | 1 | 2; hidden?: boolean }) {
  const workgridState = useAppStore((s) => s.workgridState);
  const [ready, setReady] = useState(workgridState === 'work');
  useEffect(() => {
    if (workgridState !== 'work') return;
    const id = setTimeout(() => setReady(true), LAYOUT_WRAPPER_DELAY_MS);
    return () => clearTimeout(id);
  }, [workgridState]);
  if (!ready) return null;
  return <div className={cx(styles.Container, styles[`Container__order${order}`], hidden && styles.Container__hidden)}>{children}</div>;
}

export default LayoutWrapper;
