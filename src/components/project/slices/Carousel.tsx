'use client';
// Original slice `carousel` (chunk 7021: modules 67021, 48195 ImageItem, 20047 index/file names, 61347 mobile
// buttons, 36222 FadeIn, 86436/44563 cursor). docs/recon/project-template.md §6.2.
//
// FadeIn > section.Section[data-slice-*] > CursorArea(text "prev"|"next") > div.layout_Wrapper.Container >
//   [ div.ImageContainer (flex track: width = wrapper.clientWidth × n, transform translateX(0%)),
//     div.MobileButtons (prev/next, <599 px), div.layout_Grid.IndexRow.MonoDetail (odometer index, file names) ]
//
// Quirks reproduced (MEASURED on the original, §6.2 / §15):
//  - THE TRACK NEVER SLIDES. The original nulls both refs in a mount effect, so the width/transform effects only
//    ever run once (at mount): the track keeps `width:<mount width × n>px; transform:translateX(0%)` forever
//    (also after a window resize). Clicking only moves the "Current" class: the visible slide (item 0) dims to
//    opacity .2 / scale .9 while the new current slide stays clipped off-screen.
//  - `extendedMagrin` maps to a CSS class that does not exist → renders exactly like `default`.
//  - The cursor overlay sits above the mobile prev/next buttons: taps reach the overlay (direction = last
//    pointer x, from window mousemove).
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';
import { layout } from '@/components/ui/layout';
import { typography } from '@/components/ui/typography';
import { EASE_O7 } from '@/lib/easings';
import { cx } from '@/lib/cx';
import type { PrismicData } from '@/lib/types';
import { prismicNextImage } from '../media';
import { CursorArea } from './CursorArea';
import s from './slices.module.css';

export const CursorAction = { LEFT: 'left', RIGHT: 'right' } as const;
type Direction = (typeof CursorAction)[keyof typeof CursorAction];

/** module 48195 item: PrismicNextImage(field, alt="") */
function ImageItem({ isCurrent, image }: { isCurrent: boolean; image: PrismicData }) {
  const url: string | undefined = image?.url;
  if (!url)
    return <div className={cx(s.CarouselImageItem, isCurrent && s.CarouselImageItem_Current)} />;
  const img = prismicNextImage(url);
  return (
    <div className={cx(s.CarouselImageItem, isCurrent && s.CarouselImageItem_Current)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        loading="lazy"
        width={image.dimensions?.width}
        height={image.dimensions?.height}
        decoding="async"
        data-nimg="1"
        style={{ color: 'transparent' }}
        srcSet={img.srcSet}
        src={img.src}
      />
    </div>
  );
}

/** module 20047 `F` */
function IndexRow({ items, activeIndex, onFileNameClick }: { items: PrismicData[]; activeIndex: number; onFileNameClick: (i: number) => void }) {
  return (
    <div className={cx(layout.Grid, s.IndexRow, typography.MonoDetail)}>
      <p className={s.IndexContainer}>
        <motion.span className={s.Index}>
          {items.map((_, i) => (
            <motion.span
              key={i}
              className={cx(s.IndexItem, i === activeIndex && s.IndexItem_Current)}
              animate={{ y: `${-100 * activeIndex}%` }}
              transition={{ duration: 0.3, ease: EASE_O7 }}
            >
              {i + 1}
            </motion.span>
          ))}
        </motion.span>
        <span>
          {' of '}
          {items.length}
        </span>
      </p>
      <div className={s.FileNames}>
        <div className={s.FileNamesWrapper}>
          {items.map((item, i) => (
            <p key={i} className={cx(s.FileNamesItem, i === activeIndex && s.FileNamesItem_Current)} onClick={() => onFileNameClick(i)}>
              {item.file_name}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

/** module 61347 `z` */
function MobileButtons({ onClick }: { onClick: (d: Direction) => void }) {
  return (
    <div className={s.MobileButtons}>
      <button className={typography.MonoDetail} onClick={() => onClick(CursorAction.LEFT)}>
        anterior
      </button>
      <button className={typography.MonoDetail} onClick={() => onClick(CursorAction.RIGHT)}>
        próximo
      </button>
    </div>
  );
}

export default function Carousel({ slice }: { slice: PrismicData }) {
  const items: PrismicData[] = slice.items || [];
  const [direction, setDirection] = useState<Direction>(CursorAction.LEFT);
  const [index, setIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const text = direction === 'left' ? 'anterior' : 'próximo';

  const step = useCallback(
    (d: Direction) => {
      let n = index;
      if (d === 'left') n -= 1;
      else n += 1;
      if (n < 0) n = items.length - 1;
      else n %= items.length;
      setIndex(n);
    },
    [index, items.length],
  );
  const onCursorClick = useCallback(() => step(direction), [direction, step]);

  // Mount-only (see the quirk above): width = wrapper width × n, transform translateX(mapRange(0,0,n,0,-100)%).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;
    track.style.width = `${wrapper.clientWidth * items.length}px`;
    const x = 0 + ((0 - 0) * (-100 - 0)) / (items.length - 0);
    track.style.transform = `translateX(${x}%)`;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FadeIn>
      <section className={s.CarouselSection} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
        <CursorArea
          text={text}
          onMouseMove={(e) => setDirection(e.clientX > window.innerWidth / 2 ? 'right' : 'left')}
          onClick={onCursorClick}
        >
          <div ref={wrapperRef} className={cx(layout.Wrapper, s.CarouselContainer)}>
            <div ref={trackRef} className={s.ImageContainer}>
              {items.map((item, i) => (
                <ImageItem key={i} isCurrent={i === index} image={item.image} />
              ))}
            </div>
            <MobileButtons onClick={step} />
            <IndexRow items={items} activeIndex={index} onFileNameClick={setIndex} />
          </div>
        </CursorArea>
      </section>
    </FadeIn>
  );
}
