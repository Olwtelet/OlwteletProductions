'use client';
// Persistent header — original root-layout module 38893 (`q`) + styled parts 43092, css 68494fcd / fcefe4ac.
// docs/recon/design-system.md §4.1–4.6, docs/recon/intro-and-chrome.md §9.5–11.
//
// DOM (children order MEASURED): header.Wrapper.Grid.HeaderBar >
//   div.LogoContainer [ TransitionLink "/" (isNavOrigin) > motion.div.HomeLogo[aria-label="to home"] > img,
//                       AnimatePresence(mode wait) > div.AnimatePresenceListContainer > per client logo:
//                       motion.div.ClientIconsWrapper [ cross svg (pathLength draw), CaseLogoContainer > link > CaseLogo > img ] ]
//   Sound (useSoundToggle — exactly once), tagline (children ?? short_description), Timezones (dynamic, ssr:false),
//   Let's Talk (next/link /contact + click.mp3, when store.showContactCta), div.GradientBlurBg
// Mounted by the root layout inside <LayoutWrapper order={1}>; every widget fades in (chromeFade: 0.3 s, delay 0.4).
//
// Final API (kept from the foundation stub): default export `Header({ slices, children })`, named `ShortDescription`.
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { useSound } from '@/components/providers/SoundProvider';
import { TransitionLink } from '@/components/transition/TransitionLink';
import { CHROME_DELAY, chromeFade, crossPath, slideUp } from '@/components/ui/motion';
import { typography } from '@/components/ui/typography';
import { layout } from '@/components/ui/layout';
import { cx } from '@/lib/cx';
import { mediaUrl } from '@/lib/media';
import { appStore, shallowEqual, useAppStore, type AppState, type HeaderLogo } from '@/lib/store';
import { ROUTES } from '@/lib/theme';
import type { HeaderData } from '@/lib/types';
import { OlwteletMark } from '@/components/brand/OlwteletMark';
import { BRAND } from '@/content/brand';
import Sound from './Sound';
import s from './header.module.css';

export interface HeaderProps {
  /** header doc data (settings.header.data): logo, short_description, contact_cta_text, contact_cta_link */
  slices: HeaderData;
  /** the tagline element (<ShortDescription>…</ShortDescription>), rendered instead of slices.short_description */
  children?: ReactNode;
}

/** chunk 3764, loaded on the client only (original `next/dynamic(..., { ssr: false })`). */
const Timezones = dynamic(() => import('./Timezones'), { ssr: false });

/** `motion.p.Header_ShortDescription + MonoDetail`; the root layout spreads no props, so the chrome fade is the default. */
export function ShortDescription({ children, className, ...rest }: HTMLMotionProps<'p'>) {
  return (
    <motion.p {...chromeFade} className={cx(s.ShortDescription, typography.MonoDetail, className)} {...rest}>
      {children}
    </motion.p>
  );
}

/** module 38893 `K`: 43×44 "×", each path draws pathLength 0→1 (delay 0.4 + 0.5 − 0.05 + 0.3·i, 0.3 s, ease xQ). */
function CaseCross({ delay }: { delay: number }) {
  const variants = useMemo(() => crossPath(delay), [delay]);
  return (
    <motion.svg className={s.CrossSvg} width="43" height="44" viewBox="0 0 43 44" fill="none" initial="hidden" animate="visible" exit="hidden">
      <motion.path d="M10.5898 11.4111L31.7676 32.5889" stroke="var(--color-primary)" strokeWidth="0.5" variants={variants} custom={0} />
      <motion.path d="M10.5898 32.5889L31.7676 11.4111" stroke="var(--color-primary)" strokeWidth="0.5" variants={variants} custom={1} />
    </motion.svg>
  );
}

/** module 38893 `L`: CaseLogoContainer > TransitionLink "/" (isNavOrigin) > CaseLogo (slide y 100% → 0%) > img. */
function CaseLogo({ logo, delay }: { logo: HeaderLogo; delay: number }) {
  return (
    <motion.div className={s.CaseLogoContainer}>
      <TransitionLink href={ROUTES.home} isNavOrigin>
        <motion.div className={s.CaseLogo} {...slideUp(delay)}>
          {/* PrismicNextImage (priority): alt "", intrinsic size from the Prismic dimensions */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(logo.url)} alt="" width={logo.width} height={logo.height} decoding="async" style={{ color: 'transparent' }} />
        </motion.div>
      </TransitionLink>
    </motion.div>
  );
}

/**
 * Client logos. The original store keeps `logos[]` (a case study pushes every non-Phantom client logo: 23 of the 140
 * projects show two, MEASURED on /projects/erase-your-ex). The shared store exposes a single `headerLogo`, which the
 * ThemeController clears (together with `headerLogos`) when leaving a case study. A page sets both
 * `headerLogo` and `headerLogos: HeaderLogo[]` (first item === headerLogo); the array is honoured only while
 * `headerLogo` is set.
 */
function selectLogos(st: AppState): HeaderLogo[] {
  if (!st.headerLogo) return [];
  const many = st.headerLogos;
  if (Array.isArray(many) && many.length && many[0].id === st.headerLogo.id) return many;
  return [st.headerLogo];
}

/**
 * Dev-only handle for the verification scripts (scripts/chrome/*): lets them set header logos (as a case-study page
 * does) without depending on another area's page. Set at module evaluation (hydration), i.e. before the header mounts,
 * like the original's project-page effect. Never present in production builds.
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __chromeDebug?: unknown }).__chromeDebug = { appStore };
}

export default function Header({ slices, children }: HeaderProps) {
  const { playClip } = useSound();
  const logos = useAppStore(selectLogos, (a, b) => a.length === b.length && a.every((l, i) => shallowEqual(l, b[i])));
  const showContactCta = useAppStore((st) => st.showContactCta);

  return (
    <header className={cx('page-width relative grid-layout', layout.Wrapper, layout.Grid, s.HeaderBar)}>
      <div className={s.LogoContainer}>
        <TransitionLink href={ROUTES.home} isNavOrigin>
          <motion.div className={s.HomeLogo} {...chromeFade} aria-label={`${BRAND.name}: início`}>
            {/* the Olwtelet mark, inline (currentColor = the page's primary colour); sized by header.module.css */}
            <OlwteletMark className={s.HomeMark} title={null} />
          </motion.div>
        </TransitionLink>
        <AnimatePresence mode="wait">
          <div className={s.AnimatePresenceListContainer} key="list-container">
            {logos.map((logo, i) => (
              <motion.div className={s.ClientIconsWrapper} key={logo.id}>
                <CaseCross key={`${i}-cross`} delay={CHROME_DELAY} />
                <CaseLogo key={`${i}-logo`} logo={logo} delay={CHROME_DELAY} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
      <Sound />
      {children ?? <ShortDescription>{slices.short_description}</ShortDescription>}
      <Timezones />
      {showContactCta && (
        <motion.div className={cx(s.ContactCta, typography.LargeButtonUi)} {...chromeFade}>
          <Link
            href={ROUTES.contact}
            onClick={() => {
              void playClip('click');
            }}
          >
            {slices.contact_cta_text}
          </Link>
        </motion.div>
      )}
      <div className={s.GradientBlurBg} />
    </header>
  );
}
