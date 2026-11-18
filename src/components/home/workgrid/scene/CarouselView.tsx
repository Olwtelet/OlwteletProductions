'use client';
// Original `H` ("Carousel" forwardRef, module 55607 L1698-1764): owns the THREE `Carousel` group instance.
//   - created once the atlases exist (skipIntro = workgridState === 'work' at creation → tiles start at opacity 0)
//   - isVideoPaused ? fadeOut() : fadeIn()
//   - on transition start: target '/' → center() + fadeIn(), else fadeOut()   (target path WITHOUT query, module 96383 aM)
//   - filters change → setTiles() + setOpacity(1), instantly
//   - per frame: carousel.update(dt) with dt = (performance.now() − last)·0.001
import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type * as THREE from 'three';
import { appStore, useAppStore } from '@/lib/store';
import { stripSearch, ROUTES } from '@/lib/theme';
import { Carousel } from '../engine/Carousel';
import { debugEnabled } from '../engine/env';
import type { GridTile } from '../engine/grid';
import type { WorkGridAtlas } from '../types';

export interface CarouselHandle {
  setOpacity: (v: number) => void;
}

function useDeltaTime() {
  const last = useRef(performance.now());
  const dt = useRef(0);
  useFrame(() => {
    const e = performance.now();
    dt.current = (e - last.current) * 0.001;
    last.current = e;
  });
  return { deltaTimeRef: dt };
}

export const CarouselView = forwardRef<
  CarouselHandle,
  { atlases: WorkGridAtlas[]; tiles: GridTile[]; onProjectClick: (slug: string) => void; isVideoPaused: boolean; fadeIn: boolean }
>(function CarouselView({ atlases, tiles, onProjectClick, isVideoPaused, fadeIn }, ref) {
  const { deltaTimeRef } = useDeltaTime();
  const [u, setU] = useState<Carousel | null>(null);
  const v = useRef<Carousel | null>(null);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // original `H`: `{ isTransitioning: x, transition: g } = (0, p.P)()` (whole store, re-renders on every write)
  const { isTransitioning, transition } = useAppStore();

  useFrame(() => {
    if (v.current) v.current.update(deltaTimeRef.current);
  });

  useEffect(() => {
    if (!atlases.length || u) return;
    const i = new Carousel(atlases, tiles, gl.domElement, fadeIn, camera);
    v.current = i;
    setU(i);
    if (debugEnabled()) {
      const w = window as unknown as { __grid?: Carousel; __grids?: Carousel[]; __wgStore?: typeof appStore };
      w.__grids = w.__grids || [];
      w.__grids.push(i);
      w.__grid = i;
      w.__wgStore = appStore;
    }
  }, [u, tiles, atlases, gl.domElement, fadeIn, camera]);

  useEffect(() => {
    if (u) {
      if (isVideoPaused) u.fadeOut();
      else u.fadeIn();
    }
  }, [isVideoPaused, u]);

  useEffect(() => {
    const g = transition; // render-time value, as the original closure
    if (g && u) {
      if (stripSearch(g.to) === ROUTES.home) {
        u.center();
        u.fadeIn();
      } else u.fadeOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransitioning]);

  useEffect(() => {
    if (u) {
      u.onProjectSelect = onProjectClick;
      return () => {
        u.dispose();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u]);

  useEffect(() => {
    if (u) {
      u.setTiles(tiles);
      u.setOpacity(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles]);

  useImperativeHandle(ref, () => ({
    setOpacity: (e: number) => {
      u?.setOpacity(e);
    },
  }));

  return u ? <primitive object={u} /> : null;
});

export default CarouselView;
