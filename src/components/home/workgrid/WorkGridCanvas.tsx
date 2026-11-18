'use client';
// The home WebGL scene (grid-engine): R3F <Canvas> with the intro (pixel mosaic, particle mark, black occluder), the
// infinite work grid and the distortion/vignette post-processing. Port of the original module 55607 (`tA` canvas part,
// `ex`, `H`, `te`, classes G/O/A/N/F/Y/R/S/L) + module 15888 (Canvas wrapper). docs/recon/grid-engine.md,
// docs/recon/intro-and-chrome.md, docs/recon/home-interaction.md §2-4.
//
//   <div#work-grid.SceneWrapper.SceneWrapper_Fixed[.SceneWrapper_DisableTouch while transitioning]>
//     <Canvas frameloop="demand" linear gl={{antialias, NoToneMapping, alpha}} camera={{(0,0,3.43), fov 85, near .001, far 1000}}>
//       PerformanceMonitor(onDecline → graphicsTier LOW) · Scene(intro + grid) · PostFX
//
// Rendered only when WebGL2 is available (original: otherwise no canvas is mounted).
import { Canvas, useLoader, type RootState } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
// introStore first: it installs the DefaultLoadingManager progress callbacks before the mark preload below
import { introStore, pickIntroFrames, useIntro } from './introStore';
import { useTransitionNavigate } from '@/components/transition/usePageTransition';
import { cx } from '@/lib/cx';
import { appStore, setHomeView, useAppStore } from '@/lib/store';
import { useMediaQueries } from '@/lib/useMediaQueries';
import { CAMERA_Z } from './engine/env';
import type { GridTile } from './engine/grid';
import { PerformanceMonitor } from './scene/PerformanceMonitor';
import { PostFX } from './scene/PostFX';
import { Scene } from './scene/Scene';
import s from './scene.module.css';
import type { WorkGridData, WorkGridEmptyCell, WorkGridTile } from './types';

// Preloaded at module scope like the original's model (first DefaultLoadingManager batch → the loader text split + the
// first `R` call). Same URL as WorkGridData.intro.markUrl (data.ts).
const MARK_URL = '/assets/models/olwtelet-mark.glb';
if (typeof window !== 'undefined') useLoader.preload(GLTFLoader, MARK_URL);

const GL = { antialias: true, toneMapping: THREE.NoToneMapping, alpha: true } as const;
const CAMERA = { position: new THREE.Vector3(0, 0, CAMERA_Z), fov: 85, near: 0.001, far: 1e3 };
const GRID_SIZE = 11;
const SPIRAL_DIRS = [new THREE.Vector2(0, 1), new THREE.Vector2(1, 0), new THREE.Vector2(0, -1), new THREE.Vector2(-1, 0)]; // y

/** Original 11×11 square spiral from (5,5): directions up, right, down, left; run lengths 1,1,2,2,3,3,… */
function spiral(e: number): THREE.Vector2[] {
  const t: THREE.Vector2[] = [];
  const i = new THREE.Vector2(Math.floor(e / 2), Math.floor(e / 2));
  t.push(i.clone());
  let s2 = 0;
  let r = 1;
  while (t.length < e * e) {
    for (let k = 0; k < 2; k++) {
      const n = SPIRAL_DIRS[s2];
      for (let q = 0; q < r; q++) {
        if (t.length >= e * e) return t;
        i.add(n);
        t.push(i.clone());
      }
      s2 = (s2 + 1) % SPIRAL_DIRS.length;
    }
    r++;
  }
  return t;
}
const SPIRAL = spiral(GRID_SIZE);

/**
 * Empty-cell design per grid position: a greedy colouring of the 11×11 torus (the grid wraps), so no two cells that
 * touch — across the wrap seams included — share a design. The order of the candidate designs is varied per cell
 * (a fixed hash) so the pattern does not read as diagonal stripes. 5 designs are enough for 4 neighbours.
 */
