'use client';
// Original module 60307 — hero media of the case study AND media of the "Related work" cards.
//   image → next/image (2000×1000, lazy, default loader q 75: 1x w=2048, 2x w=3840)
//   video / transparent video → <video playsInline loop autoPlay muted><p>{alt}</p></video> with NO src in the
//   markup; on mount: src = (Safari && transparent video && altSrc) ? altSrc : src, load(), play() once on
//   `loadeddata`. No poster, no controls.
import { useEffect, useRef } from 'react';
import { isSafari, nextImage2000, noHotlink } from './media';

export interface MediaElementProps {
  type: string;
  src: string;
  altSrc: string | null;
  alt: string;
}

/** CaseStudy `F` / card `m` media selection (hero[0]): null without a media_type or a filled media link. */
export function heroMediaProps(hero: { media_type?: string | null; media?: { url?: string }; alternate_media?: { url?: string }; alt_tag?: string | null } | undefined | null): MediaElementProps | null {
  if (!hero || !hero.media_type) return null;
  const src = hero.media?.url ? hero.media.url : null;
  const altSrc = hero.alternate_media?.url ? hero.alternate_media.url : null;
  return src ? { type: hero.media_type, src, altSrc, alt: hero.alt_tag || 'hero image' } : null;
}

export function MediaElement({ type, src, altSrc, alt }: MediaElementProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const isVideo = type !== 'image';
  useEffect(() => {
    const el = ref.current;
    if (!isVideo || !el) return;
    // A file missing upstream (zedd's Safari alternate `zedd-in-the-park-header.webm`, 404 on the origin) is requested
    // like on the original; its local path answers an empty 200 (app/remote/[...path]/route.ts), so the video fails
    // with MediaError 4 silently, leaving the same empty hero box, as the original's ORB-blocked request (project.md D3).
    const chosen = isSafari() && type === 'transparent video' && altSrc ? altSrc : src;
    if (!chosen) return;
    el.src = noHotlink(chosen);
    el.load();
    el.addEventListener(
      'loadeddata',
      () => {
        void ref.current?.play();
      },
      { once: true },
    );
  }, [isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isVideo)
    return (
      <video playsInline loop autoPlay muted ref={ref}>
        <p>{alt}</p>
      </video>
    );
  const img = nextImage2000(noHotlink(src));
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} loading="lazy" width={2000} height={1000} decoding="async" data-nimg="1" style={{ color: 'transparent' }} srcSet={img.srcSet} src={img.src} />;
}
