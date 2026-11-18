'use client';
// `about_columns` slice — original page chunk module 19332 (container `q`, default variation `N`, zone row `Q`,
// 2-column quote `H`). docs/recon/about.md §4.
// - Separator shown when variation !== default or `include_section_line_above`.
// - `id="team"` only for about_section_id === "section-7" (no other ids ⇒ "#section-9" never resolves: quirk kept).
// - The FadeIn wrapper is always rendered (empty for the default variation, as in the original DOM).
// - The zone row's title comes from the matching `context.additionalPageData` slice (`linked_zone.data.zone_name`),
//   else `zone_title`; its CTA is a TransitionLink to `/?zone=<uid>`.
// - `useMediaQueries().isMinMedium` starts false (width 0) ⇒ the grouped icon+title wrapper is rendered on the
//   first client render and replaced after the resize effect (original behaviour).
import { useEffect, useRef } from 'react';
import { TextReveal } from '@/components/ui/TextReveal';
import { FadeIn } from '@/components/ui/FadeIn';
import { CTA, ctaStyles } from '@/components/ui/CTA';
import { layout } from '@/components/ui/layout';
import { typography } from '@/components/ui/typography';
import { TransitionLink } from '@/components/transition/TransitionLink';
import { mediaUrl } from '@/lib/media';
import { appStore } from '@/lib/store';
import { useMediaQueries } from '@/lib/useMediaQueries';
import { cx } from '@/lib/cx';
import { Separator } from './Separator';
import { PrismicImage, type PrismicImageField } from './images';
import { useIntersect } from './useIntersect';
import type { AboutColumnsPrimary, AboutSlice, PrismicLink } from './types';
import s from './aboutColumns.module.css';

const INTERSECT_OPTIONS: IntersectionObserverInit = { root: null, rootMargin: '0px', threshold: 0.51 };

/** @prismicio/client isFilled.link: a link with a type other than "Any" and at least one more field. */
function isFilledLink(link?: PrismicLink | null): link is PrismicLink & { url: string } {
  return !!link && link.link_type !== 'Any' && Object.keys(link).length > 1 && !!link.url;
}

function DefaultColumns({ slice }: { slice: AboutSlice }) {
  const p = slice.primary as AboutColumnsPrimary;
  const videoUrl = p.video?.url;
  const isTitle = !!p.page_title;
  const reveal = p.sub_text ? (
    <TextReveal sectionName={p.sub_text} text={p.description} depth={isTitle ? 'char' : 'word'} />
  ) : (
    <TextReveal text={p.description} depth={isTitle ? 'char' : 'word'} />
  );
  return (
    <div className={layout.Grid}>
      <div className={s.AboutColumnContent_Default}>
        {p.page_title ? (
          <h1 className={s.AboutColumnTitle}>{reveal}</h1>
        ) : (
          <div className={s.AboutColumnContentInner}>
            <span className={s.AboutColumnTitleDescription}>{reveal}</span>
            {p.cta_link?.url && (
              <FadeIn delay={1}>
                <div className={cx(s.CTALink, typography.MonoDetail)}>
                  <CTA useTargetBlank={false} link={p.cta_link.url} type="About_View">
                    {p.cta_link.text}
                  </CTA>
                </div>
              </FadeIn>
            )}
          </div>
        )}
        <FadeIn>
          {videoUrl ? (
            <div className={cx(s.VideoBlendContainer, p.video_blending && s.VideoBlendContainer_darken)}>
              <video src={mediaUrl(videoUrl)} autoPlay playsInline muted loop />
            </div>
          ) : (
            <PrismicImage field={p.image} />
          )}
        </FadeIn>
      </div>
    </div>
  );
}

