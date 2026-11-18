'use client';
// Original slice `hero_video` (chunk 8547: module 68547 + cursor 86436/44563). docs/recon/project-template.md §6.4.
//   section[data-slice-*][aria-hidden=true] > button[aria-label="Ligar ou desligar o som do vídeo"][tabindex=0] >
//   CursorArea(text "play"|"mute") > div.VideoWrapper (16:9) > <video src loop playsInline><p>{alt}</p></video>
// - mount: load(); `loadeddata` marks it ready
// - ready + muted (initial): muted=true, play(), and a `timeupdate` listener that rewinds to 0 at ≥ 10 s while
//   muted (10-second muted preview loop); setClickOnly(false)
// - click / Enter: toggles; unmuted → currentTime 0, muted=false, play(), setClickOnly(true) (and back to false
//   when it is muted again / unmounted). `has_sound` is not read (as the original).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import type { PrismicData } from '@/lib/types';
import { noHotlink } from '../media';
import { CursorArea } from './CursorArea';
import s from './slices.module.css';

export default function HeroVideo({ slice }: { slice: PrismicData }) {
  const sound = useOptionalSound();
  const setClickOnly = sound?.setClickOnly;
  const ref = useRef<HTMLVideoElement>(null);
  const [unmuted, setUnmuted] = useState(false);
  const [ready, setReady] = useState(false);
  const source = slice.primary?.source;
  const src: string | null = source?.url ? noHotlink(source.url) : null;
  const text = unmuted ? 'silenciar' : 'ouvir';
  const toggle = useCallback(() => setUnmuted(!unmuted), [unmuted]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    if (unmuted) {
      el.currentTime = 0;
      el.muted = false;
      el.onreset = () => {
        el.muted = true;
      };
      void el.play();
    } else {
      el.muted = true;
      void el.play();
      el.addEventListener('timeupdate', () => {
        if (el.muted && el.currentTime >= 10) el.currentTime = 0;
      });
    }
    if (el.muted) setClickOnly?.(false);
    else setClickOnly?.(true);
    return () => {
      if (!el.muted) setClickOnly?.(false);
    };
  }, [unmuted, ready, toggle, setClickOnly]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onReady = () => setReady(true);
    el.load();
    el.addEventListener('loadeddata', onReady, false);
    return () => el.removeEventListener('loadeddata', onReady);
  }, []);

  if (!src) return null;
  return (
    <section data-slice-type={slice.slice_type} data-slice-variation={slice.variation} aria-hidden>
      <button onClick={toggle} onKeyDown={(e) => e.key === 'Enter' && toggle()} tabIndex={0} aria-label="Ligar ou desligar o som do vídeo">
        <CursorArea text={text}>
          <div className={s.VideoWrapper}>
            <video src={src} ref={ref} loop playsInline>
              <p>{slice.primary?.alt}</p>
            </video>
          </div>
        </CursorArea>
      </button>
    </section>
  );
}
