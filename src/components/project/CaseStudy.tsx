'use client';
// Original CaseStudy (module 17160 `ep`) — docs/recon/project-template.md §2, §4, §5.
//   PageContainer > PageWrapper > [ Title, Section(no grid){MetaRow, ParalaxContainer{hero media}, Summary},
//   Section "ABOUT"{Stagger{Description, Features}}, Section "AWARDS" (only with awards[0]), SliceZone ]
// On mount the client logo(s) go to the header (store; ThemeController clears them when leaving).
import { cancelFrame, frame, motion, time, useAnimationControls, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { PageContainer, PageWrapper } from '@/components/ui/layout';
import { TextReveal } from '@/components/ui/TextReveal';
import { TransitionLink } from '@/components/transition/TransitionLink';
import { typography } from '@/components/ui/typography';
import { appStore, type HeaderLogo } from '@/lib/store';
import { cx } from '@/lib/cx';
import type { PrismicData } from '@/lib/types';
import { asTextVerbatim, noHotlink } from './media';
import { MediaElement, heroMediaProps } from './MediaElement';
import { ProjectTitle } from './ProjectTitle';
import { CaseStudyRichText } from './richText';
import { Label, LabelledSection, Section, Stagger } from './Section';
import { SliceZone } from './SliceZone';
import s from './caseStudy.module.css';

/* ---------------------------------------------------------------- meta row (component `X`) */
// Olwtelet: TIPO pill (filter link to the home) + status pill; "VER O SITE" only for a public project.
function MetaRow({ content }: { content: PrismicData }) {
  if (!content.zone || !('data' in content.zone)) return null;
  const zoneName: string | undefined = content.zone.data.zone_name;
  const zoneUid: string | undefined = content.zone.uid;
  const status: string | undefined = content.status_label;
  const live = content.live_experience ? content.live_experience[0] : null;
  return (
    <div className={s.MetaContainer}>
      <div className={cx(s.ContentWrapper, typography.MonoDetail)}>
        <div>
          <p>TIPO E STATUS</p>
          <TransitionLink href={`/?zone=${zoneUid}`}>
            <p className={s.MetaPill}>{zoneName}</p>
          </TransitionLink>
          {status && <p className={s.MetaPill}>{status}</p>}
        </div>
        {live && live.url?.url && (
          <a href={live.url.url} target="_blank" rel="noreferrer">
            <span>VER O SITE</span>
            <p className={s.MetaPill}>
              {live.label}
              {'↗'}
            </p>
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- hero media (component `F`) */
function HeroMedia({ isOverscale, content }: { isOverscale: boolean; content: PrismicData }) {
  const media = useMemo(() => heroMediaProps(content.hero?.[0]), [content]);
  if (!media) return null;
  return (
    <div className={cx(s.HeroContainer, isOverscale && s.HeroContainer__Overscale)}>
      <MediaElement {...media} />
    </div>
  );
}

/* ---------------------------------------------------------------- hero fade timing */
/** motion-dom MAX_RESOLVE_DELAY of the original's framer build (chunk 3478: `resolvedAt - createdAt > 40`). */
const MAX_RESOLVE_DELAY = 40;
const HERO_FADE = { duration: 0.5, delay: 0.5 };

/**
 * The original's ParalaxContainer is `initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.5, delay:.5}}`
 * (module 17160 `et`), unchanged here. What differs is the framer-motion build: the original's resolves the mount
 * animation's keyframes in the NEXT framer frame (chunk 3478: KeyframeResolver batch in `frame.read`, MEASURED: WAAPI
 * `animate()` called from a rAF) and starts the WAAPI animation at `resolvedAt` when that frame comes more than 40 ms
 * after the animation was created (else at `createdAt`). The local framer-motion 14 resolves `opacity` keyframes
 * synchronously inside the passive effect (DOMKeyframesResolver `canReadNow` fast path), so its 0.5 s delay counted
 * from the effects flush and the fade began ~50 ms earlier relative to the title (audit projects-04). This hook
 * replays the original's order: created in the mount effect (framer `time.now()`, same task clock as framer's own
 * `createdAt`), resolved in the next `frame.read`, started at `resolvedAt` (or backdated to `createdAt` within 40 ms).
 */
function useOriginalMountFade() {
  const controls = useAnimationControls();
  useEffect(() => {
    const createdAt = time.now();
    const resolve = frame.read(({ timestamp: resolvedAt }) => {
      const startTime = resolvedAt - createdAt > MAX_RESOLVE_DELAY ? resolvedAt : createdAt;
      // inside frame.read framer's time.now() === resolvedAt, so the WAAPI startTime is resolvedAt: shift the delay
      void controls.start({ opacity: 1, transition: { duration: HERO_FADE.duration, delay: Math.max(0, HERO_FADE.delay - (resolvedAt - startTime) / 1000) } });
    });
    return () => cancelFrame(resolve);
  }, [controls]);
  return controls;
}

/* ---------------------------------------------------------------- hero block (component `e_`) */
function CaseStudyHero({ content }: { content: PrismicData }) {
  const hero = content.hero?.[0] || null;
  const summary = hero ? asTextVerbatim(hero.summary) : '';
  const ref = useRef<HTMLDivElement>(null);
  // media_overscale is false for all 140 documents (FROM-DATA): the parallax below is never active.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const parallax = useTransform(scrollYProgress, [0, 1], [-70, 70]);
  const scaling = hero?.title_scaling;
  const scaleFactor = typeof scaling === 'number' ? scaling / 100 : 1;
  const y = hero?.media_overscale ? parallax : 0;
  const heroFade = useOriginalMountFade();
  return (
    <>
      <ProjectTitle text={content.title} scaleFactor={scaleFactor} />
      <Section isNoGrid>
        <MetaRow content={content} />
        <motion.div
          ref={ref}
          className={s.ParalaxContainer}
          style={{ y }}
          initial={{ opacity: 0 }}
          animate={heroFade}
        >
          <HeroMedia isOverscale={hero?.media_overscale || false} content={content} />
        </motion.div>
        <div className={cx(typography.LargeSubTitle, s.Summary)}>
          <TextReveal text={summary} indent />
        </div>
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------- ABOUT (component `k`) */
function About({ content }: { content: PrismicData }) {
  const description = useMemo(() => content.about?.[0]?.description, [content]);
  const features: Array<{ feature_name: string; uid: string }> = (content.features || []).map(({ feature }: PrismicData) =>
    feature && 'data' in feature ? { feature_name: feature.data.feature_name, uid: feature.uid } : { feature_name: '', uid: '' },
  );
  return (
    <Stagger>
      <div className={cx(s.Description, typography.LargeBody)}>
        <CaseStudyRichText field={description} />
      </div>
      <div className={s.ProjectFeatures}>
        <Label>CATEGORIAS</Label>
        <ul>
          {features.map(({ feature_name, uid }, i) => (
            <li key={i} className={cx(typography.MonoDetail, s.FeatureLi)}>
              <TransitionLink href={`/?feature=${uid}`}>
                <p className={s.FeaturePill}>{feature_name}</p>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </div>
    </Stagger>
  );
}

/* ---------------------------------------------------------------- AWARDS (component `D`) */
function Awards({ content }: { content: PrismicData }) {
  const awards = (content.awards || []).map(({ award }: PrismicData) => ({
    name: award.data.award_recognition_name,
    url: award.data.award_recognition_link.url,
    img: noHotlink(award.data.awarding_body_svg.url),
  }));
  return (
    <ul className={s.AwardsList}>
      {awards.map((a: { name: string; url: string; img: string }, i: number) => (
        <li key={i}>
          <a href={a.url}>
            <p className={typography.MonoDetail}>{a.name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.AwardSvg} src={a.img} alt={a.name} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- CaseStudy (`ep`) */
export default function CaseStudy({ content, uid }: { content: PrismicData; uid: string }) {
  const hasAwards = !!content.awards?.[0];
  useEffect(() => {
    // original: the case study publishes its client logos next to the header logo. Olwtelet projects are its own
    // (client = the studio, no logo), so nothing is added; an external client logo would still be shown.
    const logos: HeaderLogo[] = [];
    for (const c of content.clients || []) {
      const data = c?.client?.data;
      if (c?.client?.uid !== 'olwtelet' && data?.client_logo?.url) {
        const l = data.client_logo;
        logos.push({ id: String(l.id ?? ''), url: noHotlink(l.url), width: l.dimensions?.width, height: l.dimensions?.height, alt: l.alt ?? null });
      }
    }
    appStore.set({ headerLogo: logos[0] ?? null, headerLogos: logos });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageContainer>
      <PageWrapper>
        <CaseStudyHero content={content} />
        <LabelledSection label="SOBRE">
          <About content={content} />
        </LabelledSection>
        {hasAwards && (
          <LabelledSection label="RECONHECIMENTOS">
            <Awards content={content} />
          </LabelledSection>
        )}
        <SliceZone slices={content.slices || []} context={{ uid }} />
      </PageWrapper>
    </PageContainer>
  );
}
