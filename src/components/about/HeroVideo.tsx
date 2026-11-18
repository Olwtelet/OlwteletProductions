'use client';
// `hero_video` slice — original module 68547. docs/recon/about.md §7.2
// - The <video> (no autoplay attribute) is load()ed on mount; on `loadeddata` it is "ready".
// - Ready + sound off: muted, play(), and a `timeupdate` listener loops the first 10 s while muted (one more
//   listener per toggle, as in the original).
// - Sound on (click / Enter): restart from 0 unmuted and `setClickOnly(true)` (global loop → click-only);
//   the cleanup of the previous run calls `setClickOnly(false)` when the video was unmuted.
// - The whole slice is a <button aria-label="Ligar ou desligar o som do vídeo"> inside an aria-hidden <section>; the circular
//   cursor reads "play" / "mute".
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { mediaUrl } from '@/lib/media';
import { CursorContainer } from './CursorContainer';
import type { AboutSlice, PrismicLink } from './types';
import s from './heroVideo.module.css';

export default function HeroVideo({ slice }: { slice: AboutSlice }) {
  const sound = useOptionalSound();
  const setClickOnly = sound?.setClickOnly;
  const ref = useRef<HTMLVideoElement | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [ready, setReady] = useState(false);
  const source = slice.primary.source as PrismicLink | undefined;
  const src = source && source.link_type !== 'Any' && source.url ? source.url : null;
  const text = soundOn ? 'silenciar' : 'ouvir';
  const toggle = useCallback(() => {
    setSoundOn(!soundOn);
  }, [soundOn]);

  useEffect(() => {
    if (!ref.current || !ready) return;
    const e = ref.current;
    if (soundOn) {
      e.currentTime = 0;
      e.muted = false;
      // original: `e.onreset = () => { e.muted = true }` (HTMLMediaElement has no reset event — dead code)
      (e as HTMLVideoElement & { onreset: (() => void) | null }).onreset = () => {
        e.muted = true;
      };
      void e.play();
    } else {
      e.muted = true;
      void e.play();
      e.addEventListener('timeupdate', () => {
        if (e.muted && e.currentTime >= 10) e.currentTime = 0;
      });
    }
    if (e.muted) setClickOnly?.(false);
    else setClickOnly?.(true);
    e.removeEventListener('timeupdate', toggle);
    return () => {
      if (!e.muted) setClickOnly?.(false);
    };
  }, [soundOn, ready, toggle, setClickOnly]);

  useEffect(() => {
    if (!ref.current) return;
    const e = ref.current;
    const onLoaded = () => setReady(true);
    e.load();
    e.addEventListener('loadeddata', onLoaded, false);
    return () => {
      // original removes the listener from `window` (bug) — the element listener stays; harmless after unmount
      removeEventListener('loadeddata', onLoaded);
      ref.current = null;
    };
  }, []);

  if (!src) return null;
  return (
    <section data-slice-type={slice.slice_type} data-slice-variation={slice.variation} aria-hidden>
      <button onClick={toggle} onKeyDown={(ev) => ev.key === 'Enter' && toggle()} tabIndex={0} aria-label="Ligar ou desligar o som do vídeo">
        <CursorContainer text={text}>
          <div className={s.VideoWrapper}>
            <video src={mediaUrl(src)} ref={ref} loop playsInline>
              <p>{slice.primary.alt as string | null}</p>
            </video>
          </div>
        </CursorContainer>
      </button>
    </section>
  );
}
