'use client';
// Sound system: original AudioProvider (module 68262) + the route/background logic and "Interaction" playback
// modulation that the original keeps inside the header Sound toggle (module 38893 `O` / `N`).
// docs/recon/intro-and-chrome.md §9.
//
//   const { enabled, toggle, playClip } = useSound();      // anywhere under the provider
//   useSoundToggle();                                       // call ONCE from the header Sound toggle component:
//                                                           // it runs the background-track effects exactly while
//                                                           // the toggle is mounted (as in the original)
//   useAudioRunning();                                      // true while the AudioContext is actually running
//
// Olwtelet (owner's choice): sound is ON by default. State machine:
//   enabled   the visitor's choice: true unless they turned it off (saved as 'olwtelet:sound', src/lib/soundPref.ts);
//             navigation never changes it.
//   running   AudioContext.state === 'running'. The browser may keep it suspended until the first user activation;
//             any click, tap (pointerup / touchend) or key unlocks it (capture listeners below), so the visitor never
//             has to find the Sound toggle. No browser flag is needed or used.
//   master    1 while enabled && !clickOnly && the tab is visible, else 0 (0.5 s fade; immediate on hide).
//   loop      the route's background track plays while enabled && !clickOnly and the context has run at least once
//             (nothing is queued on a suspended context, so nothing bursts out at unlock). Effects are dropped while
//             the context is suspended for the same reason.
// One AudioContext per document: `audioEngine` is a module singleton and init() is idempotent.
import gsap from 'gsap';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { readSoundPref, writeSoundPref } from '@/lib/soundPref';
import { ROUTES } from '@/lib/theme';
import { AudioEngine, audioEngine, CLIPS, type ClipName, type ClipNodes } from './audioEngine';

export type AudioInteractionMode = 'drag' | 'scroll';
type BgNodes = ClipNodes & { name: ClipName };

export interface SoundContextValue {
  /** the visitor's choice: sound ON (label "Som [LIG]"); true unless they turned it off */
  enabled: boolean;
  /** Sound toggle: flips `enabled` and saves the choice */
  toggle: () => void;
  /** resume a suspended AudioContext (call inside a user-activation handler) */
  unlock: () => void;
  /** play an effect/background clip once; resolves with the node graph (null when no AudioContext yet) */
  playClip: (name: ClipName) => Promise<ClipNodes | null>;
  /** force a background loop (or stop it with null); normally chosen from the route by useSoundToggle() */
  setBackground: (name: ClipName | null) => void;
  /** original `clickOnly`: true (e.g. a case-study video playing with sound) stops the loop and mutes the master */
  setClickOnly: (v: boolean) => void;
  clickOnly: boolean;
  audioInteractionMode: AudioInteractionMode;
  setAudioInteractionMode: (m: AudioInteractionMode) => void;
  /** @internal used by useSoundToggle */
  _internal: SoundInternals;
}

interface SoundInternals {
  engine: AudioEngine;
  bgRef: MutableRefObject<BgNodes | null>;
  lastBg: ClipName;
  setLastBg: (n: ClipName) => void;
  /** the loop requested and still loading (it counts as the current one) */
  pending: MutableRefObject<{ name: ClipName; gen: number } | null>;
  switchTo: (n: ClipName | null) => Promise<void>;
}

const SoundContext = createContext<SoundContextValue | null>(null);

const FADE_OUT_BG = { value: 0, duration: 0.2, ease: 'sine.out' }; // M
const WET_OFF = { value: 0, duration: 0.3, delay: 0.3, ease: 'sine.out' }; // H
const DRY_ON = { value: 1, duration: 0.3, delay: 0.3, ease: 'sine.out' }; // Y
const BG_RAMP = { duration: 2, ease: 'sine.out' }; // G (on the dangling gain: inaudible)
const LP_CONTACT = { value: 300, duration: 0.5, ease: 'sine.out' }; // B
const LP_OPEN = { value: 1e4, duration: 2, ease: 'sine.in' }; // F
const RATE_TWEEN = { duration: 0.3, ease: 'sine.out' }; // I / j / D

function stopBackground(nodes: BgNodes): Promise<void> {
  return new Promise((resolve) => {
    nodes.source.addEventListener('ended', () => nodes.source.disconnect(), { once: true });
    gsap.to(nodes.wetGain.gain, WET_OFF);
    gsap.to(nodes.dryGain.gain, DRY_ON);
    gsap.to(nodes.gain.gain, {
      ...FADE_OUT_BG,
      onComplete: () => {
        try {
          nodes.source.stop();
        } catch {}
        resolve();
      },
    });
  });
}

/** true while the AudioContext is running (React external store: re-renders only its readers) */
export function useAudioRunning(): boolean {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.isRunning, () => false);
}

