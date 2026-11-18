'use client';
// Olwtelet: sound is ON by default, so the follower no longer turns it on. It says "SOM ATIVADO" while the audio plays
// and "CLIQUE PARA OUVIR O SOM" while the browser still holds it back (any click or key anywhere unlocks it, a click on
// the follower too). Not shown at all to a visitor who turned sound off.
// Intro sound cursor follower (original `eL`, module 55607 L2317-2384) with its 8×3-dot sound icon
// (original module 75744 + styled parts of 72781, chunks__1388). docs/recon/intro-and-chrome.md §8.
// Shown only while beginIntroAnimation && workgridState === 'intro' (T0 → T0+3.2 s). Touch devices never fire
// mousemove, so it stays invisible and unclickable there (as the original).
import gsap from 'gsap';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRunning, useSound } from '@/components/providers/SoundProvider';
import s from './soundInteraction.module.css';

type Frame = number[][];
const ANIMATIONS: Record<'muted' | 'playing' | 'turnOff' | 'turnOn', Frame[]> = {
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
type AnimationName = keyof typeof ANIMATIONS;

/** module 75744 `l`: frame player (setInterval 100 ms; turnOn/turnOff run once then switch to playing/muted). */
function SoundDots({ currentAnimation, setCurrentAnimation }: { currentAnimation: AnimationName; setCurrentAnimation: (a: AnimationName) => void }) {
  const [frame, setFrame] = useState<Frame>(ANIMATIONS[currentAnimation][0]);
  useEffect(() => {
    const n = ANIMATIONS[currentAnimation];
    let i = 0;
    const r = setInterval(() => {
      i = (i + 1) % n.length;
      setFrame(n[i]);
      const last = i === n.length - 1;
      if (currentAnimation !== 'playing' && last) {
        if (r) clearInterval(r);
        switch (currentAnimation) {
          case 'turnOn':
            setCurrentAnimation('playing');
            break;
          case 'turnOff':
            setCurrentAnimation('muted');
        }
      }
    }, 100);
    return () => clearInterval(r);
  }, [currentAnimation, setCurrentAnimation]);
  return (
    <svg width="23" height="8" viewBox="0 0 23 8" fill="none" style={{ scale: '1' }} xmlns="http://www.w3.org/2000/svg">
      {frame.map((row, t) => (
        <Fragment key={t}>
          {row.map((on, n) => (
            <circle key={`${t}${n}`} opacity={on ? 1 : 0.2} cx={1 + 3 * n} cy={1 + 3 * t} r="1" className={s.Circle} />
          ))}
        </Fragment>
      ))}
    </svg>
  );
}

/** module 75744 `c` (export A): `<SoundIcon isMuted>` */
function SoundIcon({ isMuted }: { isMuted: boolean }) {
  const [anim, setAnim] = useState<AnimationName>(isMuted ? 'muted' : 'playing');
  const [prev, setPrev] = useState(isMuted);
  useEffect(() => {
    if (prev && !isMuted) setAnim('turnOn');
    else if (!prev && isMuted) setAnim('turnOff');
    setPrev(isMuted);
  }, [isMuted, prev]);
  return (
    <div className={s.SoundAnimationWrapper}>
      <SoundDots currentAnimation={anim} setCurrentAnimation={setAnim} />
    </div>
  );
}

const CONTENT = { on: 'SOM ATIVADO', off: 'CLIQUE PARA OUVIR O SOM' };
const CURSOR_OFFSET = { x: 5, y: 15 };

export function SoundInteraction() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { enabled, unlock } = useSound();
  const running = useAudioRunning();
  const isMuted = !(enabled && running);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current) return;
      ref.current.style.transform = `translate(${e.clientX - CURSOR_OFFSET.x}px, ${e.clientY - CURSOR_OFFSET.y}px)`;
      if (!visible) setVisible(true);
    },
    [visible],
  );
  // original quirk kept: the listener is registered once with the first `onMove` (deps []), so `visible` stays false
  // in its closure and setVisible(true) is re-requested on every move (a no-op after the first).
  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (visible && ref.current) {
      const el = ref.current;
      gsap.to(el, {
        opacity: 1,
        duration: 0.3,
        ease: 'sine.out',
        onComplete: () => {
          el.style.pointerEvents = 'auto';
        },
      });
    }
  }, [visible]);
  if (!enabled) return null;
  return (
    <div ref={ref} className={s.SoundInteractionWrapper} onClick={unlock}>
      <div className={s.SoundInteractionInner}>
        <SoundIcon isMuted={isMuted} />
        <div className={s.SoundInteractionLabel}>{isMuted ? CONTENT.off : CONTENT.on}</div>
      </div>
    </div>
  );
}

export default SoundInteraction;
