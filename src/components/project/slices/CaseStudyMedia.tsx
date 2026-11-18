'use client';
// Original slice `case_study_media` (chunk 9756: modules 69756, 26641 LazyVideo, 6250 useIntersectionObserver,
// 72452 mime type). docs/recon/project-template.md §6.1.
//   section.Section[data-slice-type][data-slice-variation] > div.Container(+Double when > 3 items) >
//     div.MediaContainer per item: "image" → plain <img alt src> (no lazy loading, full original);
//     "video" (with a source) → LazyVideo; any other type → the MediaContainer stays empty.
// LazyVideo: <link rel=preload as=image href=poster> + <video width height poster preload=metadata loop
//   playsInline muted controls=false><source type=video/ext></video>. The src is assigned once an
//   IntersectionObserver (rootMargin 500px, threshold 0) reports the wrapper intersecting AND window.scrollY > 0
//   (so videos never load at scrollY 0); autoplay is switched on at the same time.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PrismicData } from '@/lib/types';
import { cx } from '@/lib/cx';
import { noHotlink, videoMimeType, videoPoster } from '../media';
import s from './slices.module.css';

/** module 6250 */
function useIntersectionObserver(options: IntersectionObserverInit) {
  const [isIntersecting, setIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && window.scrollY > 0) setIntersecting(entry.isIntersecting);
      },
      { rootMargin: '200px', threshold: 0, ...options },
    );
    io.observe(el);
    return () => {
      io.unobserve(el);
    };
  }, [options]);
  return { ref, isIntersecting };
}

const LAZY_OPTIONS: IntersectionObserverInit = { rootMargin: '500px' };

/** module 26641 */
export function LazyVideo({
  src,
  width,
  height,
  autoPlay = false,
  loop = false,
  controls = true,
  poster: resolvedPoster,
}: {
  src: string;
  width: string;
  height: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  /** poster resolved on the server from the original video URL (posters.ts, local path; files missing upstream get an empty 200 from app/remote/[...path]); undefined = derive */
  poster?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const { ref, isIntersecting } = useIntersectionObserver(LAZY_OPTIONS);
  const [loaded, setLoaded] = useState(false);
  const poster = useMemo(() => (resolvedPoster !== undefined ? resolvedPoster : noHotlink(videoPoster(src))), [src, resolvedPoster]);
  useEffect(() => {
    if (isIntersecting && !loaded && video.current) {
      setLoaded(true);
      video.current.src = src;
      video.current.load();
    }
  }, [isIntersecting, loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} className={s.LazyVideoWrapper} style={{ width, height }}>
      {poster && <link rel="preload" href={poster} as="image" />}
      <video ref={video} width={width} height={height} poster={poster || undefined} preload="metadata" autoPlay={loaded && autoPlay} loop={loop} controls={controls} playsInline muted>
        <source type={videoMimeType(src)} />
      </video>
    </div>
  );
}

export default function CaseStudyMedia({ slice }: { slice: PrismicData }) {
  const items: Array<{ source?: string; alt?: string | null; type?: string | null; poster?: string }> = (slice.primary?.Media || []).map(
    ({ source, alt, type, poster }: PrismicData) => ({ source: source?.url, alt, type, poster }),
  );
  return (
    <section className={s.CsmSection} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      <div className={cx(s.CsmContainer, items.length > 3 && s.CsmContainer__Double)}>
        {items.map((item, i) => (
          <div key={i} className={s.MediaContainer}>
            {item.type === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={item.alt || ''} src={item.source ? noHotlink(item.source) : undefined} />
            )}
            {item.type === 'video' && item.source && (
              <LazyVideo src={noHotlink(item.source)} poster={item.poster} width="100%" height="100%" autoPlay loop controls={false} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
