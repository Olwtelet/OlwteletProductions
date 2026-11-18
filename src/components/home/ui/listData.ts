// List-view data rules. Olwtelet Productions: the list is built from src/content/brand.ts (PROJECTS) and grouped by
// status — published first, then in development — instead of by launch year (no launch date is confirmed).
// Filters keep the original URL keys: `zone` = project type (web, jogo), `feature` = category.
// Client-safe (pure data); the server page passes `ListProject[]` as props.
import { CATEGORIES, KINDS, PROJECTS, STATUS_LABEL, inDevelopmentCountLabel, publishedCountLabel, type BrandProject, type ProjectStatus } from '@/content/brand';
import type { WorkGridFilters } from '@/lib/store';

export interface ListProject {
  uid: string;
  title: string;
  status: ProjectStatus;
  statusLabel: string;
  /** project type uid (filter `zone`) */
  kindUid: string;
  kindName: string;
  /** category uids (filter `feature`) and their names (pills) */
  categoryUids: string[];
  categoryNames: string[];
  /** screen-reader paragraph */
  summary: string;
  /** right column: the public address, or "Apresentação do projeto" for an entry without a public version */
  detail: string;
}

export function toListProject(p: BrandProject): ListProject {
  return {
    uid: p.uid,
    title: p.title,
    status: p.status,
    statusLabel: STATUS_LABEL[p.status],
    kindUid: p.kind,
    kindName: KINDS[p.kind],
    categoryUids: [...p.categories],
    categoryNames: p.categories.map((c) => CATEGORIES[c]),
    summary: p.summary,
    detail: p.urlLabel ?? 'Apresentação do projeto',
  };
}

export function getListProjects(): ListProject[] {
  return PROJECTS.map(toListProject);
}

/** Type must equal, category must be one of the project's (one value per key, as the original URL keys). */
export function filterListProjects(projects: ListProject[], f: WorkGridFilters): ListProject[] {
  return projects.filter((p) => {
    if (f.zone && p.kindUid !== f.zone) return false;
    if (f.feature && !p.categoryUids.includes(f.feature)) return false;
    // no services or clients in this catalogue: a stale ?service / ?client matches nothing
    if (f.service) return false;
    if (f.client && f.client !== 'olwtelet') return false;
    return true;
  });
}

const GROUP_ORDER: ProjectStatus[] = ['published', 'in-development'];
export const GROUP_TITLE: Record<ProjectStatus, string> = { published: 'Publicados', 'in-development': 'Em desenvolvimento' };

/** Groups in a fixed order (published, in development); empty groups are left out. */
export function groupListProjects(filtered: ListProject[]): [ProjectStatus, ListProject[]][] {
  return GROUP_ORDER.map((s) => [s, filtered.filter((p) => p.status === s)] as [ProjectStatus, ListProject[]]).filter(([, g]) => g.length > 0);
}

/** "1 projeto publicado · 1 em desenvolvimento" (only the parts that exist). */
export function listCountText(filtered: ListProject[]): string {
  const pub = filtered.filter((p) => p.status === 'published').length;
  const dev = filtered.filter((p) => p.status === 'in-development').length;
  const parts: string[] = [];
  if (pub || !dev) parts.push(publishedCountLabel(pub));
  if (dev) parts.push(inDevelopmentCountLabel(dev));
  return parts.join(' · ');
}

export const LIST_TITLE = 'Todos os projetos';
export const LIST_EMPTY = { text: 'Nenhum projeto corresponde a este filtro.', cta: 'Ver todos os projetos' };
