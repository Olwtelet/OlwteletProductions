// "Projetos relacionados" + "Ver todos os projetos" (server-rendered on the original: RSC row 16, OUTSIDE
// PageContainer).
//   div.SimilarProjectsContainer (#222, padding 0 20px 100px) > div.SimilarProjectsWrapper.PageWrapper >
//   [ (only with ≥1 related project) h2.MidSubTitle, hr, div.SimilarProjectsCardsContainer > cards,
//     TransitionLink("/").SimilarProjectsAllWorkCta > span "Ver todos os projetos" (wraps; related.module.css) ]
// No footer follows (docs/recon/project-template.md §9).
import { TransitionLink } from '@/components/transition/TransitionLink';
import { typography } from '@/components/ui/typography';
import { RelatedCard, type RelatedProject } from './RelatedCard';
import s from './related.module.css';

export function RelatedWork({ projects }: { projects: RelatedProject[] }) {
  return (
    <div className={s.SimilarProjectsContainer}>
      <div className={s.SimilarProjectsWrapper}>
        {projects.length > 0 && (
          <>
            <h2 className={typography.MidSubTitle}>Projetos relacionados</h2>
            <hr />
            <div className={s.SimilarProjectsCardsContainer}>
              {projects.map((p) => (
                <RelatedCard key={p.uid} content={p} />
              ))}
            </div>
          </>
        )}
        <TransitionLink href="/" className={s.SimilarProjectsAllWorkCta}>
          <span>Ver todos os projetos</span>
        </TransitionLink>
      </div>
    </div>
  );
}
