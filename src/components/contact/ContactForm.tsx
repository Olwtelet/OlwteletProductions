'use client';
// Contact flow container — original component `tw` (chunk 665 module 95192) + steps `ee` (1), `ey` (2 wrapper),
// `ed` (3) and the tile `q`. docs/recon/careers-contact-legal.md §2.5–§2.10.
//   div.ContactContainer(.ContactContainer_Modal)
//     motion.div.ContactContainerInner  initial {y:0,opacity:0} → animate {y:-(step-1)*100vh | -(step-1)*400px
//                                       when (max-height:400px), opacity:1}, spring stiffness 65 damping 12
//       div.layout_Wrapper.layout_Grid > step 1 (module 131 `cs` = styled("div"))
//       div.ContactContentContainer_StepTwo > step 2 (the form)
//       div.layout_Wrapper.layout_Grid > step 3
// `contactFlowStep` lives in the global store and is reset to 1 on every mount; complexity and name are NOT
// reset between opens (original zustand store).
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { usePageTransition } from '@/components/transition/usePageTransition';
import { Box } from '@/components/ui/layout';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { RichText } from '@/lib/prismic/RichText';
import { useAppStore } from '@/lib/store';
import { ROUTES } from '@/lib/theme';
import { cubicBezier, EASE_VV } from '@/lib/easings';
import { ContactFormFields, setContactFlowStep, type ContactDocumentData } from './ContactFormFields';
import { ArrowIcon, EmailIcon, WhatsappIcon } from './icons';
import { useContactClose, useOnContactOpen } from './openContext';
import { NAME_TOKEN } from './validation';
import styles from './contact.module.css';

export interface ContactData {
  data: ContactDocumentData;
}

/** module 72452 */
const videoType = (src?: string | null) => {
  const parts = src?.split('.') || [];
  return `video/${parts[parts.length - 1] || 'mp4'}`;
};

