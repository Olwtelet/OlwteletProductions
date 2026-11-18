// Server-only typed accessors over the local content snapshot (src/content/*.json).
// Never import this (or the JSON) from a client component: pass plain props instead.
import 'server-only';

import projectsJson from '@/content/projects.json';
import homeJson from '@/content/home.json';
import pagesJson from '@/content/pages.json';
import taxonomiesJson from '@/content/taxonomies.json';
import settingsJson from '@/content/settings.json';
import pageThemesJson from '@/content/page-themes.json';
import blueprintJson from '@/content/blueprint.json';

import type { Blueprint, HomeContent, PageRecord, PageThemes, Project, Settings, Taxonomies, Theme } from './types';

const projects = (projectsJson as unknown as { projects: Project[] }).projects;
const projectByUid = new Map(projects.map((p) => [p.uid, p]));
const pages = (pagesJson as unknown as { pages: PageRecord[] }).pages;
const pageByRoute = new Map(pages.map((p) => [p.route, p]));

/** All projects (src/content/projects.json, written from src/content/brand.ts), in catalogue order. */
export function getProjects(): Project[] {
  return projects;
}

/** Route uid → document uid aliases (none: every project is served at its own uid). */
export const PROJECT_ROUTE_ALIASES: Record<string, string> = {};
const DOC_TO_ROUTE_UID: Record<string, string> = Object.fromEntries(Object.entries(PROJECT_ROUTE_ALIASES).map(([r, d]) => [d, r]));

/** One project by uid (document uid or route alias), or `undefined`. */
export function getProject(uid: string): Project | undefined {
  return projectByUid.get(PROJECT_ROUTE_ALIASES[uid] ?? uid);
}

/** The uid used in the served URL for a document uid. */
export function projectRouteUid(docUid: string): string {
  return DOC_TO_ROUTE_UID[docUid] ?? docUid;
}

/** Route uids for generateStaticParams: every project of the catalogue (published and in development). */
export function getProjectUids(): string[] {
  return projects.map((p) => projectRouteUid(p.uid));
}

/** `/` content: SEO, screen-reader text, work-grid config, gridContent (verbatim), tiles, list view, filters. */
export function getHome(): HomeContent {
  return homeJson as unknown as HomeContent;
}

/**
 * Non-project route record by exact route, e.g. `getPage('/about/studio')`, `getPage('/contact')`,
 * `getPage('/privacy-policy')`, `getPage('/this-page-does-not-exist')` (404 strings).
 */
export function getPage(route: string): PageRecord | undefined {
  return pageByRoute.get(route);
}

/** All non-project route records. */
export function getPages(): PageRecord[] {
  return pages;
}

export function getTaxonomies(): Taxonomies {
  return taxonomiesJson as unknown as Taxonomies;
}

export function getSettings(): Settings {
  return settingsJson as unknown as Settings;
}

/** Route → theme map (src/content/page-themes.json). */
export function getPageThemes(): PageThemes {
  return (pageThemesJson as unknown as { map: PageThemes }).map;
}

/** dA (initial store theme + default transition fill) and n0 (fallback) theme objects. */
export function getThemeDefaults(): { initial: Theme; fallback: Theme } {
  return (pageThemesJson as unknown as { defaults: { initial: Theme; fallback: Theme } }).defaults;
}

/** Work-grid blueprint generated with the atlases (scripts/brand/build-brand-assets.mjs): local URLs, project cells, empty cells. */
export function getBlueprint(): Blueprint {
  return blueprintJson as unknown as Blueprint;
}
