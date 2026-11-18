'use client';
// `image_gallery` slice — original module 65886 (only the `fullSizeImages` variation is published on /about/approach:
// the world map). Both FadeIn wrappers are always rendered (the first stays empty), the second with delay 1 s.
// Container classes: GalleryImageContainer + heroOverlap variant + layout_Wrapper (full_width_page). recon §6.10
import { FadeIn } from '@/components/ui/FadeIn';
import { layout } from '@/components/ui/layout';
import { cx } from '@/lib/cx';
import { PrismicNextImage, type PrismicImageField } from './images';
import type { AboutSlice } from './types';
import s from './imageGallery.module.css';

interface GalleryItem {
  image?: PrismicImageField;
  max_width_percentage?: number | null;
}

const OVERLAP: Record<string, string> = {
  OverlapNone: s.GalleryImageContainer_OverlapNone,
  OverlapTop: s.GalleryImageContainer_OverlapTop,
  OverlapBottom: s.GalleryImageContainer_OverlapBottom,
  OverlapBoth: s.GalleryImageContainer_OverlapBoth,
};

function FullSizeImages({ slice }: { slice: AboutSlice }) {
  const p = slice.primary as { hero_image?: boolean; hero_image_overlap?: string | null; full_width_page?: boolean };
  const overlap = p.hero_image && p.hero_image_overlap ? p.hero_image_overlap.replace(/\s/g, '') : 'OverlapNone';
  return (
    <div className={cx(s.GalleryImageContainer, OVERLAP[overlap], p.full_width_page && layout.Wrapper)}>
      {(slice.items as GalleryItem[]).map((item, i) => {
        const pct = item.max_width_percentage;
        return (
          <div key={item.image?.id ?? i} className={s.GalleryImageItem} style={{ maxWidth: pct ? `${pct}%` : 'unset' }}>
            <PrismicNextImage field={item.image} fallbackAlt="" />
          </div>
        );
      })}
    </div>
  );
}

export default function ImageGallery({ slice }: { slice: AboutSlice }) {
  const p = slice.primary as { reduce_top_margin?: boolean; reduce_bottom_margin?: boolean };
  return (
    <section
      className={cx(s.ImageGallerySection, p.reduce_top_margin && s.ImageGallerySection_ReduceMarginTop, p.reduce_bottom_margin && s.ImageGallerySection_ReduceMarginBottom)}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <FadeIn>{null}</FadeIn>
      <FadeIn delay={1}>{slice.variation === 'fullSizeImages' && <FullSizeImages slice={slice} />}</FadeIn>
    </section>
  );
}
