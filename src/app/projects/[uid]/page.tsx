// Case-study route — docs/recon/project-template.md. RSC row 7 of the original:
//   [ <ViewedCaseStudy value=uid/>, <CaseStudy content={doc.data} uid/>, <RelatedWork/> (server-rendered) ]
// Contract kept from the foundation stub: static params over all 140 projects (route uid; `15-years` is served as
// `zendesk-15-years`, next.config.ts 308), unknown uid rendered on demand → notFound() with projectMetadata(uid) =
// notFoundHeadMetadata (no title in the SSR head); ./not-found.tsx adds "Page not found" after hydration (MEASURED: the
// original titles /projects/foo "Page not found" only once hydrated, while unmatched URLs get no <title>).
// The page is rendered per request (`connection()`): the original is `cache-control: no-store` and its Related
// work cards are re-drawn on every request (MEASURED).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import CaseStudy from '@/components/project/CaseStudy';
import { RelatedWork } from '@/components/project/RelatedWork';
import { ViewedCaseStudy } from '@/components/project/ViewedCaseStudy';
import { localMediaDeep } from '@/components/project/localMedia';
import { withPosters } from '@/components/project/posters';
import { pickRelated } from '@/components/project/related';
import { getProject, getProjects, getProjectUids } from '@/lib/content';
import { mapMediaDeep } from '@/lib/media';
import { projectMetadata } from '@/lib/seo';

type Params = { params: Promise<{ uid: string }> };

/**
 * The original's page awaits its Prismic query (network I/O) before returning the case study, so React's first SSR
 * work pass — the one whose discoveries go into the HTTP `Link` early-hint header (Fizz `emitEarlyPreloads`, run on
 * a setImmediate after that pass, with `shellComplete=false`) — only sees the layout's stylesheets. Every
 * case_study_media `<img>` (React's automatic image preload) and every LazyVideo poster `<link>` is then written as a
 * `<link rel="preload" as="image">` in the `<head>` of the HTML, in DOM order (zedd-in-the-park: 8 images + 5 posters;
 * MEASURED, docs/evidence/project/wave-b/ssr-preloads.json). With the local JSON content the page resolved within that first
 * pass, so React moved the first ~500 characters of image preloads into the `Link` header instead (zedd: 6 of 8) and
 * only the rest stayed in the HTML (audit projects-01). Yielding one timer turn here reproduces the original's order
 * of events: the page's Flight chunk is pinged on a setImmediate queued after Fizz's early-preload emission.
 */
function afterDataFetch(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export const dynamicParams = true;

export function generateStaticParams() {
  return getProjectUids().map((uid) => ({ uid }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { uid } = await params;
  return projectMetadata(uid);
}

export default async function ProjectPage({ params }: Params) {
  const { uid } = await params;
  const project = getProject(uid);
  if (!project) notFound();
  await connection();
  await afterDataFetch();
  const related = pickRelated(project, getProjects()).map((p) => ({
    uid: p.uid,
    data: localMediaDeep(mapMediaDeep({ title: p.data.title, hero: p.data.hero, clients: p.data.clients })),
  }));
  return (
    <>
      <ViewedCaseStudy value={uid} />
      <CaseStudy content={localMediaDeep(mapMediaDeep(withPosters(project.data)))} uid={uid} />
      <RelatedWork projects={related} />
    </>
  );
}
