// Home page `/` — same RSC tree as the original app/page:
//   [ main (screen-reader h1 + p),
//     WorkGrid {data, projects}                     (client: fixed black stage, loader, list, toggle, canvas)
//     LayoutWrapper order=0 > Suspense(null) > Filters {filtersData}
//     CookieBanner {slices}                         (only when analytics is configured; see CookieBanner) ]
// Olwtelet Productions: projects, filter options and counts come from src/content/brand.ts.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import CookieBanner from '@/components/chrome/CookieBanner';
import { Filters, type FilterOption, type FiltersData } from '@/components/home/ui/Filters';
import { getListProjects } from '@/components/home/ui/listData';
import { WorkGrid } from '@/components/home/ui/WorkGrid';
import { getWorkGridData } from '@/components/home/workgrid/data';
import { LayoutWrapper } from '@/components/ui/LayoutWrapper';
import { CATEGORIES, KINDS, PROJECTS } from '@/content/brand';
import { getHome, getSettings } from '@/lib/content';
import { homeMetadata } from '@/lib/seo';

export const metadata: Metadata = homeMetadata();

/** Only the types and categories that at least one project has (no empty filter options). */
function getFiltersData(): FiltersData {
  const kinds = new Set(PROJECTS.map((p) => p.kind));
  const cats = new Set(PROJECTS.flatMap((p) => p.categories));
  const opt = (uid: string, name: string): FilterOption => ({ id: uid, uid, name });
  return {
    zones: (Object.keys(KINDS) as (keyof typeof KINDS)[]).filter((k) => kinds.has(k)).map((k) => opt(k, KINDS[k])),
    features: (Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).filter((c) => cats.has(c)).map((c) => opt(c, CATEGORIES[c])),
    services: [],
    clients: [],
  };
}

export default function HomePage() {
  const home = getHome();
  const settings = getSettings();
  const data = getWorkGridData();
  return (
    <>
      <main>
        {home.screenReaderText.h1.map((t, i) => (
          <h1 key={i} className="screen-reader-only">
            {t}
          </h1>
        ))}
        {home.screenReaderText.p.map((t, i) => (
          <p key={i} className="screen-reader-only">
            {t}
          </p>
        ))}
      </main>
      <WorkGrid data={data} projects={getListProjects()} />
      <LayoutWrapper order={0}>
        <Suspense fallback={null}>
          <Filters filtersData={getFiltersData()} />
        </Suspense>
      </LayoutWrapper>
      <CookieBanner slices={settings.cookieBanner.data} />
    </>
  );
}