// ------------------------------------------------------------------ tile (`q`)
function Tile({
  eyebrow,
  description,
  videoSrc,
  imageSrc,
  imageFraming = 'poster',
  tabIndex,
  contactEmail,
  contactWhatsapp,
  contactLinkedin,
}: {
  eyebrow: string;
  description: string;
  videoSrc?: string | null;
  /** still image shown on hover / keyboard focus in its own frame (not the video's) */
  imageSrc?: string | null;
  /** 'mark': the Olwtelet symbol, whole (contain); 'poster': a 16:9 composition, whole (contain) */
  imageFraming?: 'mark' | 'poster';
  tabIndex?: number;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  contactLinkedin?: string | null;
}) {
  const bullet = (
    <svg className={styles.CircleSvg} role="presentation" aria-hidden="true">
      <circle cx="5" cy="5" r="5" />
    </svg>
  );
  const action =
    contactEmail || contactWhatsapp ? (
      <div className={styles.TileContactContainer}>
        {contactEmail && (
          <Link className={cx(styles.TileContact, typography.MonoDetail)} tabIndex={tabIndex} href={`mailto:${contactEmail}`} aria-label={`Escrever para ${contactEmail}`} target="_blank">
            <EmailIcon />
            {/* Olwtelet: the address may break after the "@" (it is wider than the 140 px tile); one span keeps the
                text a single flex item of the tile */}
            <span>
              E-MAIL {contactEmail.split('@')[0]}@<wbr />
              {contactEmail.split('@').slice(1).join('@')}
            </span>
          </Link>
        )}
        {contactWhatsapp && (
          <Link
            className={cx(styles.TileContact, styles.TileContact_Whatsapp, typography.MonoDetail)}
            tabIndex={tabIndex}
            aria-label="Conversar pelo WhatsApp"
            target="_blank"
            href={`https://wa.me/${contactWhatsapp}`}
          >
            <WhatsappIcon />
            WHATSAPP {contactWhatsapp}
          </Link>
        )}
        {contactLinkedin && (
          <Link className={cx(styles.TileContact, typography.MonoDetail)} tabIndex={tabIndex} aria-label="Abrir o LinkedIn" target="_blank" rel="noreferrer" href={contactLinkedin}>
            {/* Olwtelet: no envelope here (it read as e-mail at ≥ 1920 px, where the tiles show icons) */}
            LINKEDIN {contactLinkedin.replace(/\/$/, '').split('/').pop()?.toUpperCase()}
          </Link>
        )}
      </div>
    ) : (
      <div className={styles.ArrowButtonContainer} tabIndex={tabIndex}>
        <ArrowIcon />
      </div>
    );
  return (
    <div className={cx(styles.ContactGridTile, !contactEmail && styles.ContactGridTile_Pointer)}>
      <div>
        <p className={cx(styles.Subtitle, typography.MonoDetail)}>
          {bullet}
          {eyebrow}
        </p>
        <h2 className={styles.ContactGridTitle}>{description}</h2>
      </div>
      {action}
      {videoSrc && (
        <video className={cx(styles.BackgroundVideo, !contactEmail && styles.BackgroundVideo_OnHover)} autoPlay loop playsInline muted>
          <source src={videoSrc} type={videoType(videoSrc)} />
        </video>
      )}
      {/* Olwtelet: a still image is not a background video. It gets its own frame, inside the card and clear of its
          text and arrow, with a framing per content (contact.module.css, "TileMedia") */}
      {!videoSrc && imageSrc && (
        <span className={cx(styles.TileMedia, imageFraming === 'mark' ? styles.TileMedia_Mark : styles.TileMedia_Poster)} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" loading="lazy" decoding="async" />
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ title move (variants `vV`, module 18554)
// initial {left:50%, top:50%, x:-50%, y:-50%, scale: custom==='mobile' ? 1 : 1.2} → animate {left:0%, top:-18%, x:0%,
// y:0%, scale:1} with {delay:.6, duration:.8, ease:[.64,.01,.01,1]}. `custom` comes from a width hook whose first
// value is 0 ⇒ 'mobile' ⇒ the 1.2 scale never applies (MEASURED matrix(1,…)). Driven here by ONE progress value so
// left/top and the x/y transform stay in step as in the original (framer 14 resolves the %-keyframes of left/top
// later than x/y — MEASURED ~240 ms apart on a dev hard load — which visibly bent the path).
const TITLE_DELAY_MS = 600;
const TITLE_DURATION_MS = 800;
const mixPct = (from: number, to: number) => (v: number) => `${from + (to - from) * v}%`;
function TitleMove({ children }: { children: ReactNode }) {
  const p = useMotionValue(0);
  const left = useTransform(p, mixPct(50, 0));
  const top = useTransform(p, mixPct(50, -18));
  const xy = useTransform(p, mixPct(-50, 0));
  // timed from the open frame with rAF timestamps (see openContext.ts)
  useOnContactOpen((t0) => {
    const ease = cubicBezier(EASE_VV);
    const step = (ts: number) => {
      const k = Math.min(Math.max((ts - t0 - TITLE_DELAY_MS) / TITLE_DURATION_MS, 0), 1);
      p.set(k <= 0 ? 0 : k >= 1 ? 1 : ease(k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return (
    <motion.div className={styles.ContactTitle} style={{ left, top, x: xy, y: xy }}>
      {children}
    </motion.div>
  );
}

/** `p.Contact_Step` "LET'S TALK": initial {opacity:0} → animate {opacity:1}, transition {delay:1.4} (framer's
 *  default opacity tween: 0.3 s, ease [.25,.1,.35,1]) — started on the open frame (openContext.ts). */
function StepLabel({ children }: { children: ReactNode }) {
  const opacity = useMotionValue(0);
  useOnContactOpen((t0) => {
    animate(opacity, 1, { delay: 1.4, startTime: t0 });
  });
  return (
    <motion.p className={styles.Step} style={{ opacity }}>
      {children}
    </motion.p>
  );
}

// ------------------------------------------------------------------ step 1 (`ee`)
function StepOne({ data, onNavigate, step }: { data: ContactDocumentData; onNavigate: (s: number) => void; step: number }) {
  const contactFlowStep = useAppStore((s) => s.contactFlowStep);
  const tabIndex = contactFlowStep === 1 ? 0 : -1;
  return (
    // Olwtelet: the steps are stacked and translated, all in the DOM. The replica only took some of the other steps'
    // controls out of the Tab order (tabIndex -1): Tab from the privacy link reached step 2 (its scroll container, the
    // checkboxes, an invisible field) and scrolled the modal into it. A step that is not shown is now inert.
    <div className={cx(styles.ContactContentContainer, styles.ContactContentContainer_Centered)} inert={contactFlowStep !== 1} data-contact-step={1}>
      <div className={styles.ContactContentInner}>
        <TitleMove>
          <StepLabel>
            <span />
            {'VAMOS CONVERSAR'}
          </StepLabel>
          <h1>{data.step_1_title}</h1>
        </TitleMove>
        <div className={styles.ContactGrid}>
          <button onClick={() => onNavigate(step + 1)} tabIndex={tabIndex}>
            <Tile
              eyebrow={data.step_1_project_enquiry_eyebrow}
              description={data.step_1_project_enquiry_description}
              videoSrc={data.step_1_project_bg_video}
              imageSrc={data.step_1_project_bg_image}
              imageFraming="mark"
            />
          </button>
          {data.step_1_veil_href && (
            <a className={styles.ContactGridTileLink} href={data.step_1_veil_href} tabIndex={tabIndex}>
              <Tile
                eyebrow={data.step_1_veil_enquiry_eyebrow}
                description={data.step_1_veil_enquiry_description}
                videoSrc={data.step_1_veil_bg_video}
                imageSrc={data.step_1_veil_bg_image}
                imageFraming="poster"
              />
            </a>
          )}
          <Tile
            tabIndex={tabIndex}
            eyebrow={data.step_1_partnerships_enquiry_eyebrow}
            description={data.step_1_partnerships_enquiry_desc}
            videoSrc={data.step_1_partnerships_bg_video}
            contactEmail={data.step_1_partnerships_email}
            contactWhatsapp={data.step_1_partnerships_whatsapp}
            contactLinkedin={data.step_1_partnerships_linkedin}
          />
        </div>
        {/* Olwtelet: on phones the link follows the cards (contact.module.css), so it never covers the last one */}
        <Link className={styles.PrivacyLinkInline} href="/privacy-policy" tabIndex={tabIndex}>
          <p>Política de privacidade</p>
        </Link>
      </div>
      <Link href="/privacy-policy">
        <p>Política de privacidade</p>
      </Link>
    </div>
  );
}

// ------------------------------------------------------------------ step 2 wrapper (`ey`)
function StepTwo({ onNavigate, step, children }: { onNavigate: (s: number) => void; step: number; children: ReactNode }) {
  const { contactFormComplexity, contactFlowStep } = useAppStore((s) => ({ contactFormComplexity: s.contactFormComplexity, contactFlowStep: s.contactFlowStep }), (a, b) => a.contactFormComplexity === b.contactFormComplexity && a.contactFlowStep === b.contactFlowStep);
  const complexityClass = contactFormComplexity === 1 ? styles.FormContainer_ComplexityMedium : contactFormComplexity === 2 ? styles.FormContainer_ComplexityFull : undefined;
  return (
    <div className={cx(styles.ContactContentContainer, styles.ContactContentContainer_StepTwo)} inert={contactFlowStep !== 2} data-contact-step={2}>
      <div className={styles.ContactStepTwoInner}>
        <button className={styles.PrevButtonContainer} onClick={() => onNavigate(step - 1)} aria-label="Etapa anterior" role="button" tabIndex={contactFlowStep === 2 ? 0 : -1}>
          <ArrowIcon />
        </button>
        <section className={cx(styles.FormContainer, complexityClass)}>{children}</section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ step 3 (`ed`)
function StepThree({ data, modal }: { data: ContactDocumentData; modal?: boolean }) {
  const { handlePageTransition } = usePageTransition();
  const { contactFlowStep, name } = useAppStore((s) => ({ contactFlowStep: s.contactFlowStep, name: s.name }), (a, b) => a.contactFlowStep === b.contactFlowStep && a.name === b.name);
  const tabIndex = contactFlowStep === 3 ? 0 : -1;
  const close = useContactClose();
  const message = [...(data.step_3_success_message ?? [])].map((b) => (b.type === 'heading1' && name ? { ...b, text: (b.text ?? '').replace(NAME_TOKEN, name) } : b));
  return (
    <div className={cx(styles.ContactContentContainer, styles.ContactContentContainer_Centered)} tabIndex={tabIndex} inert={contactFlowStep !== 3} data-contact-step={3}>
      <div className={styles.StepThreeWrapper}>
        <p className={styles.Step}>{'CONCLUÍDO'.replace(NAME_TOKEN, name)}</p>
        <RichText field={message} />
        {data.step_3_next_steps && (
          <div className={styles.NextStepsWrapper}>
            {data.step_3_next_steps.map(({ message: m }, i) => (
              <div key={i} className={styles.NumberedBox}>
                {m}
              </div>
            ))}
          </div>
        )}
        <button
          className={cx(styles.Button, typography.LargeBody)}
          // Olwtelet: inside the modal, the modal's own close (one way out: closes the dialog, then navigates once)
          onClick={() => {
            if (modal && close) void close('finish');
            else handlePageTransition(ROUTES.home);
          }}
          tabIndex={tabIndex}
        >
          Concluir
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ container (`tw`)
const CONTAINER_SPRING = { type: 'spring', stiffness: 65, damping: 12 } as const;

export function ContactForm({ contactData, modal }: { contactData: ContactData; modal?: boolean }) {
  const sound = useOptionalSound();
  // entrance fade: `initial {opacity:0}` → `animate {opacity:1}` with the container spring, started on the open
  // frame (openContext.ts); `y` stays declarative (step changes)
  const opacity = useMotionValue(0);
  useOnContactOpen((t0) => {
    animate(opacity, 1, { ...CONTAINER_SPRING, startTime: t0 });
  });
  // whole-store subscription as the original (`(0, m.P)()`); appStore.set notifies on every call, as zustand, so the
  // mount-time setContactFlowStep(1) re-renders the flow even when the step is already 1.
  const { contactFlowStep } = useAppStore();
  const [isShortScreen, setIsShortScreen] = useState(false);
  const y = isShortScreen ? `-${400 * (contactFlowStep - 1)}px` : `-${100 * (contactFlowStep - 1)}vh`;

  useEffect(() => {
    if (sound?.clickOnly) sound.setClickOnly(false);
    const mq = window.matchMedia('(max-height: 400px)');
    const onChange = (e: MediaQueryListEvent) => setIsShortScreen(e.matches);
    setIsShortScreen(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSuccess = useCallback(() => setContactFlowStep(3), []);

  useEffect(() => {
    setContactFlowStep(1);
  }, []);

  // Olwtelet: the step left behind becomes inert, so the control that changed the step (a step-1 card, "Etapa
  // anterior", the submit button) loses focus; focus moves to the first control of the new step. A button or the step
  // itself, never a text field (that would open the keyboard on a phone after a tap).
  const inner = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const a = document.activeElement;
    if (a && a !== document.body && !a.closest('[inert]')) return;
    const stepEl = inner.current?.querySelector<HTMLElement>(`[data-contact-step="${contactFlowStep}"]`);
    const SEL = 'button:not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [tabindex="0"]';
    const target = stepEl?.matches(SEL) ? stepEl : stepEl?.querySelector<HTMLElement>(SEL);
    target?.focus({ preventScroll: true });
  }, [contactFlowStep]);

  const data = contactData.data;
  return (
    <div className={cx(styles.ContactContainer, modal && styles.ContactContainer_Modal)}>
      <motion.div
        ref={inner}
        className={styles.ContactContainerInner}
        initial={{ y: 0 }}
        animate={{ y }}
        style={{ opacity }}
        transition={CONTAINER_SPRING}
      >
        <Box wrapper grid>
          <StepOne data={data} onNavigate={setContactFlowStep} step={1} />
        </Box>
        <StepTwo onNavigate={setContactFlowStep} step={2}>
          <ContactFormFields data={data} onSuccess={onSuccess} />
        </StepTwo>
        <Box wrapper grid>
          <StepThree data={data} modal={modal} />
        </Box>
      </motion.div>
    </div>
  );
}

export default ContactForm;
