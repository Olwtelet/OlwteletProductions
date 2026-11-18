// Generic content pages (original app/[uid]/page). Olwtelet Productions has one: /privacy-policy (LGPD-oriented,
// src/content/pages.json, written by scripts/brand/build-content.mjs). Any other single-segment path calls notFound()
// → ./not-found.tsx (HTTP 404, "Página não encontrada"). The former /ai-policy, /modern-slavery-statement and /home
// pages belonged to the replicated site and are gone (404).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/legal/LegalPage';
import { getPage } from '@/lib/content';
import { notFoundHeadMetadata, routeMetadata } from '@/lib/seo';

type Params = { params: Promise<{ uid: string }> };
const PAGE_UIDS = ['privacy-policy'] as const;

export const dynamicParams = true;

export function generateStaticParams() {
  return PAGE_UIDS.map((uid) => ({ uid }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { uid } = await params;
  // unknown uid: the 404 metadata ("Página não encontrada", noindex)
  return (PAGE_UIDS as readonly string[]).includes(uid) ? routeMetadata(`/${uid}`) : notFoundHeadMetadata;
}

export default async function UidPage({ params }: Params) {
  const { uid } = await params;
  // only the content pages (pages.json also holds the 404 strings as /this-page-does-not-exist, kind 'not-found')
  const page = (PAGE_UIDS as readonly string[]).includes(uid) ? getPage(`/${uid}`) : undefined;
  if (!page) notFound();
  return <LegalPage page={page} />;
}
