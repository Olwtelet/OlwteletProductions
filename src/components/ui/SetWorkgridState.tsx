'use client';
// Sets store.workgridState on mount (after `delayMs`). Used by the foundation's home stub so the chrome mounts
// on "/" without the WebGL intro; the grid engine sets 'work' itself at T0 + 3.2 s (intro-and-chrome.md §3.3).
import { useEffect } from 'react';
import { setWorkgridState, type WorkgridState } from '@/lib/store';

export function SetWorkgridState({ state, delayMs = 0 }: { state: WorkgridState; delayMs?: number }) {
  useEffect(() => {
    const id = setTimeout(() => setWorkgridState(state), delayMs);
    return () => clearTimeout(id);
  }, [state, delayMs]);
  return null;
}

export default SetWorkgridState;
