'use client';
// Original `ex` (module 55607 L2158-2310): intro group + grid group, continuous invalidation on '/', and the intro
// timeline started at T0 (beginIntroAnimation):
//   particles opacity 0→1           2.5–2.9 s (gsap default ease power1.out)
//   grid tile opacity 0→1           3.1–3.8 s power3.inOut     (setOpacity(0) at T0)
//   intro group z 0→4.2             2.7–3.5 s power3.in
//   grid group z −2.75→1.45         2.8–3.8 s power3.inOut
//   particle offsets X 0→400, Y 164→400, Z 60→1586, rotY 0→240°   2.7–3.2 s power3.in
//   +3.2 s workgridState = 'work'   +4.2 s intro group unmounted
import { invalidate, useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { setWorkgridState, useAppStore } from '@/lib/store';
import { introStore } from '../introStore';
import { CarouselView, type CarouselHandle } from './CarouselView';
import { IntroGroup } from './IntroGroup';
import type { ParticleMarkHandle } from './ParticleMark';
import type { GridTile } from '../engine/grid';
import type { WorkGridAtlas } from '../types';

const GRID_GROUP_TWEEN = { duration: 1, delay: 0.3, ease: 'power3.inOut' }; // es
const INTRO_GROUP_TWEEN = { duration: 0.8, delay: 0.2, ease: 'power3.in' }; // er
const EXPLODE_TWEEN = { delay: 0.2, duration: 0.5, ease: 'power3.in' }; // en
const EXPLODE_X = 400; // eo
const EXPLODE_Y = 400; // ea
const EXPLODE_Z = 1586; // el
const EXPLODE_ROT = 240; // ec
const NULL_CAROUSEL_HANDLE: CarouselHandle = { setOpacity: () => {} };

export function Scene({
  atlases,
  gridTiles,
  introFrames,
  onProjectClick,
  beginIntroAnimation: r,
  markUrl,
  particleUrl,
}: {
  atlases: WorkGridAtlas[];
  gridTiles: GridTile[];
  introFrames: string[];
  onProjectClick: (slug: string) => void;
  beginIntroAnimation: boolean;
  markUrl: string;
  particleUrl: string;
}) {
  // original `ex`: `{ isWorkGridRender: n, workgridState: l, … } = (0, p.P)()` (whole store, re-renders on every write)
  const { isWorkGridRender: n, workgridState: l } = useAppStore();
  const [d, u] = useState(l === 'intro');
  const h = useRef<ParticleMarkHandle | null>(null);
  const v = useRef<CarouselHandle | null>(null);
  const m = useRef<THREE.Group | null>(null);
  const x = useRef<THREE.Group | null>(null);
  const g = !n && l === 'intro';
  const y = l === 'work' ? 1.45 : -2.75;

  useFrame(() => {
    if (n) invalidate();
  });
  useEffect(() => {
    invalidate();
  }, [n]);
  useEffect(
    () => () => {
      v.current = null;
      x.current = null;
      h.current = null;
      m.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!h.current || !x.current || !m.current || !v.current || !r) return;
    const gridPos = x.current.position;
    const introPos = m.current.position;
    const particle = h.current;
    gsap.to(
      { value: 0 },
      {
        value: 1,
        duration: 0.4,
        delay: 2.5,
        onUpdate: function (this: gsap.core.Tween) {
          particle.setOpacity((this.targets()[0] as { value: number }).value);
        },
      },
    );
    // original: `t = v.current` is the Carousel handle captured at T0; when T0 was gated by the intro assets the
    // Carousel is created in that same commit and the handle still holds `u = null` → every setOpacity is a no-op
    const t: CarouselHandle = introStore.get().gatedByAssets ? NULL_CAROUSEL_HANDLE : v.current;
    const i = h.current;
    const s = { value: 0 };
    const nn = { value: 164 };
    const o = { value: 60 };
    const a = { value: 0 };
    t.setOpacity(0);
    gsap
      .timeline()
      .to(
        { value: 0 },
        {
          value: 1,
          duration: 0.7,
          delay: 0.6,
          ease: 'power3.inOut',
          onUpdate: function (this: gsap.core.Tween) {
            t.setOpacity((this.targets()[0] as { value: number }).value);
          },
        },
        2.5,
      )
      .to(introPos, { z: 4.2, ...INTRO_GROUP_TWEEN }, 2.5)
      .to(gridPos, { z: 1.45, ...GRID_GROUP_TWEEN }, 2.5)
      .to(s, { value: EXPLODE_X, ...EXPLODE_TWEEN, onUpdate: () => i.setOffsetX(s.value) }, 2.5)
      .to(nn, { value: EXPLODE_Y, ...EXPLODE_TWEEN, onUpdate: () => i.setOffsetY(nn.value) }, 2.5)
      .to(o, { value: EXPLODE_Z, ...EXPLODE_TWEEN, onUpdate: () => i.setOffsetZ(o.value) }, 2.5)
      .to(a, { value: EXPLODE_ROT, ...EXPLODE_TWEEN, onUpdate: () => i.setRotationY(a.value) }, 2.5);
    setTimeout(() => {
      setWorkgridState('work');
      setTimeout(() => {
        u(false);
      }, 1e3);
    }, 3200);
  }, [r]);

  return (
    <>
      {d && <IntroGroup introFrames={introFrames} isAnimated={r} ref={m} particleMarkRef={h} markUrl={markUrl} particleUrl={particleUrl} />}
      <group ref={x} position={[0, 0, y]}>
        <CarouselView isVideoPaused={g} atlases={atlases} tiles={gridTiles} ref={v} onProjectClick={onProjectClick} fadeIn={l === 'work'} />
      </group>
    </>
  );
}

export default Scene;