/** true once the AudioContext has run at least once in this document */
export function useAudioEverRan(): boolean {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.hasEverRun, () => false);
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const engine = audioEngine;
  const [hidden, setHidden] = useState(false);
  const [clickOnly, setClickOnly] = useState(false);
  const [clipsReady, setClipsReady] = useState(false);
  // kept: the original's bubble-phase window click sets this state (render order of the first click, REPORT.md A2)
  const [, setUserClicked] = useState(false);
  const [audioInteractionMode, setAudioInteractionMode] = useState<AudioInteractionMode>('drag');
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const [lastBg, setLastBg] = useState<ClipName>('grid');
  const bgRef = useRef<BgNodes | null>(null);
  // every loop request (and every stop) takes a new number: a loop still decoding when a newer request or an OFF
  // arrives is dropped instead of attaching late
  const bgGen = useRef(0);
  // the loop on its way (requested, still loading). Olwtelet: replaces the original's `switching` state, which made the
  // route effect ignore every request while a loop was loading and retry only on a later re-render. On /about/studio
  // that re-render can be held back for seconds (the team canvas suspends the page's default-priority renders until its
  // texture loads), so the previous page's loop played there, or nothing after OFF/ON. Now a request for another loop
  // always supersedes the one in flight (bgGen); a repeated request for the same loop is ignored.
  const pending = useRef<{ name: ClipName; gen: number } | null>(null);
  const toggleReleased = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // master gain: (hidden || !enabled || clickOnly) ? mute : unmute — once clips are "ready"
  useEffect(() => {
    if (!clipsReady) return;
    if (hidden || !enabled || clickOnly) engine.mute();
    else engine.unmute();
  }, [hidden, enabled, clickOnly, clipsReady, engine]);

  // mount: saved choice, AudioContext (as the original, created here so its cost lands in page load, not inside the
  // first navigation click: audit 2026-11-06), the 5 effects, unlock listeners and visibility.
  useEffect(() => {
    if (readSoundPref() === 'off') {
      enabledRef.current = false;
      setEnabled(false);
    }
    setHidden(document.visibilityState === 'hidden');
    for (const c of Object.values(CLIPS)) if (c.type === 'effect') void engine.prefetch(c);
    try {
      engine.init();
      engine.decodeAll();
    } catch (e) {
      console.warn('AudioContext unavailable at mount', e);
    }
    setClipsReady(true); // original: Promise.all over undefined ⇒ resolves immediately
    // the current route's loop: bytes only, a little later, so it can start right after the unlock
    const prefetchLoop = window.setTimeout(() => {
      const path = window.location.pathname;
      const name = path.includes(ROUTES.projects) ? 'project' : path.includes(ROUTES.about) ? 'other' : 'grid';
      void engine.prefetch(CLIPS[name]);
    }, 4000);
    // Unlock on the first user activation anywhere: capture phase, before the page's own handlers (the home grid's
    // canvas calls preventDefault on touchend, which suppresses the click that the original relied on). Only events
    // that carry user activation: pointerup / touchend / click / keydown (not Escape). Not pointerdown: with a mouse
    // the click would come 60–150 ms later and a click that turns sound OFF would let the loop be heard meanwhile.
    // No setState here (the click-task render order stays as it was).
    const onActivation = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Escape') return;
      if (!enabledRef.current) return; // a visitor who turned sound off: nothing to resume (the toggle unlocks itself)
      if (!engine.context) {
        engine.init();
        engine.decodeAll();
      }
      engine.unlock();
    };
    const ACTIVATION = ['pointerup', 'touchend', 'click', 'keydown'] as const;
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    for (const t of ACTIVATION) window.addEventListener(t, onActivation, opts);
    // original: window click (BUBBLE phase) → setUserClicked
    const onClick = () => {
      if (engine.context) setUserClicked(true);
    };
    // muted at once when the tab is hidden; the master effect fades it back in when it is visible again
    const onVisibility = () => {
      const h = document.visibilityState === 'hidden';
      if (h) engine.mute(true);
      setHidden(h);
    };
    window.addEventListener('click', onClick);
    window.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(prefetchLoop);
      for (const t of ACTIVATION) window.removeEventListener(t, onActivation, opts);
      window.removeEventListener('click', onClick);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, [engine]);

  // No store mirror: the original's AudioProvider (module 68262) keeps this state in the sound context only and never
  // imports the app store; a mirror would notify every store subscriber on each change (the store notifies as zustand).

  const playClip = useCallback((name: ClipName) => engine.playClip(CLIPS[name]), [engine]);

  // a loop being faded out is detached at once, so turning sound off and on again quickly starts a fresh loop
  const detachCurrent = useCallback(async () => {
    const old = bgRef.current;
    if (!old) return;
    bgRef.current = null;
    setLastBg(old.name);
    await stopBackground(old);
  }, []);

  const setBackground = useCallback(
    async (name: ClipName | null) => {
      if (name !== null && pending.current?.name === name) return; // already on its way
      const gen = ++bgGen.current;
      pending.current = null;
      if (name === null) {
        await detachCurrent();
        return;
      }
      if (bgRef.current && bgRef.current.name === name) {
        gsap.to(bgRef.current.wetGain.gain, WET_OFF);
        gsap.to(bgRef.current.dryGain.gain, DRY_ON);
        return;
      }
      pending.current = { name, gen };
      if (bgRef.current) await detachCurrent();
      const stale = () => gen !== bgGen.current || !enabledRef.current;
      if (!bgRef.current && !stale()) {
        setAudioInteractionMode(CLIPS[name].name === 'grid' ? 'drag' : 'scroll');
        const nodes = await engine.playClip(CLIPS[name]);
        if (nodes) {
          // a newer request, an OFF or a stop arrived while this loop was decoding, or another loop attached first:
          // drop this one (one loop at most, never one the visitor turned off)
          if (bgRef.current || stale()) {
            try {
              nodes.source.stop();
            } catch {}
            nodes.source.disconnect();
          } else {
            nodes.source.loop = true;
            const target = nodes.gain.gain.value;
            nodes.gain.gain.value = 0;
            nodes.source.connect(nodes.filter);
            nodes.filter.connect(nodes.gain); // dangling gain (original): the 2 s ramp has no audible effect
            // the contact low-pass from the start when the loop begins on /contact (the route effect ran before)
            if (window.location.pathname === ROUTES.contact) nodes.filter.frequency.value = LP_CONTACT.value;
            bgRef.current = { ...nodes, name };
            gsap.to(nodes.gain.gain, { ...BG_RAMP, value: target });
          }
        }
      }
      if (pending.current?.gen === gen) pending.current = null;
    },
    [engine, detachCurrent],
  );

  const toggle = useCallback(() => {
    // While the browser still holds the audio back (sound ON but never heard in this document), activating the Sound
    // control releases it rather than turning sound off: a visitor who presses it at that point wants to hear it (the
    // label already says ON). Once the audio has played, the control toggles as usual.
    // (once: if the browser refuses, or has no Web Audio, the next press turns sound off as usual)
    if (enabledRef.current && !engine.everRan && engine.context && !toggleReleased.current) {
      toggleReleased.current = true;
      engine.unlock();
      return;
    }
    const next = !enabledRef.current;
    enabledRef.current = next;
    // turning sound ON is itself a user activation: resume here (the capture listener skipped it while OFF). Turning
    // it OFF fades the master out (effect above) and drops any loop still decoding (bgGen).
    if (next) engine.unlock();
    else {
      bgGen.current++;
      pending.current = null;
    }
    setEnabled(next);
    writeSoundPref(next);
  }, [engine]);

  const unlock = useCallback(() => engine.unlock(), [engine]);

  const value: SoundContextValue = {
    enabled,
    toggle,
    unlock,
    playClip,
    setBackground: (n) => void setBackground(n),
    setClickOnly,
    clickOnly,
    audioInteractionMode,
    setAudioInteractionMode,
    _internal: { engine, bgRef, lastBg, setLastBg, pending, switchTo: setBackground },
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used inside <SoundProvider>');
  return ctx;
}