function designTable(n: number): number[] {
  const t = new Array<number>(GRID_SIZE * GRID_SIZE).fill(-1);
  const at = (x: number, y: number) => t[((y + GRID_SIZE) % GRID_SIZE) * GRID_SIZE + ((x + GRID_SIZE) % GRID_SIZE)];
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++) {
      const used = new Set([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)]);
      const start = (x * 7 + y * 13 + x * y * 3) % n;
      for (let k = 0; k < n; k++) {
        const c = (start + k) % n;
        if (!used.has(c)) {
          t[y * GRID_SIZE + x] = c;
          break;
        }
      }
    }
  return t;
}
const DESIGNS = new Map<number, number[]>();
function emptyTileFor(slot: number, empty: WorkGridEmptyCell[]): GridTile {
  const p = SPIRAL[slot];
  if (!DESIGNS.has(empty.length)) DESIGNS.set(empty.length, designTable(Math.max(empty.length, 1)));
  // rotation by 3: the least frequent colour of the table (19 of 121 cells) goes to the last design, the dark surface
  const e = empty[(DESIGNS.get(empty.length)![p.y * GRID_SIZE + p.x] + 3) % empty.length];
  return {
    atlasIndex: e ? e.atlasIndex : -1,
    slug: '',
    id: `empty-${slot}`,
    launchDate: '',
    atlasCellPosition: new THREE.Vector2(e ? e.cell[0] : 0, e ? e.cell[1] : 0),
    workGridPosition: SPIRAL[slot].clone(),
    filters: { services: [], zones: [], clients: [], features: [] },
    clickable: false,
  };
}

/**
 * Marks the moment the scene Suspense boundary resolves (all intro textures + the mark model loaded). A passive effect placed
 * after the scene: it runs after the Carousel has been created (CarouselView's passive effect), so — as on the original,
 * where beginIntroAnimation can only commit once the Canvas stops suspending — the loader exit / follower and the GL
 * timeline start together with (never before) the scene's first committed frame.
 */
function AssetsReady() {
  useEffect(() => {
    introStore.setAssetsReady();
  }, []);
  return null;
}

