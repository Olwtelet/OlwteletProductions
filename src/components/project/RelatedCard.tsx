'use client';
// Original module 1651 (SimilarProjectCard). docs/recon/project-template.md §9.2.
//   div.SimilarProjectCardContainer > TransitionLink(/projects/{doc uid}) > [ div.SimilarProjectMediaWrapper >
//   media (module 60307: video autoplay muted loop / next/image 2000×1000), div.ProjectInfoContainer.MonoDetail
//   (+isOwn) > [ div > [div.CustomDot, div.CustomLabel > div > [h3 title, p "ver projeto"]],
//   next/image client logo (SVG → raw URL, 200×100, lazy, alt = client uid) ] ]
// Renders null unless the project has hero[0] with media and a clients[0].client.
// The link uses the DOCUMENT uid (so the Zendesk card links /projects/15-years → 308, as the original).
import { useMemo } from 'react';
import { TransitionLink } from '@/components/transition/TransitionLink';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import type { PrismicData } from '@/lib/types';
import { MediaElement, heroMediaProps } from './MediaElement';
import { noHotlink } from './media';
import s from './related.module.css';

export interface RelatedProject {
  uid: string;
  data: PrismicData;
}

export function RelatedCard({ content }: { content: RelatedProject }) {
  const hero = content.data.hero?.[0];
  const firstClient = content.data.clients?.[0];
  const client = firstClient?.client;
  const isOwn = client?.uid === 'olwtelet'; // the studio's own project (former in-house style variant)
  const logo: string | undefined = client?.data?.client_logo?.url;
  const media = useMemo(() => heroMediaProps(content.data.hero?.[0]), [content]);
  if (!(hero && firstClient && client && media)) return null;
  return (
    <div className={s.SimilarProjectCardContainer}>
      <TransitionLink href={`/projects/${content.uid}`}>
        <div className={s.SimilarProjectMediaWrapper}>
          <MediaElement {...media} />
        </div>
        <div className={cx(s.ProjectInfoContainer, typography.MonoDetail, isOwn && s.ProjectInfoContainer__isOwn)}>
          <div>
            <div className={cx(s.CustomDot, typography.MonoDetail)} />
            <div className={s.CustomLabel}>
              <div>
                <h3>{content.data.title}</h3>
                <p>ver projeto</p>
              </div>
            </div>
          </div>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={client.data?.client_name || ''} loading="lazy" width={200} height={100} decoding="async" data-nimg="1" style={{ color: 'transparent' }} src={noHotlink(logo)} />
          )}
        </div>
      </TransitionLink>
    </div>
  );
}
