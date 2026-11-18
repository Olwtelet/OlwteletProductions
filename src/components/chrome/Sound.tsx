'use client';
// Header Sound toggle — original module 38893 `O` (widget) + chunk 1388 modules 72781 (styled parts) and 75744
// (dot-matrix icon). docs/recon/intro-and-chrome.md §9.5, design-system.md §4.3.
//
// - motion.div with role="button" (Olwtelet: focusable, Enter/Space), the whole block is the click target.
// - Olwtelet: default ON, the visitor's choice is saved (src/lib/soundPref.ts). All audio logic lives in
//   useSoundToggle() (called exactly once, here), which reproduces the original route loops / contact low-pass /
//   interaction modulation.
// - Icon: 3×8 dots, "on" opacity 1 / "off" 0.2, frames advance every 100 ms; turnOn (5) → playing (6, loop),
//   turnOff (7) → muted. The interval first moves to index 1, so frame 0 of a list is only the initial state.
import { motion } from 'framer-motion';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAudioRunning, useSoundToggle } from '@/components/providers/SoundProvider';
import { CHROME_DELAY } from '@/components/ui/motion';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { EASE_UO } from '@/lib/easings';
import s from './sound.module.css';

type Frame = number[][];
type AnimationName = 'playing' | 'muted' | 'turnOn' | 'turnOff';

/** Verbatim frames (chunk 1388 module 75744; also docs/recon/svg/ds-sound-dots-frames.json). */
export const SOUND_FRAMES: Record<AnimationName, Frame[]> = {
  muted: [
    [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  ],
  playing: [
    [
      [0, 0, 1, 1, 0, 0, 0, 0],
      [0, 1, 0, 0, 1, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 1, 0],
    ],
    [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [1, 1, 0, 0, 0, 0, 1, 1],
    ],
    [
      [0, 0, 0, 0, 1, 1, 0, 0],
      [1, 0, 0, 1, 0, 0, 1, 0],
      [0, 1, 1, 0, 0, 0, 0, 1],
    ],
    [
      [1, 0, 0, 0, 0, 1, 1, 0],
      [0, 1, 0, 0, 1, 0, 0, 1],
      [0, 0, 1, 1, 0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0, 0, 0, 1, 1],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0, 0, 1, 0],
      [0, 0, 0, 0, 1, 1, 0, 0],
    ],
  ],
  turnOff: [
    [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 0, 0, 1],
    ],
    [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [1, 1, 0, 0, 0, 0, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  ],
  turnOn: [
    [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0, 0, 0, 1, 1],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
    ],
  ],
};
export const SOUND_FRAME_MS = 100;

/** module 75744 `l`: frame player */
function SoundDots({ currentAnimation, setCurrentAnimation }: { currentAnimation: AnimationName; setCurrentAnimation: (a: AnimationName) => void }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [frame, setFrame] = useState<Frame>(SOUND_FRAMES[currentAnimation][0]);
  useEffect(() => {
    const frames = SOUND_FRAMES[currentAnimation];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % frames.length;
      setFrame(frames[i]);
      const last = i === frames.length - 1;
      if (currentAnimation !== 'playing' && last) {
        clearInterval(id);
        if (currentAnimation === 'turnOn') setCurrentAnimation('playing');
        else if (currentAnimation === 'turnOff') setCurrentAnimation('muted');
      }
    }, SOUND_FRAME_MS);
    return () => clearInterval(id);
  }, [currentAnimation, setCurrentAnimation]);
  return (
    <svg width="23" height="8" viewBox="0 0 23 8" fill="none" style={{ scale: '1' }} xmlns="http://www.w3.org/2000/svg" ref={ref}>
      {frame.map((row, y) => (
        <Fragment key={y}>
          {row.map((on, x) => (
            <circle key={`${y}${x}`} className={s.Circle} opacity={on ? 1 : 0.2} cx={1 + 3 * x} cy={1 + 3 * y} r="1" />
          ))}
        </Fragment>
      ))}
    </svg>
  );
}

/** module 75744 `c`: muted ⇄ playing state machine */
export function SoundIcon({ isMuted }: { isMuted: boolean }) {
  const [current, setCurrent] = useState<AnimationName>(isMuted ? 'muted' : 'playing');
  // Olwtelet: the previous value lives in a ref and the transition is chosen in the same commit as the change. The
  // original kept it in state updated by a passive effect; when the page's default-priority renders are held back (the
  // /about/studio team canvas suspends them until its texture loads), a quick OFF → ON reordered those updates and the
  // icon settled on "muted" while the loop played.
  const prevMuted = useRef(isMuted);
  useLayoutEffect(() => {
    if (prevMuted.current === isMuted) return;
    prevMuted.current = isMuted;
    setCurrent(isMuted ? 'turnOff' : 'turnOn');
  }, [isMuted]);
  return (
    // decorative (the control's name is "Som", its state aria-pressed)
    <div className={s.SoundAnimationWrapper} aria-hidden="true">
      <SoundDots currentAnimation={current} setCurrentAnimation={setCurrent} />
    </div>
  );
}

/** Header widget (module 38893 `O`). Its own motion props (the `{...v.BU}` spread by the header is ignored by `O`). */
export default function Sound() {
  const { enabled, toggle } = useSoundToggle();
  // Olwtelet: the label shows the visitor's choice ("Som [LIG]" by default); the dot icon shows what is heard
  // (enabled AND the AudioContext running), so it plays its turnOn frames when the browser releases the audio.
  const running = useAudioRunning();
  const audible = enabled && running;
  // The icon starts muted and syncs after mount (the original's first-mount sequence: muted, then turnOn).
  const [isMuted, setIsMuted] = useState(true);
  const mounted = useRef(false);
  // later changes (clicks, unlock): same frame
  useLayoutEffect(() => {
    if (mounted.current) setIsMuted(!audible);
  }, [audible]);
  // first sync after mount: a passive effect, as the original `useEffect(() => { r && v(false) }, [r])`
  useEffect(() => {
    mounted.current = true;
    setIsMuted(!audible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Olwtelet: a real control (the replica's div had no keyboard access); audio can now play without a click, so it
  // must be possible to stop it from the keyboard too (WCAG 1.4.2)
  return (
    <motion.div
      className={s.Sound}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: CHROME_DELAY, ease: EASE_UO }}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // a held key repeats keydown: one toggle per press (it would otherwise flap and save an arbitrary state)
          if (!e.repeat) toggle();
        }
      }}
      role="button"
      tabIndex={0}
      // a toggle: a fixed name and its state in aria-pressed (pressed = sound on)
      aria-pressed={enabled}
      aria-label="Som"
    >
      <SoundIcon isMuted={isMuted} />
      <div className={cx(s.SoundLabel, typography.MonoDetail)} aria-hidden="true">
        {enabled ? 'Som [LIG]' : 'Som [DESL]'}
      </div>
    </motion.div>
  );
}
