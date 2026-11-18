// Server-side slice dispatcher for the About pages (original: @prismicio/react SliceZone with the components of
// slices/index.ts; every slice receives {slice, index, slices, context}). Each slice is wrapped in a keyed Fragment
// (key = slice.id, as in the RSC payload); the original's PreloadChunks siblings render nothing on the client.
import { Fragment } from 'react';
import AboutColumns from './AboutColumns';
import HeroVideo from './HeroVideo';
import ImageGallery from './ImageGallery';
import ProcessSteps from './ProcessSteps';
import ScrollingCarousel from './ScrollingCarousel';
import WhereWeAre from './WhereWeAre';
import TeamSection from './team/TeamSection';
import type { AboutSlice, DepartmentDoc, EmployeeDoc } from './types';

export interface AboutSliceContext {
  additionalPageData: AboutSlice[];
  departments: DepartmentDoc[];
  employees: EmployeeDoc[];
}

function renderSlice(slice: AboutSlice, context: AboutSliceContext) {
  switch (slice.slice_type) {
    case 'about_columns':
      return <AboutColumns slice={slice} context={{ additionalPageData: context.additionalPageData }} />;
    case 'about_scrolling_carousel':
      return <ScrollingCarousel slice={slice} />;
    case 'hero_video':
      return <HeroVideo slice={slice} />;
    case 'about_where_we_are':
      return <WhereWeAre slice={slice} />;
    case 'team_section':
      return <TeamSection slice={slice} departments={context.departments} employees={context.employees} />;
    case 'image_gallery':
      return <ImageGallery slice={slice} />;
    // Olwtelet: Processo only (Estúdio has no slice of this type)
    case 'about_process_steps':
      return <ProcessSteps slice={slice} />;
    default:
      if (process.env.NODE_ENV !== 'production') console.warn('About: no component for slice type', slice.slice_type);
      return null;
  }
}

export default function SliceZone({ slices, context }: { slices: AboutSlice[]; context: AboutSliceContext }) {
  return (
    <>
      {slices.map((slice) => (
        <Fragment key={slice.id}>{renderSlice(slice, context)}</Fragment>
      ))}
    </>
  );
}
