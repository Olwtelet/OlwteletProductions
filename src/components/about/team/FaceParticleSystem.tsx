'use client';
// FaceParticleSystem — original chunk 105 module 60105 `z`. docs/recon/about.md §7.4
// 78 400 points (280×280): vIndex = ((i % 280)/280, i/280/280), random unit `position`, vRandom = 4 randoms.
// ShaderMaterial (NormalBlending, transparent, depthWrite false) with the verbatim GLSL of ./shaders.
// - Textures (depth + colour of every member of the current team) are loaded with a THREE.TextureLoader when
//   `isAllTexturesLoaded` flips to false; when all are in, the first member is shown (initialisation once) and
//   `currentDataIndex` changes morph to the next face: GSAP timeline (default ease) transition 0→1.3, posZ / zScale /
//   faceSize to the new params, all 1.6 s.
// - useFrame: time = 29.8·elapsed, time2 = 4·elapsed; rotation y/x damped (maath, 0.25 s) towards
//   0.12·mouse.x·π and -0.05·pointer.y·π.
// The effect structure (and its quirks, e.g. the [currentDataIndex] effect firing with the previous team's
// textures before the new ones are loaded) is kept identical to the original.
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { appStore, type AppState } from '@/lib/store';
import { damp } from './damp';
import { FACE_FRAGMENT, FACE_VERTEX } from './shaders';

export interface ParticleParams {
  offset_z: number;
  face_scale_z: number;
  face_size: number;
}

export interface ParticlesData {
  depthMap: string[];
  colorMap: string[];
  id: string[];
  particle_params: ParticleParams[];
}

/** module 66754 `Fr` */
export const isMobileUA = () =>
  typeof navigator !== 'undefined' && /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const POS_DESKTOP = new THREE.Vector3(0, 0.2, 0);
const POS_MOBILE = new THREE.Vector3(0, 0.25, 0);

/** Original `setFaceIsTransitioning` writes `faceIsTransitioning`, NOT the `isFaceTransitioning` key the department
 * list reads — so department clicks are never blocked mid-morph (quirk kept). */
const setFaceIsTransitioning = (v: boolean) => appStore.set({ faceIsTransitioning: v } as unknown as Partial<AppState>);

interface FaceState {
  id: string;
  particle_params: ParticleParams;
  depthMap: THREE.Texture;
  colorMap: THREE.Texture;
}

