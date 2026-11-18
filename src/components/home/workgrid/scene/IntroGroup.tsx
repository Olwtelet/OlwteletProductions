'use client';
// Original intro objects (module 55607):
//   ep (L2024-2114) pixel-morph sprite: 25 frames, pixelSize [80..1] at resolution 1024² over 0–0.8 s, then a cross-fade
//      of 72 ms/frame (cubic ease-in) from 0.8 to 2.6 s, then hidden. Driven by the R3F clock from the first frame after
//      the textures are bound and beginIntroAnimation is true.
//   em (L2127-2157) intro group: scale .5 { black Plane 20×20 at z 2.5 ; group z 3 scale introGroup { ParticleMark, sprite z 1.8 } }
//   ef: desktop {introGroup .9, particleMark 1.15, sprite [6.4,3.6]} | mobile {.8, .85, [2.4,4]} by innerWidth > 599.
import { useFrame, useLoader } from '@react-three/fiber';
import { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useMediaQueries } from '@/lib/useMediaQueries';
import { MORPH_FRAG, MORPH_VERT } from '../engine/shaders';
import { ParticleMark, type ParticleMarkHandle } from './ParticleMark';

const PIXELATION_STEPS = [80, 70, 60, 50, 40, 30, 20, 10, 1];
const SEQ = 0.4; // ev
const DEFAULT_SCALE: [number, number, number] = [16 * SEQ, 9 * SEQ, 0];

const IntroSequence = memo(function IntroSequence({
  randomSet: e,
  beginIntroAnimation: t,
  pixelationSteps: i = PIXELATION_STEPS,
  scale: s = DEFAULT_SCALE,
}: {
  randomSet: string[];
  beginIntroAnimation: boolean;
  pixelationSteps?: number[];
  scale?: [number, number, number];
}) {
  const r = useRef<THREE.Group>(null);
  const n = useRef<THREE.Sprite>(null);
  const l = useRef<THREE.ShaderMaterial>(null);
  const d = useLoader(THREE.TextureLoader, e) as THREE.Texture[];
  const u = useMemo(
    () => ({
      morphFactor: { value: 0 },
      texture1: { value: d[0] },
      texture2: { value: d[1] },
      time: { value: 0 },
      fade: { value: 0 },
      pixelSize: { value: i[0] },
      resolution: { value: new THREE.Vector2(1024, 1024) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [h, v] = useState(false);
  const [p, f] = useState<number | null>(null);

  useEffect(() => {
    if (d.length === e.length && !h && l.current && t) {
      l.current.uniforms.texture1.value = d[0];
      l.current.uniforms.texture2.value = d[1];
      v(true);
    }
  }, [d, h, e.length, t]);

  useFrame((st) => {
    if (!h || !l.current || !n.current || !t) return;
    if (p === null) {
      f(st.clock.elapsedTime);
      return;
    }
    const sec = st.clock.elapsedTime - p;
    l.current.uniforms.time.value = sec;
    const rr = sec - 0.8;
    const o = d.length;
    if (sec < 0.8) {
      l.current.uniforms.fade.value = 1;
      const k = Math.min(Math.floor((sec / 0.8) * i.length), i.length - 1);
      l.current.uniforms.pixelSize.value = i[k];
    } else if (rr < 1.8) {
      const k = (rr / 1.8) % 1;
      const s2 = Math.floor(k * o);
      l.current.uniforms.morphFactor.value = (k * o) % 1;
      l.current.uniforms.texture1.value = d[s2];
      l.current.uniforms.texture2.value = d[(s2 + 1) % o];
      n.current.visible = true;
    } else {
      l.current.uniforms.fade.value = 0;
      n.current.visible = false;
    }
  });

  useEffect(
    () => () =>
      void d.forEach((tex) => {
        tex.dispose();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <group ref={r}>
      <sprite ref={n} scale={s} position={[0, 0, 1.8]}>
        <shaderMaterial fragmentShader={MORPH_FRAG} vertexShader={MORPH_VERT} uniforms={u} ref={l} attach="material" />
      </sprite>
    </group>
  );
});

const PARAMS = {
  mobile: { introGroup: 0.8, particleMark: 0.85, introSequence: [6 * 0.4, 4, 0] as [number, number, number] },
  desktop: { introGroup: 0.9, particleMark: 1.15, introSequence: [6.4, 3.6, 0] as [number, number, number] },
};

export const IntroGroup = forwardRef<
  THREE.Group,
  {
    introFrames: string[];
    isAnimated: boolean;
    particleMarkRef: React.Ref<ParticleMarkHandle>;
    markUrl: string;
    particleUrl: string;
  }
>(function IntroGroup({ introFrames: e, isAnimated: t, particleMarkRef: s, markUrl, particleUrl }, i) {
  const r = useMediaQueries().isMinMedium ? PARAMS.desktop : PARAMS.mobile;
  return (
    <group scale={0.5} ref={i}>
      <mesh position={[0, 0, 2.5]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <group position={[0, 0, 3]} scale={r.introGroup}>
        <ParticleMark ref={s} scale={r.particleMark} markUrl={markUrl} particleUrl={particleUrl} />
        <IntroSequence beginIntroAnimation={t} scale={r.introSequence} randomSet={e} />
      </group>
    </group>
  );
});

export default IntroGroup;
