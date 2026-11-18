'use client';
// `about_scrolling_carousel` slice — original module 88724. docs/recon/about.md §7.1
// - Items rendered twice; x = wrap(0, -j, y)% where j = Σ(item.offsetWidth + 10) / track.offsetWidth × 100,
//   measured on mount and on window resize only (fallback -120 when the track has no width).
// - Base speed 2 % of the track width per second, leftwards (direction ref starts at -1).
// - Scroll coupling: g = useTransform(useSpring(useVelocity(scrollY), {damping:100, stiffness:600}), [0,1000], [0,30],
//   {clamp:false}); g < 0 ⇒ direction +1 (rightwards), g > 0 ⇒ -1; speed × (1 + |g|) in the current direction.
//   The update is already time-based (delta / 1000), as in the original.
import { createRef, useEffect, useRef, useState, type RefObject } from 'react';
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity, wrap } from 'framer-motion';
import { FadeIn } from '@/components/ui/FadeIn';
import { mediaUrl } from '@/lib/media';
import { PrismicNextImage } from './images';
import type { AboutSlice, CarouselItem } from './types';
import s from './scrollingCarousel.module.css';

/** module 72452: `video/<extension>` (mp4 fallback). */
function videoType(src?: string) {
  const parts = src?.split('.') || [];
  return `video/${parts[parts.length - 1] || 'mp4'}`;
}

export default function ScrollingCarousel({ slice }: { slice: AboutSlice }) {
  const items = slice.items as CarouselItem[];
  const refs = useRef<RefObject<HTMLDivElement | null>[]>(items.map(() => createRef<HTMLDivElement>()));
  const nodes = items.map((it, i) =>
    it.image && Object.entries(it.image).length !== 0 && it.image.url ? (
      <div className={s.ScrollingCarouselItem} ref={refs.current[i]} key={`image-${i}`}>
        <PrismicNextImage field={it.image} fallbackAlt="" />
      </div>
    ) : it.video_url ? (
      <div className={s.ScrollingCarouselItem} ref={refs.current[i]} key={`video-${i}`}>
        <video autoPlay loop playsInline muted controls={false}>
          <source src={mediaUrl(it.video_url)} type={videoType(`${it.video_url}`)} />
        </video>
      </div>
    ) : undefined,
  );

  const y = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 100, stiffness: 600 });
  const factor = useTransform(smooth, [0, 1000], [0, 30], { clamp: false });
  const trackRef = useRef<HTMLDivElement>(null);
  const [j, setJ] = useState(0);

  useEffect(() => {
    const measure = () => {
      let sum = 0;
      for (const r of refs.current) if (r.current) sum += r.current.offsetWidth + 10;
      const w = trackRef.current?.offsetWidth;
      setJ(w ? (sum / w) * 100 : -120);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [slice.items]);

  const x = useTransform(y, (v) => `${wrap(0, -j, v)}%`);
  const direction = useRef(-1);

  useAnimationFrame((_time, delta) => {
    let r = 2 * direction.current * (delta / 1000);
    const g = factor.get();
    if (g < 0) direction.current = 1;
    else if (g > 0) direction.current = -1;
    r += -direction.current * r * g;
    y.set(y.get() + r);
  });

  useEffect(
    () => () => {
      trackRef.current = null;
      refs.current = [];
    },
    [],
  );

  return (
    <FadeIn>
      <div className={s.ScrollingCarouselContainer} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
        <motion.div className={s.ScrollingCarouselTrack} style={{ x }} ref={trackRef}>
          {nodes}
          {nodes}
        </motion.div>
      </div>
    </FadeIn>
  );
}
