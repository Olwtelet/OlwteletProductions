'use client';
// Intro state shared by the two grid-engine components that home-ui renders as siblings (<WorkGridLoader> and
// <WorkGridCanvas>). In the original both live inside the WorkGrid root `tA` (module 55607), which owns:
//   n / m  = beginIntroAnimation (useState)        R = useCallback(() => setTimeout(() => m(true), 1500))
// R is called by the R3F Canvas `onCreated` (timer never cancelled) and by the loader each time the loading progress
// is > 95 (that effect returns R()'s cleanup, so the next progress change cancels it).
//
// T0 (docs/recon/intro-and-chrome.md §3.2): the original cannot COMMIT beginIntroAnimation until the intro textures
// (25 WebP frames + particle.jpg, and the mark model) have loaded, because the R3F Canvas suspends meanwhile. Observable rule:
//   T0 = max(first R timer, intro assets loaded)
// Here: `timerFired` (R), `assetsReady` (set by the scene when its Suspense boundary resolves), `begin` = both.
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';

export const LOADER_DELAY_MS = 1500; // tk.loaderDelay

// ------------------------------------------------------------------------------------------------ intro gate
interface IntroState {
  timerFired: boolean;
  assetsReady: boolean;
  begin: boolean;
  /**
   * true when the intro assets resolved AFTER the 1500 ms timer, i.e. T0 was gated by the assets. In the original the
   * beginIntroAnimation commit then coincides with the scene's Suspense resolution, so the Carousel (created in that
   * same commit) is still null in the handle captured by the T0 effect: the T0 `setOpacity(0)` and the 3.1–3.8 s tile
   * opacity tween are no-ops and the grid appears at full brightness when the occluder passes. MEASURED on the live
   * site in real time (3/3 cold loads: Carousel created in the T0 frame, tile opacity stays 1 —
   * docs/evidence/grid-engine/realtime/fadecheck_orig.json); when the assets are ready first, the fade plays.
   */
  gatedByAssets: boolean;
}
let intro: IntroState = { timerFired: false, assetsReady: false, begin: false, gatedByAssets: false };
const introListeners = new Set<() => void>();
const timers = new Set<ReturnType<typeof setTimeout>>();

function setIntro(patch: Partial<IntroState>) {
  const next = { ...intro, ...patch };
  next.begin = next.timerFired && next.assetsReady;
  if (next.timerFired === intro.timerFired && next.assetsReady === intro.assetsReady && next.begin === intro.begin && next.gatedByAssets === intro.gatedByAssets)
    return;
  intro = next;
  if (typeof window !== 'undefined' && (window as unknown as { __WG_DEBUG__?: boolean }).__WG_DEBUG__) {
    const w = window as unknown as { __introEvents?: unknown[] };
    (w.__introEvents ||= []).push({ t: Math.round(performance.now()), ...next });
  }
  for (const l of introListeners) l();
}

export const introStore = {
  get: () => intro,
  subscribe(l: () => void) {
    introListeners.add(l);
    return () => {
      introListeners.delete(l);
    };
  },
  /** Original `R`: schedule `beginIntroAnimation = true` in 1500 ms. Returns the canceller. */
  scheduleBegin(): () => void {
    const id = setTimeout(() => {
      timers.delete(id);
      setIntro({ timerFired: true });
    }, LOADER_DELAY_MS);
    timers.add(id);
    return () => {
      clearTimeout(id);
      timers.delete(id);
    };
  },
  setAssetsReady() {
    if (intro.assetsReady) return;
    setIntro({ assetsReady: true, gatedByAssets: intro.timerFired });
  },
  /** The original state lives in the WorkGrid root component: reset when the home page unmounts. */
  reset() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    intro = { timerFired: false, assetsReady: false, begin: false, gatedByAssets: false };
    for (const l of introListeners) l();
  },
};

const SERVER_INTRO: IntroState = { timerFired: false, assetsReady: false, begin: false, gatedByAssets: false };
export function useIntro<T>(selector: (s: IntroState) => T): T {
  return useSyncExternalStore(
    introStore.subscribe,
    () => selector(intro),
    () => selector(SERVER_INTRO),
  );
}

// ------------------------------------------------------------------------------------------------ loading progress
// Clone of the original module 21472 (chunks__6828, a drei `useProgress` copy): THREE.DefaultLoadingManager callbacks
// installed when the module is first evaluated; progress restarts for every loading batch:
//   progress = (loaded − i) / (total − i) · 100, with i = total of the last completed batch (… || 100 when complete).
interface ProgressState {
  errors: string[];
  active: boolean;
  progress: number;
  item: string;
  loaded: number;
  total: number;
}
let progress: ProgressState = { errors: [], active: false, progress: 0, item: '', loaded: 0, total: 0 };
const progressListeners = new Set<() => void>();
function setProgress(patch: Partial<ProgressState> | ((s: ProgressState) => Partial<ProgressState>)) {
  const p = typeof patch === 'function' ? patch(progress) : patch;
  progress = { ...progress, ...p };
  for (const l of progressListeners) l();
}
let batchBase = 0;
if (typeof window !== 'undefined') {
  const m = THREE.DefaultLoadingManager;
  m.onStart = (t, r, s) => {
    setProgress({ active: true, item: t, loaded: r, total: s, progress: ((r - batchBase) / (s - batchBase)) * 100 });
  };
  m.onLoad = () => {
    setProgress({ active: false });
  };
  m.onError = (t) => setProgress((e) => ({ errors: [...e.errors, t] }));
  m.onProgress = (t, r, s) => {
    if (r === s) batchBase = s;
    setProgress({ active: true, item: t, loaded: r, total: s, progress: ((r - batchBase) / (s - batchBase)) * 100 || 100 });
  };
}
const SERVER_PROGRESS = 0;
export function useLoadingProgress(): number {
  return useSyncExternalStore(
    (l) => {
      progressListeners.add(l);
      return () => {
        progressListeners.delete(l);
      };
    },
    () => progress.progress,
    () => SERVER_PROGRESS,
  );
}

// ------------------------------------------------------------------------------------------------ frame sets
/**
 * Original selection (tA useMemo, L2931-2969): for each of the 25 frame slots, frame `o` of an independently random set
 * (desktop list and mobile list drawn alternately from Math.random). Test-only override, invisible to users: when
 * `window.__INTRO_SET__ = { desktop?: number[25], mobile?: number[25] }` (1-based set numbers) exists — injected by the
 * Playwright comparison scripts with addInitScript — those sets are used instead, so both sites show the same frames.
 */
export function pickIntroFrames(base: string, desktopSets: number, mobileSets: number, frames: number) {
  const forced = typeof window !== 'undefined' ? (window as unknown as { __INTRO_SET__?: { desktop?: number[]; mobile?: number[] } }).__INTRO_SET__ : undefined;
  const desktop: string[] = [];
  const mobile: string[] = [];
  let i: number | null = null;
  let s: number | null = null;
  let r = 0;
  let n = 0;
  for (let o = 0; o < frames; o++) {
    if (i === null || r >= 1) {
      i = Math.floor(Math.random() * desktopSets);
      r = 0;
    }
    if (s === null || n >= 1) {
      s = Math.floor(Math.random() * mobileSets);
      n = 0;
    }
    const d = forced?.desktop?.[o] ? forced.desktop[o] - 1 : i;
    const m = forced?.mobile?.[o] ? forced.mobile[o] - 1 : s;
    desktop.push(`${base}set${d + 1}/${o}.webp`);
    mobile.push(`${base}mobile/set${m + 1}/${o}.webp`);
    r++;
    n++;
  }
  return { desktop, mobile };
}
