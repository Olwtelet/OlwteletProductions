'use client';
// Port of the original `ei` (module 55607 L1835-1977), fed with the Olwtelet mark: THREE.Points built from every UNIQUE vertex of
// /assets/models/olwtelet-mark.glb (sampled from the mark faces; raw positions ×0.012, node rotation ignored), a vec4 random per point, curl-noise
// displacement, particle.jpg sprite ×5 brightness. Imperative API used by the intro timeline.
// Sound: once clock.elapsedTime > 4, with sound enabled and the audio running, load + whoosh play, once per frame until
// the React state guard commits (original race, see the useFrame below).
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAudioRunning, useSound } from '@/components/providers/SoundProvider';
import { PARTICLE_FRAG, PARTICLE_VERT } from '../engine/shaders';
import { useIntro } from '../introStore';

export interface ParticleMarkHandle {
  setOpacity: (v: number) => void;
  setOffsetX: (v: number) => void;
  setOffsetY: (v: number) => void;
  setOffsetZ: (v: number) => void;
  setRotationY: (deg: number) => void;
}

export const ParticleMark = forwardRef<ParticleMarkHandle, { scale?: number; markUrl: string; particleUrl: string }>(function ParticleMark(
  { scale: e = 0.8, markUrl, particleUrl },
  t,
) {
  // Olwtelet: sound is on by default; load + whoosh play when it is enabled and the audio is actually running (never
  // queued for later), and only once the intro has begun (elapsedTime counts from the first canvas frame, which can be
  // while the loader is still on screen)
  const { enabled, playClip: s } = useSound();
  const running = useAudioRunning();
  const begin = useIntro((st) => st.begin);
  const i = enabled && running && begin;
  const [r, n] = useState(false);
  const d = useRef<THREE.Group>(null);
  const h = useRef<THREE.Points>(null);
  const v = useRef<THREE.ShaderMaterial>(null);
  const p = useThree((st) => st.viewport);
  const gl = useThree((st) => st.gl);
  const f = useLoader(GLTFLoader, markUrl);
  // drei useTexture = useLoader(TextureLoader) + gl.initTexture in an effect
  const m = useLoader(THREE.TextureLoader, particleUrl);
  useEffect(() => {
    gl.initTexture(m);
  }, [gl, m]);
  useEffect(() => {
    if (v.current) v.current.uniforms.particleMap.value = m;
  }, [m]);

  const x = useMemo(() => {
    const pos: number[] = [];
    const rnd: number[] = [];
    // original dedup is O(n²) with Vector3.equals; a key set gives the same unique points in the same order
    const seen = new Set<string>();
    f.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.type === 'Mesh') {
        const arr = (o as THREE.Mesh).geometry.getAttribute('position').array;
        for (let k = 0; k < arr.length / 3; k++) {
          const q = 3 * k;
          const key = `${arr[q]},${arr[q + 1]},${arr[q + 2]}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pos.push(0.012 * arr[q], 0.012 * arr[q + 1], 0.012 * arr[q + 2]);
          rnd.push(...Array.from({ length: 4 }, () => Math.random()));
        }
      }
    });
    return { vPositions: pos, vRandom: rnd };
  }, [f]);

  const g = useMemo(
    () => ({
      particleMap: { value: null as THREE.Texture | null },
      viewport: { value: new THREE.Vector2(p.width, p.height) },
      offsetX: { value: 0 },
      offsetY: { value: 164 },
      offsetZ: { value: 60 },
      brightness: { value: 5 },
      totalScale: { value: 0.4 },
      pScaleMin: { value: 0.4 },
      pScaleMax: { value: 1.5 },
      time: { value: 0 },
      curlFreq: { value: 10 },
      noiseScale: { value: 0.14 },
      opacity: { value: 0 },
    }),
    [p.height, p.width],
  );

  useImperativeHandle(t, () => ({
    setOpacity: (val) => {
      if (v.current) v.current.uniforms.opacity.value = val;
    },
    setOffsetX: (val) => {
      if (v.current) v.current.uniforms.offsetX.value = val;
    },
    setOffsetY: (val) => {
      if (v.current) v.current.uniforms.offsetY.value = val;
    },
    setOffsetZ: (val) => {
      if (v.current) v.current.uniforms.offsetZ.value = val;
    },
    setRotationY: (deg) => {
      if (h.current) h.current.rotation.y = (deg * Math.PI) / 180;
    },
  }));

  // Original guard, verbatim: React state `r` set from inside useFrame. Every frame rendered before that state update
  // commits (and R3F refreshes this callback in its layout effect) still sees `r === false` and plays load + whoosh
  // again, so the number of pairs is a race between the R3F frame loop and React's scheduler: MEASURED one pair in the
  // audit run (docs/evidence/audit/chrome/follower.log) and two pairs 36–72 ms apart in the recon runs
  // (chrome/d1440_intro_sound_and_hover.json). No count is forced.
  useFrame((st) => {
    if (v.current && h.current) v.current.uniforms.time.value = 36 * st.clock.elapsedTime;
    if (st.clock.elapsedTime > 4 && i && !r) {
      n(true);
      void s('load');
      void s('whoosh');
    }
  });

  useEffect(
    () => () => {
      m.dispose();
      const all: THREE.Object3D[] = [];
      d.current?.traverse((o) => {
        all.push(o);
      });
      for (const o of all) {
        if (o.type === 'Mesh' && !Array.isArray((o as THREE.Mesh).material)) ((o as THREE.Mesh).material as THREE.Material).dispose();
        o.removeFromParent();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const positions = useMemo(() => new Float32Array(x.vPositions), [x]);
  const randoms = useMemo(() => new Float32Array(x.vRandom), [x]);

  return (
    <group ref={d}>
      <points ref={h} position={[0, 0, 2]} scale={[+e, +e, +e]} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={x.vPositions.length / 3} />
          <bufferAttribute attach="attributes-vRandom" args={[randoms, 4]} count={x.vRandom.length / 4} />
        </bufferGeometry>
        <shaderMaterial
          ref={v}
          blending={THREE.NormalBlending}
          transparent
          depthWrite={false}
          fragmentShader={PARTICLE_FRAG}
          vertexShader={PARTICLE_VERT}
          uniforms={g}
        />
      </points>
    </group>
  );
});

export default ParticleMark;
