// "Related work" selection (server side, per request — the original page is `no-store` and its cards change
// between requests, MEASURED). The server code is not shipped, so the rule is INFERRED from the data
// (docs/recon/project-template.md §9.1 + the analysis recorded in docs/implementation/project.md):
//   candidates = visible projects (not hidden from the grid) in the SAME zone, excluding the current one, that
//                share ≥ 1 feature; ranked by shared-feature count (desc), ties in Prismic default order
//                (cmsOrderIndex)
//   card 1     = rank 0 (always the candidate with the most shared features — 117/117 snapshot pages)
//   card 2     = rank 1 or 2 (uniform)              — snapshot: card 2 is rank 1|2 in 106/106
//   card 3     = uniform rank in (card 2, 4]         — snapshot: card 3 ≤ rank 4 and > card 2 in 106/106,
//                                                     the (3,4) pair never occurs; zedd live: 4 distinct
//                                                     draws, all consistent
//   fewer candidates → fewer cards (2 when only 2 candidates share a feature; 0 without a zone).
import 'server-only';
import type { Project } from '@/lib/types';

export function relatedCandidates(project: Project, all: Project[]): Array<{ project: Project; shared: number }> {
  if (!project.zone) return [];
  const features = new Set(project.features.map((f) => f.uid).filter(Boolean) as string[]);
  return all
    .filter((q) => q.uid !== project.uid && q.zone?.uid === project.zone!.uid && !q.workGrid.hide_from_work_grid)
    .map((q) => ({ project: q, shared: q.features.filter((f) => f.uid && features.has(f.uid)).length }))
    .filter((c) => c.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.project.cmsOrderIndex - b.project.cmsOrderIndex);
}

export function pickRelated(project: Project, all: Project[], random: () => number = Math.random): Project[] {
  const ranked = relatedCandidates(project, all);
  if (ranked.length === 0) return [];
  const last = Math.min(ranked.length, 5) - 1; // highest usable rank
  const picks = [0];
  if (last >= 1) {
    const second = last >= 2 ? 1 + Math.floor(random() * Math.min(2, last - 1)) : 1;
    picks.push(second);
    if (last > second) picks.push(second + 1 + Math.floor(random() * (last - second)));
  }
  return picks.map((i) => ranked[i].project);
}
