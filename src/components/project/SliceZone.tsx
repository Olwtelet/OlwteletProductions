'use client';
// Original SliceZone of CaseStudy (module 17160 `i` + registry `_`). The 140 project documents only use 4 slice
// types (FROM-DATA, project-slices-catalog.json): case_study_media, carousel, copy_section, hero_video. The other
// 16 registered types (about_*, column_copy, image_gallery, job_link, links, rich_text, team_section, video) are
// never used by a project. A slice type without a component renders nothing in production (the original's
// "Could not find a component" placeholder is dev-only).
import type { ComponentType } from 'react';
import type { PrismicData } from '@/lib/types';
import CaseStudyMedia from './slices/CaseStudyMedia';
import Carousel from './slices/Carousel';
import CopySection from './slices/CopySection';
import HeroVideo from './slices/HeroVideo';

type SliceProps = { slice: PrismicData; index: number; slices: PrismicData[]; context: Record<string, unknown> };

const COMPONENTS: Record<string, ComponentType<SliceProps>> = {
  case_study_media: CaseStudyMedia,
  carousel: Carousel,
  copy_section: CopySection,
  hero_video: HeroVideo,
};

export function SliceZone({ slices = [], context = {} }: { slices?: PrismicData[]; context?: Record<string, unknown> }) {
  return (
    <>
      {slices.map((slice, i) => {
        const type: string = 'slice_type' in slice ? slice.slice_type : slice.type;
        const key = 'id' in slice && slice.id ? String(slice.id) : `${i}-${JSON.stringify(slice)}`;
        const C = COMPONENTS[type];
        if (!C) {
          if (process.env.NODE_ENV !== 'production') console.warn(`[SliceZone] Could not find a component for slice type "${type}"`, slice);
          return null;
        }
        return <C key={key} slice={slice} index={i} slices={slices} context={context} />;
      })}
    </>
  );
}