export function WorkGridCanvas({ data }: { data: WorkGridData }) {
  const [L, S] = useState<boolean | null>(null); // WebGL2 available
  const [isForceFlat, setIsForceFlat] = useState(false);
  // Original `tA` and the Canvas wrapper (module 15888 `f`) both read the zustand store WITHOUT a selector
  // (`(0,p.P)()`), so they re-render on every store write, whatever the field.
  const { workGridFilters: E, isTransitioning: T } = useAppStore();
  const begin = useIntro((st) => st.begin);
  const O = useMediaQueries();
  const navigate = useTransitionNavigate();

  // Original R3F Canvas quirk (its R3F build, chunk 51749ec1): every Canvas render calls `root.configure({size})`, and
  // `configure` compares the react-use-measure rect {x,y,top,left,width,height,bottom,right} with the store size
  // {width,height,top,left} using `is.equ(…, {objects:'shallow', strict:false})`, which fails on the extra keys, so
  // `setSize` runs on EVERY Canvas render → R3F store write → `invalidate()` → one frame. With frameloop="demand" this
  // is what draws the grid while the pathname is not "/" (isWorkGridRender false: no per-frame invalidation), e.g. the
  // home re-mounted under the /contact modal (MEASURED: the frame after the 1500 ms `R` timer re-render draws the full
  // grid, docs/evidence/grid-engine/wave-b/privacy-back/). This call was added for R3F 9.8.2, which only applies a
  // changed size. Since 2026-11-10 the pinned R3F is 9.5.0, the original's version, which has the quirk itself
  // (computeInitialSize keeps the extra rect keys), so its own store subscription already invalidates on every render.
  // The call below is now redundant but harmless: `invalidate(state, 1)` sets `internal.frames = 1`, it does not add.
  // It is kept because the grid validation of 2026-11-10 (docs/evidence/verify/chain/SUMMARY.md §6) ran with it.
  // Device pixel ratio: no `dpr` prop, as on the original (default [1, 2], re-applied by `configure` on every Canvas
  // render; R3F 9.5.0 has no matchMedia listener).
  const rootRef = useRef<RootState | null>(null);
  useLayoutEffect(() => {
    rootRef.current?.invalidate();
  });

  // random frame set per mount (original useMemo([]))
  const j = useMemo(
    () => pickIntroFrames(data.intro.frameBase, data.intro.desktopSets, data.intro.mobileSets, data.intro.framesPerSet),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const C = O.isMinMedium ? j.desktop : j.mobile;

  // project tiles (original `b`), each keeping its own spiral slot
  const b = useMemo<Array<GridTile & { slot: number }>>(
    () =>
      data.tiles.map((t: WorkGridTile) => ({
        atlasIndex: t.atlasIndex,
        slug: t.slug,
        id: t.id,
        launchDate: t.launchDate,
        atlasCellPosition: new THREE.Vector2(t.cell[0], t.cell[1]),
        workGridPosition: SPIRAL[t.slot].clone(),
        filters: t.filters,
        clickable: true,
        slot: t.slot,
      })),
    [data.tiles],
  );

  const emptyCells = data.empty;
  // original `F` (AND filtering of every selected value), adapted to a catalogue smaller than the grid: the 121 slots
  // are an explicit map, each project at its own slot (once per 11×11 period, never repeated to fill), every other
  // slot an empty-cell design. A project that does not match the filters leaves its slot empty; no placeholder copies.
  const F = useMemo<GridTile[]>(() => {
    const zones = E.zone ? [E.zone] : [];
    const clients = E.client ? [E.client] : [];
    const features = E.feature ? [E.feature] : [];
    const services = E.service ? [E.service] : [];
    const bySlot = new Map<number, GridTile>();
    for (const e of b) {
      let ok = true;
      for (const t of services) if (!e.filters.services.includes(t)) ok = false;
      for (const t of clients) if (!e.filters.clients.includes(t)) ok = false;
      for (const t of zones) if (!e.filters.zones.includes(t)) ok = false;
      for (const t of features) if (!e.filters.features.includes(t)) ok = false;
      if (ok) bySlot.set(e.slot, { ...e, workGridPosition: SPIRAL[e.slot].clone() });
    }
    const r: GridTile[] = [];
    for (let k = 0; k < GRID_SIZE * GRID_SIZE; k++) r.push(bySlot.get(k) ?? emptyTileFor(k, emptyCells));
    return r;
  }, [E, b, emptyCells]);

  // original `R`: setTimeout(() => setBeginIntro(true), loaderDelay) — from Canvas onCreated (never cancelled)
  const R = useCallback((st: RootState) => {
    rootRef.current = st;
    introStore.scheduleBegin();
  }, []);

  // original: `useEffect(() => { let e = isWebGL2Available(); S(e); e || k("list") }, [L, k])` — `k` is
  // setCaseStudyView, a store field nothing in the original ever reads (grep of every chunk), so without WebGL2 the
  // visitor just gets no canvas and the list stays closed. Since the view moved to WorkGrid's component state (as the
  // original's), the local homeView is not read either, so the write is mirrored, deps included.
  useEffect(() => {
    const ok = WebGL.isWebGL2Available();
    S(ok);
    if (!ok) setHomeView('list');
  }, [L]);
  useEffect(() => () => introStore.reset(), []);

  const onProjectClick = useCallback(
    (e: string) => {
      setIsForceFlat(true);
      navigate(`/projects/${e}`);
    },
    [navigate],
  );

  if (!L || !C.length) return null;
  return (
    <div id="work-grid" className={cx(s.SceneWrapper, s.SceneWrapper_Fixed, T && s.SceneWrapper_DisableTouch)} style={{ visibility: 'visible' }}>
      <Canvas frameloop="demand" gl={GL} linear camera={CAMERA} onCreated={R}>
        <Suspense fallback={null}>
          <PerformanceMonitor onDecline={() => appStore.set({ graphicsTier: 1 })} />
          <Scene
            gridTiles={F}
            atlases={data.atlases}
            introFrames={C}
            onProjectClick={onProjectClick}
            beginIntroAnimation={begin}
            markUrl={data.intro.markUrl}
            particleUrl={data.intro.particleUrl}
          />
          <PostFX isForceFlat={isForceFlat} />
          <AssetsReady />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default WorkGridCanvas;
