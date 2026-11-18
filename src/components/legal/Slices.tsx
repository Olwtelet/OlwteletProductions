'use client';
// copy_section slices of the generic CMS page route (app/[uid]) — original client modules:
//   90998 Row({label, last_updated, children, hasColumns}) = Stagger[ Label?, div.RowsMain(.HasColumns), LastUpdated? ]
//   66416 Label  = p.typography_MonoDetail.styles_Label__MI0Aa (motion.p)
//   19597 LastUpdated = p.typography_MonoDetail.styles_Label__7QeQ9 "LAST UPDATED: <date>" (motion.p)
//   29853 title slice            = Stagger[ LastUpdated?, h1.typography_MidTitle.styles_Title__FzKow ]
//   34149 default slice          = Row(label, lastUpdated){ PrismicRichText(description) }  (no RichText styling)
//   77527 twoColumnsManual slice = Row(hasColumns){ per column row: div.ColumnsSection[ RichText.Column.Left,
//                                  RichText.Column.Right.Margin (+ consent radios when content.cta.type) ] }
// `lastUpdated` comes from the global store (the original "LAST UPDATED" bleed quirk; nothing sets it here).
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { label, typography } from '@/components/ui/typography';
import { useCookieConsent } from '@/lib/consent';
import { cx } from '@/lib/cx';
import { RichText } from '@/lib/prismic/RichText';
import { useAppStore } from '@/lib/store';
import type { RichTextField } from '@/lib/types';
import { Stagger } from './Stagger';
import styles from './legal.module.css';

export function SectionLabel({ children }: { children: ReactNode }) {
  return <motion.p className={cx(typography.MonoDetail, label.Label)}>{children}</motion.p>;
}

export function LastUpdated({ date }: { date: string }) {
  return <motion.p className={cx(typography.MonoDetail, label.LabelEnd)}>ATUALIZADO EM: {date}</motion.p>;
}

export function Row({
  label: rowLabel,
  last_updated,
  children,
  hasColumns = false,
}: {
  label?: string | null;
  last_updated?: string | null;
  children: ReactNode;
  hasColumns?: boolean;
}) {
  return (
    <Stagger>
      {rowLabel && <SectionLabel>{rowLabel}</SectionLabel>}
      <div className={cx(styles.RowsMain, hasColumns && styles.HasColumns)}>{children}</div>
      {last_updated && <LastUpdated date={last_updated} />}
    </Stagger>
  );
}

export interface TitleSliceContent {
  label?: string | null;
  title?: string | null;
}
export function TitleSlice({ content }: { content: TitleSliceContent }) {
  const lastUpdated = useAppStore((s) => s.lastUpdated);
  return (
    <Stagger>
      {!!lastUpdated && <LastUpdated date={lastUpdated} />}
      <h1 className={cx(typography.MidTitle, styles.Title)}>{content.title}</h1>
    </Stagger>
  );
}

export interface DefaultSliceContent {
  label?: string | null;
  description?: RichTextField;
}
export function DefaultSlice({ content }: { content: DefaultSliceContent }) {
  const lastUpdated = useAppStore((s) => s.lastUpdated);
  return (
    <Row label={content.label} last_updated={lastUpdated}>
      <RichText field={content.description ?? []} />
    </Row>
  );
}

/** module 77527 `d` — Accept/Decline radios bound to the cookie consent (only when the column row has a cta). */
function ConsentRadios() {
  // Olwtelet: only when analytics is configured (otherwise there is no choice to make)
  return ANALYTICS_CONFIGURED ? <ConsentRadiosView /> : null;
}
const ANALYTICS_CONFIGURED = !!process.env.NEXT_PUBLIC_GA_ID;
function ConsentRadiosView() {
  const { setShowCookieBanner, setIsConsent, isConsent, handleCookieBanner } = useCookieConsent();
  const choose = (v: boolean) => {
    handleCookieBanner(v);
    setIsConsent(v);
    if (v) setShowCookieBanner(false);
  };
  return (
    <div className={styles.Consent}>
      <fieldset>
        <div>
          <input type="radio" id="accept" name="contact" value="accept" checked={isConsent} onChange={() => choose(true)} />
          <label htmlFor="accept">Aceitar</label>
        </div>
        <div>
          <input type="radio" id="decline" name="contact" value="decline" checked={!isConsent} onChange={() => choose(false)} />
          <label htmlFor="decline">Recusar</label>
        </div>
      </fieldset>
    </div>
  );
}

export interface TwoColumnsContent {
  label?: string | null;
  columns: { left_column?: RichTextField; right_column?: RichTextField }[];
  cta?: { type?: string | null } | null;
}
export function TwoColumnsManualSlice({ content }: { content: TwoColumnsContent }) {
  const lastUpdated = useAppStore((s) => s.lastUpdated);
  return (
    <Row hasColumns label={content.label} last_updated={lastUpdated}>
      {content.columns.map((col, i) => (
        <div key={i} className={styles.ColumnsSection}>
          <motion.div className={cx(styles.RichText, styles.Column, styles.Column_Left)}>
            <RichText field={col.left_column ?? []} />
          </motion.div>
          <motion.div className={cx(styles.RichText, styles.Column, styles.Column_Right, styles.Column_Margin)}>
            <RichText field={col.right_column ?? []} />
            {content.cta?.type && <ConsentRadios />}
          </motion.div>
        </div>
      ))}
    </Row>
  );
}
