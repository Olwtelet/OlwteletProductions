'use client';
// FaceParticles — original chunk 105 module 60105 `C` (team → particles data + auto-cycle) inside the shared R3F
// scene wrapper module 15888 (`m`): div#team-scene-element.SceneWrapper.SceneWrapper_DisableTouch > <Canvas
// frameloop="always" linear gl={{antialias:true, toneMapping:NoToneMapping, alpha:true}}
// camera={{fov:85, near:.001, far:1000}}> with a PerformanceMonitor whose onDecline sets graphicsTier LOW.
// Auto-cycle (setInterval 3000 ms), created once all textures of the current team are loaded and only for teams
// with more than one member: next member; after the last one, the next department (wrapping) — the interval keeps
// the old team's member list until the department change re-renders (original behaviour).
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { appStore, useAppStore } from '@/lib/store';
import { cx } from '@/lib/cx';
import { mediaUrl } from '@/lib/media';
import FaceParticleSystem, { type ParticlesData } from './FaceParticleSystem';
import { PerformanceMonitor } from './PerformanceMonitor';
import type { EmployeeDoc } from '../types';
import s from './team.module.css';

const EMPTY: ParticlesData = { depthMap: [], colorMap: [], id: [], particle_params: [] };

/** module 15888 `m` */
function Scene({
  frameloop = 'always',
  children,
  id = '',
  disableScene = false,
  disableTouch = true,
  fixed,
}: {
  frameloop?: 'always' | 'demand' | 'never';
  children?: ReactNode;
  id?: string;
  disableScene?: boolean;
  disableTouch?: boolean;
  fixed?: boolean;
}) {
  // Original `m`: `let { setGraphicsTier: m } = (0, c.P)()`, a whole-store read without a selector, so the wrapper and its
  // <Canvas> re-render on every app-store write; each Canvas render runs R3F `configure` (size, default dpr range).
  // appStore.set notifies on every call, unchanged values included, as zustand (src/lib/store.ts).
  useAppStore();
  return (
    <div
      id={id}
      style={{ visibility: disableScene ? 'hidden' : 'visible' }}
      className={cx(s.SceneWrapper, fixed && s.SceneWrapper_Fixed, disableTouch && s.SceneWrapper_DisableTouch)}
    >
      <Canvas
        frameloop={frameloop}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping, alpha: true }}
        linear
        camera={{ fov: 85, near: 0.001, far: 1e3 }}
      >
        <PerformanceMonitor onDecline={() => appStore.set({ graphicsTier: 1 })} />
        {children}
      </Canvas>
    </div>
  );
}

type TeamGroups = Record<string, { name: string; team: EmployeeDoc[] }>;

export default function FaceParticles() {
  // Original `C` destructures teamGroups / currentTeams / currentDepartmentId from a whole-store read (`(0, f.P)()`, no
  // selector): it re-renders on every app-store write, as the Scene wrapper does (2026-11-10 verification pass).
  const { teamGroups: tg, currentTeams: ct, currentDepartmentId } = useAppStore();
  const teamGroups = tg as TeamGroups | null;
  const currentTeams = ct as EmployeeDoc[] | null;
  const [allLoaded, setAllLoaded] = useState(false);
  const [data, setData] = useState<ParticlesData>(EMPTY);
  const [index, setIndex] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentTeams) return;
    setAllLoaded(false);
    setData(
      currentTeams.reduce<ParticlesData>(
        (acc, emp) => {
          const { depth_map_image_link: d, texture_image_link: c, particle_params: p } = emp.data;
          acc.depthMap.push(mediaUrl(d.url));
          acc.colorMap.push(mediaUrl(c.url));
          acc.id.push(emp.uid);
          acc.particle_params.push({
            face_scale_z: p?.[0]?.face_scale_z ?? 0,
            face_size: p?.[0]?.face_size ?? 0,
            offset_z: p?.[0]?.offset_z ?? 0,
          });
          return acc;
        },
        { depthMap: [], colorMap: [], id: [], particle_params: [] },
      ) || EMPTY,
    );
    setIndex(0);
  }, [currentTeams]);

  useEffect(() => {
    if (currentTeams && allLoaded && !(currentTeams.length <= 1)) {
      let a = 0;
      interval.current = setInterval(() => {
        if (a === currentTeams.length - 1) {
          const keys = Object.keys(teamGroups ?? {});
          if (currentDepartmentId !== null) {
            const next = (keys.indexOf(currentDepartmentId) + 1) % keys.length;
            appStore.set({ currentDepartmentId: keys[next] });
          }
          a = 0;
        } else a += 1;
        setIndex(a);
        appStore.set({ currentEmployee: currentTeams[a] });
      }, 3e3);
      return () => {
        if (interval.current) {
          clearInterval(interval.current);
          interval.current = null;
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded]);

  useEffect(
    () => () => {
      interval.current = null;
    },
    [],
  );

  return (
    <div className={s.FaceParticleDemoWrapper}>
      <Scene id="team-scene-element">
        <FaceParticleSystem particlesData={data} isAllTexturesLoaded={allLoaded} setAllTexturesLoaded={setAllLoaded} currentDataIndex={index} />
      </Scene>
    </div>
  );
}
