'use client';
// Olwtelet: the Processo steps (slice `about_process_steps`, built by scripts/brand/build-content.mjs). Processo only:
// Estúdio keeps its AboutColumns rows untouched. Same language as the About pages — the 30 % rule, the mono section
// label and word reveal of the paragraphs (TextReveal), the FadeIn of the rows, the 3vw / 700 number and title token,
// the 8 / 12 / 16-column grid — with a measured lead, a readable body and one diagram per step (ProcessDiagrams.tsx).
//   section
//     intro: rule, lead (TextReveal "Etapas", at most ~16 em wide)
//     ol: li × 4 = rule, FadeIn > [number | title + body | figure (labels + diagram)]
// Layout is pure CSS (no JS media queries, so no first-render swap); processSteps.module.css.
import { FadeIn } from '@/components/ui/FadeIn';
import { TextReveal } from '@/components/ui/TextReveal';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { ProcessDiagram } from './ProcessDiagrams';
import { Separator } from './Separator';
import type { AboutSlice, ProcessStepItem, ProcessStepsPrimary } from './types';
import s from './processSteps.module.css';

export function ProcessSteps({ slice }: { slice: AboutSlice }) {
  const p = slice.primary as ProcessStepsPrimary;
  const steps = slice.items as unknown as ProcessStepItem[];
  return (
    <section className={s.ProcessSteps} data-slice-type={slice.slice_type} data-section-id={`${p.about_section_id}`} aria-label={p.sub_text ?? undefined}>
      <div className={s.Intro}>
        <div className={s.Rule}>
          <Separator />
        </div>
        <div className={s.IntroGrid}>
          <div className={s.Lead}>
            <TextReveal sectionName={p.sub_text} text={p.description ?? ''} depth="word" />
          </div>
        </div>
      </div>
      <ol className={s.Steps} role="list">
        {steps.map((st) => (
          <li key={st.step_number} className={s.Step}>
            <div className={s.Rule}>
              <Separator />
            </div>
            <FadeIn>
              <div className={s.StepGrid}>
                <span className={s.StepNumber} aria-hidden="true">
                  {st.step_number}
                </span>
                <div className={s.StepText}>
                  <h2 className={s.StepTitle}>
                    <span className="screen-reader-only">{`${st.step_number}. `}</span>
                    {st.title}
                  </h2>
                  <p className={s.StepBody}>{st.description}</p>
                </div>
                <figure className={s.StepFigure} aria-hidden="true">
                  <ul className={cx(s.FigureLabels, typography.MonoDetail)}>
                    {st.labels.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  <ProcessDiagram kind={st.diagram} className={s.FigureSvg} />
                </figure>
              </div>
            </FadeIn>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ProcessSteps;
