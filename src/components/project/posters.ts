// LazyVideo posters (module 26641 rule `<dir>/posters/<name>-poster.webp`), derived from each video URL of a
// case_study_media slice. The Olwtelet case studies use still images only today; a video added later needs its poster
// file next to it (public/…/posters/<name>-poster.webp).
import 'server-only';
import type { PrismicData } from '@/lib/types';
import { videoPoster } from './media';

/** Derived poster of a video (ORIGINAL URL, mapped to the local path by mapMediaDeep afterwards). */
export function posterFor(videoUrl: string): string {
  return videoPoster(videoUrl);
}

/** Copy of the project data with `poster` added to every case_study_media video item (original URLs). */
export function withPosters(data: PrismicData): PrismicData {
  const slices = (data.slices || []).map((s: PrismicData) =>
    s.slice_type !== 'case_study_media'
      ? s
      : {
          ...s,
          primary: {
            ...s.primary,
            Media: (s.primary?.Media || []).map((m: PrismicData) => (m?.type === 'video' && m.source?.url ? { ...m, poster: posterFor(m.source.url) } : m)),
          },
        },
  );
  return { ...data, slices };
}
