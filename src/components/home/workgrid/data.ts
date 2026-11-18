// Server-only data builder for the work grid. Olwtelet Productions: the tiles are the projects of
// src/content/brand.ts (one published, one in development), joined by id with the generated blueprint
// (src/content/blueprint.json, written by scripts/brand/build-brand-assets.mjs together with the atlases). Every
// other slot of the 11×11 grid shows one of the blueprint's empty-cell designs (WorkGridCanvas), never a copy of a
// project. All URLs are local public paths.
import 'server-only';
import { PROJECTS } from '@/content/brand';
import { getBlueprint } from '@/lib/content';
import type { WorkGridAtlas, WorkGridData, WorkGridEmptyCell, WorkGridTile } from './types';

export type { WorkGridData };

/** Generated intro frame sets (see public/assets/intro/sets.json). */
const FRAME_BASE = '/assets/intro/';
const DESKTOP_SETS = 6;
const MOBILE_SETS = 3;
const FRAMES_PER_SET = 25;

type Cell = { id: string; uid: string; atlas: { index: number; cellX: number; cellY: number } };
type EmptyCell = { variant: string; atlas: { index: number; cellX: number; cellY: number } };

let cache: WorkGridData | null = null;

export function getWorkGridData(): WorkGridData {
  if (cache) return cache;
  const blueprint = getBlueprint() as unknown as { atlases: WorkGridAtlas[]; cells: Cell[]; emptyCells: EmptyCell[] };

  const tiles: WorkGridTile[] = [];
  for (const p of PROJECTS) {
    const c = blueprint.cells.find((x) => x.id === p.id);
    if (!c) throw new Error(`[workgrid] no atlas cell for ${p.id}: run scripts/brand/build-brand-assets.mjs atlas`);
    tiles.push({
      atlasIndex: c.atlas.index,
      slug: p.uid,
      id: p.id,
      launchDate: '',
      cell: [c.atlas.cellX, c.atlas.cellY],
      filters: { services: [], zones: [p.kind], clients: ['olwtelet'], features: [...p.categories] },
      status: p.status,
      slot: p.gridSlot,
    });
  }
  const empty: WorkGridEmptyCell[] = blueprint.emptyCells.map((e) => ({ variant: e.variant, atlasIndex: e.atlas.index, cell: [e.atlas.cellX, e.atlas.cellY] }));

  cache = {
    atlases: blueprint.atlases.map((a) => ({ ...a })),
    tiles,
    empty,
    intro: {
      frameBase: FRAME_BASE,
      desktopSets: DESKTOP_SETS,
      mobileSets: MOBILE_SETS,
      framesPerSet: FRAMES_PER_SET,
      markUrl: '/assets/models/olwtelet-mark.glb',
      particleUrl: '/assets/images/particle.jpg',
    },
  };
  return cache;
}

export default getWorkGridData;
