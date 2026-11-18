'use client';
// Original slice `copy_section` (chunk 6472: modules 56472, 90998 RowsMain wrapper, 37723 twoColumnsAuto,
// 19597 "LAST UPDATED" label). docs/recon/project-template.md §6.3.
//   section.Section[data-slice-*] > Section(hr + grid) > Stagger > [Label(label), div.RowsMain.HasColumns >
//   div.Description > PrismicRichText(description), lastUpdated && p.Label "LAST UPDATED: …"]
// Only `twoColumnsAuto` occurs in project data (FROM-DATA). The other variations of the original code
// (default, caseStudyAbout, caseStudyAwards, title, twoColumnsManual, twoColumnsAutoVideo) belong to non-project
// templates and are not rendered by any project; unknown variations render the bare section, as the original
// switch falls through to `undefined`.
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { label as labelStyles, typography } from '@/components/ui/typography';
import { useAppStore } from '@/lib/store';
import { cx } from '@/lib/cx';
import type { PrismicData } from '@/lib/types';
import { CaseStudyRichText } from '../richText';
import { Label, Section, Stagger } from '../Section';
import s from './slices.module.css';

/** module 19597 */
function LastUpdated({ date }: { date: string }) {
  return <motion.p className={cx(typography.MonoDetail, labelStyles.LabelEnd)}>ATUALIZADO EM: {date}</motion.p>;
}

/** module 90998 */
function Rows({ label, lastUpdated, children, hasColumns = false }: { label?: string | null; lastUpdated?: string | null; children?: ReactNode; hasColumns?: boolean }) {
  return (
    <Stagger>
      {label && <Label>{label}</Label>}
      <div className={cx(s.RowsMain, hasColumns && s.HasColumns)}>{children}</div>
      {lastUpdated && <LastUpdated date={lastUpdated} />}
    </Stagger>
  );
}

/** module 37723 (twoColumnsAuto) */
function TwoColumnsAuto({ content }: { content: PrismicData }) {
  const lastUpdated = useAppStore((st) => st.lastUpdated);
  return (
    <Rows hasColumns label={content.label} lastUpdated={lastUpdated}>
      <div className={s.CopyDescription}>
        <CaseStudyRichText field={content.description} />
      </div>
    </Rows>
  );
}

export default function CopySection({ slice }: { slice: PrismicData }) {
  return (
    <section className={s.CopySection} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      <Section>{slice.variation === 'twoColumnsAuto' ? <TwoColumnsAuto content={slice.primary} /> : null}</Section>
    </section>
  );
}