/** Same as useSound but returns null outside the provider (for components that may render in isolation). */
export function useOptionalSound(): SoundContextValue | null {
  return useContext(SoundContext);
}

/** Background track for a target path (module 38893 `L`); `null` = keep whatever plays. */
export function backgroundTrackFor(target: string, hasCurrent: boolean, lastBg: ClipName): ClipName | null {
  if (target.includes(ROUTES.projects)) return 'project';
  if (target.includes(ROUTES.about)) return 'other';
  // Olwtelet: /index is the home too (next.config rewrite; the URL stays /index)
  if (target === ROUTES.home || target === '/index') return 'grid';
  if (hasCurrent) return null;
  // contact and, Olwtelet, every other page (privacy policy, 404): with nothing playing yet (a direct load) the last loop
  // heard, the home's by default. The original did this only for /contact, so a direct load of the privacy policy stayed
  // silent while the control said ON (sound is now ON by default).
  return lastBg;
}

/**
 * Bind the header Sound toggle: route-driven background loops, contact low-pass, intro auto-enable and the
 * drag/scroll playback-rate + reverb modulation. Returns `{ enabled, toggle }` for the widget.
 */
export function useSoundToggle() {
  const sound = useSound();
  const { bgRef, lastBg, pending, switchTo } = sound._internal;
  const { enabled, clickOnly, audioInteractionMode } = sound;
  const everRan = useAudioEverRan();
  const pathname = usePathname() || '/';
  const transition = useAppStore((s) => s.transition);

  const pickTrack = useCallback(() => {
    const target = transition?.to || pathname;
    // a loop still loading is the current one: the contact, privacy and 404 pages keep it instead of replacing it with
    // the last loop heard
    const track = backgroundTrackFor(target, !!bgRef.current || !!pending.current, lastBg);
    if (track) void switchTo(track);
  }, [transition, pathname, bgRef, pending, lastBg, switchTo]);

  // the header never unmounts in practice; if it does, its loop stops with it (one loop per document at most)
  useEffect(
    () => () => {
      const bg = bgRef.current;
      bgRef.current = null;
      if (bg) {
        try {
          bg.source.stop();
        } catch {}
      }
    },
    [bgRef],
  );

  // route loop: only while enabled && !clickOnly, and only once the context has actually run (a loop started on a
  // suspended context would be queued and burst out at the unlock)
  useEffect(() => {
    if (transition?.to === pathname) return;
    if (!enabled || clickOnly) void switchTo(null);
    else if (everRan) pickTrack();
  }, [enabled, clickOnly, everRan, transition, pathname, pickTrack, switchTo]);

  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    // Olwtelet: overwrite — the 2 s opening tween of the previous page kept running after the 0.5 s contact one and
    // took the filter back to 10 kHz behind the modal
    gsap.to(bg.filter.frequency, { ...(pathname === ROUTES.contact ? LP_CONTACT : LP_OPEN), overwrite: true });
  }, [pathname, bgRef]);

  useInteraction(bgRef, audioInteractionMode);

  return { enabled, toggle: sound.toggle };
}