function ZoneRow({ slice, context }: { slice: AboutSlice; context?: AboutSlice }) {
  const p = slice.primary as AboutColumnsPrimary;
  const r = context?.primary as AboutColumnsPrimary | undefined;
  const zoneData = r?.linked_zone?.data as { zone_name?: string } | undefined;
  const videoUrl = isFilledLink(p.list_video) ? p.list_video.url : undefined;
  const d = {
    columnOneText: p.row_number,
    columnOneIcon: p.row_icon as PrismicImageField | undefined,
    columnTwo: zoneData?.zone_name || p.zone_title,
    columnThree: p.zone_description,
    ctaLinkText: p.zone_link_text,
    ctaLink: r?.linked_zone?.uid || '',
    /** Olwtelet rows link to a page (a project) instead of a home filter */
    ctaHref: (p as { cta_href?: string | null }).cta_href || null,
    // INFERRED: module 65885 `s(list_items)` (HTML of the list) — never reached with the published content
    // (every row has a `list_image` object, even when empty).
    columnFourText: '',
    columnFourImage: p.list_image,
    columnFourVideoUrl: videoUrl,
    columnFourVideoBlended: p.list_video_blending,
  };
  const { isMinMedium } = useMediaQueries();
  const one = (
    <div className={s.AboutColumnOne}>
      {d.columnOneIcon ? (
        <div className={s.AboutColumnIcon}>
          <PrismicImage field={d.columnOneIcon} />
        </div>
      ) : (
        d.columnOneText
      )}
    </div>
  );
  const four = (
    <div className={cx('page-width', s.AboutColumnFour, typography.MonoDetail)}>
      {d.columnFourVideoUrl ? (
        <div className={cx(s.VideoBlendContainer, d.columnFourVideoBlended && s.VideoBlendContainer_darken)}>
          <video className={s.AboutColumnVideo} src={mediaUrl(d.columnFourVideoUrl)} autoPlay muted loop playsInline />
        </div>
      ) : d.columnFourImage ? (
        <div className={s.AboutColumnImage}>
          <PrismicImage field={d.columnFourImage} />
        </div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: d.columnFourText }} />
      )}
    </div>
  );
  const title = <span className={s.AboutColumnTitleDescription}>{d.columnTwo}</span>;
  return (
    <div className={cx(s.AboutColumnContent_FourColumnZone, layout.Grid)}>
      {isMinMedium ? (
        <>
          {one}
          {title}
        </>
      ) : (
        <div className={s.AboutGroupedTitle}>
          {one}
          {title}
        </div>
      )}
      <div className={s.AboutColumnBodyWrapper}>
        <div className={s.AboutColumnBody}>{d.columnThree}</div>
        {d.ctaLinkText && (
          <div className={cx(s.CTALink, typography.MonoDetail)}>
            <div className={cx(ctaStyles.CTALinkElement, ctaStyles.About_View)}>
              <TransitionLink href={d.ctaHref ?? `/?zone=${d.ctaLink}`}>{d.ctaLinkText}</TransitionLink>
            </div>
          </div>
        )}
      </div>
      {four}
    </div>
  );
}

export interface AboutColumnsContext {
  additionalPageData: AboutSlice[];
}

export default function AboutColumns({ slice, context }: { slice: AboutSlice; context: AboutColumnsContext }) {
  const p = slice.primary as AboutColumnsPrimary;
  const showLine = slice.variation !== 'default' || !!p.include_section_line_above;
  const ctx = useRef<AboutSlice | undefined>(undefined);
  const match = context.additionalPageData.find((t) => t.id === slice.id);
  if (match) ctx.current = match;
  const { ref, isIntersecting } = useIntersect<HTMLDivElement>(INTERSECT_OPTIONS);
  const isTeam = p.about_section_id === 'section-7';
  useEffect(() => {
    // setAboutIntersectingSection — written, never read (original quirk, recon §4.1)
    if (isIntersecting) appStore.set({ aboutIntersectingSection: String(p.about_section_id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIntersecting]);
  return (
    <div
      ref={ref}
      id={isTeam ? 'team' : undefined}
      className={cx(s.AboutColumnsContainer, slice.variation === 'default' && p.page_title && s.AboutColumnsContainer_PageTitle)}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      data-section-id={`${p.about_section_id}`}
    >
      {showLine && (
        <div className={s.LineContainer}>
          <Separator />
        </div>
      )}
      {slice.variation === 'default' && <DefaultColumns slice={slice} />}
      <FadeIn>{slice.variation === 'aboutColumns4ColumnZone' && <ZoneRow slice={slice} context={ctx.current} />}</FadeIn>
    </div>
  );
}