export default function FaceParticleSystem({
  particlesData: e,
  isAllTexturesLoaded: t,
  setAllTexturesLoaded: r,
  currentDataIndex: n,
}: {
  particlesData: ParticlesData;
  isAllTexturesLoaded: boolean;
  setAllTexturesLoaded: (v: boolean) => void;
  currentDataIndex: number;
}) {
  const { viewport } = useThree();
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [initialised, setInitialised] = useState(false);
  const loadingRef = useRef(true);
  const firstRef = useRef(true);
  const [face, setFace] = useState<FaceState>(() => ({
    id: '',
    particle_params: { offset_z: 0, face_scale_z: 0, face_size: 0 },
    depthMap: new THREE.Texture(),
    colorMap: new THREE.Texture(),
  }));
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const loaded = useRef<{ id: string[]; particle_params: ParticleParams[]; depthMap: THREE.Texture[]; colorMap: THREE.Texture[] }>({
    id: [],
    particle_params: [],
    depthMap: [],
    colorMap: [],
  });
  const position = useMemo(() => (isMobileUA() ? POS_MOBILE : POS_DESKTOP), []);
  // drei useTexture = useLoader(TextureLoader) + gl.initTexture
  const particleMap = useLoader(THREE.TextureLoader, '/assets/images/particle.jpg');
  const gl = useThree((st) => st.gl);
  useEffect(() => {
    gl.initTexture(particleMap);
  }, [gl, particleMap]);
  const loader = useRef(new THREE.TextureLoader());
  const depthTextures = useRef<THREE.Texture[]>([]);
  const colorTextures = useRef<THREE.Texture[]>([]);

  useEffect(() => {
    if (t) return;
    depthTextures.current = [];
    colorTextures.current = [];
    let a = 0;
    let c = 0;
    const done = () => {
      if (!t && a === e.depthMap.length && c === e.colorMap.length) r(true);
    };
    e.depthMap.forEach((url, i) => {
      loader.current.load(
        url,
        (tex) => {
          depthTextures.current[i] = tex;
          a++;
          done();
        },
        undefined,
        (err) => console.error(`Error loading texture ${url}:`, err),
      );
    });
    e.colorMap.forEach((url, i) => {
      loader.current.load(
        url,
        (tex) => {
          colorTextures.current[i] = tex;
          c++;
          done();
        },
        undefined,
        (err) => console.error(`Error loading texture ${url}:`, err),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const attributes = useMemo(() => {
    const vPositions = new Float32Array(235200);
    const vIndex = new Float32Array(156800);
    const vRandom = new Float32Array(313600);
    for (let a = 0; a < 78400; a++) {
      const i2 = 2 * a;
      vIndex[i2] = (a % 280) / 280;
      vIndex[i2 + 1] = a / 280 / 280;
      const i3 = 3 * a;
      const l = 360 * Math.random();
      const c = 360 * Math.random();
      vPositions[i3] = Math.sin(l) * Math.cos(c);
      vPositions[i3 + 1] = Math.sin(l) * Math.sin(c);
      vPositions[i3 + 2] = +Math.cos(l);
      vRandom.set(
        [0, 0, 0, 0].map(() => Math.random()),
        4 * a,
      );
    }
    return { vPositions, vRandom, vIndex };
  }, []);

  const uniforms = useMemo(
    () => ({
      transition: { value: 0 },
      depthMap1: { value: null as THREE.Texture | null },
      colorMap1: { value: null as THREE.Texture | null },
      depthMap2: { value: null as THREE.Texture | null },
      colorMap2: { value: null as THREE.Texture | null },
      particleMap: { value: null as THREE.Texture | null },
      offsetX: { value: 40 },
      offsetY: { value: 100 },
      onShading: { value: true },
      brightness: { value: isMobileUA() ? 5 : 4.75 },
      faceSize: { value: e.particle_params[n]?.face_size || 0 },
      totalScale: { value: 1.1 },
      pScaleMin: { value: 0.6 },
      pScaleMax: { value: isMobileUA() ? 1.9 : 2.1 },
      time: { value: 0 },
      focus: { value: 4.2 },
      fov: { value: 0 },
      blur: { value: (5.6 - 4.8) * 9 },
      curlFreq1: { value: 10 },
      noiseScale: { value: 0.07 },
      curlFreq2: { value: 5.04 },
      noiseScale2: { value: 1.43 },
      time2: { value: 1 },
      nxScale: { value: 0.5 },
      nyScale: { value: 0.21 },
      nzScale: { value: 0.27 },
      posZ: { value: e.particle_params[n]?.offset_z || 0 },
      zScale: { value: e.particle_params[n]?.face_scale_z || 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    camera.fov = 100;
    camera.zoom = 5;
    camera.updateProjectionMatrix();
  }, [camera]);
  useEffect(() => {
    if (materialRef.current) materialRef.current.uniforms.particleMap.value = particleMap;
  }, [particleMap]);
  useEffect(() => {
    camera.zoom = 5;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.width, viewport.height]);

  const show = (id: string, index: number) => {
    setFace({
      id,
      particle_params: e.particle_params[index],
      depthMap: loaded.current.depthMap[index],
      colorMap: loaded.current.colorMap[index],
    });
  };

  useEffect(() => {
    if (depthTextures.current.length === 0 || colorTextures.current.length === 0 || !t || !materialRef.current) return;
    loadingRef.current = true;
    const firstId = e.id[0];
    loaded.current.id = e.id;
    loaded.current.depthMap = depthTextures.current;
    loaded.current.colorMap = colorTextures.current;
    loaded.current.particle_params = e.particle_params;
    if (!initialised) {
      const u = materialRef.current.uniforms;
      const p = e.particle_params[0];
      u.posZ.value = p.offset_z;
      u.zScale.value = p.face_scale_z;
      u.faceSize.value = p.face_size;
      u.colorMap1.value = loaded.current.colorMap[0];
      u.colorMap2.value = loaded.current.colorMap[0];
      u.depthMap1.value = loaded.current.depthMap[0];
      u.depthMap2.value = loaded.current.depthMap[0];
      setInitialised(true);
    }
    show(firstId, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    if (face.id !== e.id[n]) show(e.id[n], n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  useEffect(() => {
    if (!materialRef.current || face.id === '') return;
    if (n === 0 && firstRef.current) {
      firstRef.current = false;
      return;
    }
    const p = face.particle_params;
    const u = materialRef.current.uniforms;
    u.colorMap2.value = face.colorMap;
    u.depthMap2.value = face.depthMap;
    setFaceIsTransitioning(true);
    timeline.current?.kill();
    timeline.current = gsap
      .timeline()
      .fromTo(
        u.transition,
        { value: 0 },
        {
          value: 1.3,
          duration: 1.6,
          onComplete: () => {
            u.colorMap1.value = face.colorMap;
            u.depthMap1.value = face.depthMap;
          },
        },
        0,
      )
      .to(
        u.posZ,
        {
          value: p.offset_z,
          duration: 1.6,
          onComplete: () => {
            u.posZ.value = p.offset_z;
          },
        },
        0,
      )
      .to(
        u.zScale,
        {
          value: p.face_scale_z,
          duration: 1.6,
          onComplete: () => {
            u.zScale.value = p.face_scale_z;
          },
        },
        0,
      )
      .to(
        u.faceSize,
        {
          value: p.face_size,
          duration: 1.6,
          onComplete: () => {
            u.faceSize.value = p.face_size;
            setFaceIsTransitioning(false);
          },
        },
        0,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) return;
    materialRef.current.uniforms.time.value = 29.8 * state.clock.elapsedTime;
    materialRef.current.uniforms.time2.value = 4 * state.clock.elapsedTime;
    damp(pointsRef.current.rotation, 'y', 0.12 * state.mouse.x * Math.PI, 0.25, delta);
    damp(pointsRef.current.rotation, 'x', -(0.05 * state.pointer.y) * Math.PI, 0.25, delta);
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-vIndex" args={[attributes.vIndex, 2]} />
        <bufferAttribute attach="attributes-position" args={[attributes.vPositions, 3]} />
        <bufferAttribute attach="attributes-vRandom" args={[attributes.vRandom, 4]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        blending={THREE.NormalBlending}
        transparent
        depthWrite={false}
        fragmentShader={FACE_FRAGMENT}
        vertexShader={FACE_VERTEX}
        uniforms={uniforms}
      />
    </points>
  );
}