/** Header "Interaction" (module 38893 `N`): playback-rate drag/wheel modulation + scroll reverb. */
function useInteraction(bgRef: MutableRefObject<BgNodes | null>, mode: AudioInteractionMode) {
  const [dragging, setDragging] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDist = useRef(1);
  const lastTouchY = useRef<number | null>(null);

  useEffect(() => {
    const onDown = (e: Event) => {
      if (mode === 'scroll') return;
      if (!(e.target instanceof HTMLCanvasElement)) return;
      timer.current = setTimeout(() => {
        setDragging(true);
        if (bgRef.current) gsap.to(bgRef.current.source.playbackRate, { ...RATE_TWEEN, value: 1 - lastDist.current });
      }, 100);
    };
    const onUp = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      setDragging(false);
      if (bgRef.current) gsap.to(bgRef.current.source.playbackRate, { value: 1, ...RATE_TWEEN });
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (mode === 'scroll') return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(cx * cx + cy * cy);
      if (dragging && bgRef.current) gsap.to(bgRef.current.source.playbackRate, { ...RATE_TWEEN, value: 1 - d });
      else lastDist.current = d;
    };
    const setReverb = (v: number) => {
      const bg = bgRef.current;
      if (!bg) return;
      const r = Math.min(1, Math.max(0, v));
      gsap.to(bg.wetGain.gain, { ...RATE_TWEEN, value: r });
      gsap.to(bg.dryGain.gain, { ...RATE_TWEEN, value: 1 - r });
    };
    const onScroll = () => {
      // Original quirk kept: its scroll handler is a useCallback with deps [ref] only, so it captured the
      // initial "scroll" mode forever — the scroll reverb therefore applies in drag mode too.
      if (!bgRef.current) return;
      const de = document.documentElement;
      const p = (de.scrollTop || document.body.scrollTop) / ((de.scrollHeight || document.body.scrollHeight) - (de.clientHeight || window.innerHeight));
      if (p < 0.3) return;
      const n = (p - 0.3) / 0.7;
      if (Number.isFinite(n)) setReverb(n);
    };
    const onWheel = (e: WheelEvent) => {
      if (mode === 'drag' || !bgRef.current) return;
      const n = Math.min(1, Math.max(0, Math.abs(e.deltaY) / 100));
      gsap.to(bgRef.current.source.playbackRate, { ...RATE_TWEEN, value: 1 + 0.3 * n }); // never reset (original bug)
    };
    const onTouchMove = (e: TouchEvent) => {
      if (mode === 'drag' || !bgRef.current) return;
      const y = e.touches[0].clientY;
      if (lastTouchY.current === null) {
        lastTouchY.current = y;
        return;
      }
      const dy = lastTouchY.current - y;
      lastTouchY.current = y;
      const n = Math.min(1, Math.max(0, Math.abs(dy) / 100));
      gsap.to(bgRef.current.source.playbackRate, { ...RATE_TWEEN, value: 1 + 0.3 * n });
    };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchstart', onDown, opts);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchmove', onMove, opts);
    window.addEventListener('wheel', onWheel, opts);
    window.addEventListener('scroll', onScroll, opts);
    window.addEventListener('touchmove', onTouchMove, opts);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [mode, dragging, bgRef]);
}

export default SoundProvider;
