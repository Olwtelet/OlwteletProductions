// /about/studio (Estúdio) and /about/process (Processo) — same page structure as the replica's About:
// div.About_SlicesWrapper > Delay(500) > [SliceZone, AboutImageSequence (Estúdio only), footer]. The slices are
// client-mounted 500 ms after the page mounts, so the server HTML has an empty wrapper. Olwtelet: at once when the
// page mounts again under the contact modal reopened by Back (Delay, immediateUnderContact): its scroll position is put
// back behind the modal on the first frame, so closing the modal right away shows the page in place.
// Content: src/content/pages.json (written by scripts/brand/build-content.mjs) + the creator panel of taxonomies.json.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Footer from '@/components/footer/Footer';
import { Delay } from '@/components/ui/Delay';
import AwardsImageSequence from '@/components/about/AwardsImageSequence';
import SliceZone, { type AboutSliceContext } from '@/components/about/SliceZone';
import type { AboutSlice, DepartmentDoc, EmployeeDoc } from '@/components/about/types';
import about from '@/components/about/about.module.css';
import { getPage, getTaxonomies } from '@/lib/content';
import { routeMetadata } from '@/lib/seo';

type Params = { params: Promise<{ uid: string }> };
const ABOUT_UIDS = ['studio', 'process'] as const;

// No `dynamicParams = false`: /about/<unknown> matches this route and the page throws notFound() (404).
export function generateStaticParams() {
  return ABOUT_UIDS.map((uid) => ({ uid }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { uid } = await params;
  return routeMetadata(`/about/${uid}`);
}

function buildContext(route: string): { slices: AboutSlice[]; context: AboutSliceContext } {
  const doc = (getPage(route)?.rscDocument ?? {}) as { slices?: AboutSlice[]; context?: { additionalPageData?: AboutSlice[] } };
  const tax = getTaxonomies();
  const departments = tax.departments.items.map((d) => ({ id: d.id, uid: d.uid, data: d.data })) as unknown as DepartmentDoc[];
  const employees = tax.employees.items.map((e) => ({ id: e.id, uid: e.uid, data: e.data })) as unknown as EmployeeDoc[];
  return {
    slices: doc.slices ?? [],
    context: { additionalPageData: doc.context?.additionalPageData ?? [], departments, employees },
  };
}

export default async function AboutPage({ params }: Params) {
  const { uid } = await params;
  const route = `/about/${uid}`;
  if (!(ABOUT_UIDS as readonly string[]).includes(uid) || !getPage(route)) notFound();
  const { slices, context } = buildContext(route);
  return (
    <div className={about.SlicesWrapper}>
      <Delay delay={500} immediateUnderContact>
        <SliceZone slices={slices} context={context} />
        {uid === 'studio' && <AwardsImageSequence />}
        <Footer />
      </Delay>
    </div>
  );
}
