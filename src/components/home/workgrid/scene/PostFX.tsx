'use client';
// Original `te` (module 55607 L2645-2689): EffectComposer[RenderPass → ShaderPass(DistortionShader) → OutputPass],
// HalfFloat render targets without MSAA; takes over R3F's render with a priority-1 useFrame:
//   graphicsTier HIGH → composer.render()   |   LOW → gl.render(scene, camera)  (no distortion, no vignette, no 0.88 zoom)
// Distortion target: 0 while workgridState === 'intro' or after a tile click (isForceFlat), else -0.07 (·innerW/innerH).
//
// Resize: Olwtelet fixes the replica's quirk (the owner authorised fixing inherited defects that take part in the line
// flicker, and this one does after any resize): the composer follows the canvas size and pixel ratio, and `k` follows
// the aspect (see the effect below).
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { useAppStore } from '@/lib/store';
import { DISTORTION_FLAT, DISTORTION_WORK, DistortionMaterial } from '../engine/DistortionMaterial';
import { debugEnabled } from '../engine/env';

const HIGH = 0;

export function PostFX({ isForceFlat }: { isForceFlat: boolean }) {
  // original `te`: `{ graphicsTier: t, workgridState: i } = (0, p.P)()` (whole store, re-renders on every write)
  const { graphicsTier, workgridState } = useAppStore();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const tierRef = useRef(graphicsTier);
  const { effectComposer, distortionShader } = useMemo(() => {
    const e = new RenderPass(scene, camera);
    const t = new DistortionMaterial();
    const i = new ShaderPass(t);
    const o = new OutputPass();
    const a = new EffectComposer(gl);
    a.addPass(e);
    a.addPass(i);
    a.addPass(o);
    return { effectComposer: a, distortionPass: i, distortionShader: t };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    distortionShader.update();
    if (debugEnabled()) (window as unknown as Record<string, unknown>).__wgPost = { composer: effectComposer, distortion: distortionShader, gl };
    return () => {
      distortionShader.dispose();
      effectComposer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Olwtelet: the composer follows the canvas. The replica never resized it (and registered the distortion's update
  // UNBOUND on resize, a no-op): after a window resize, browser zoom (DPR), a scrollbar or a phone rotation, the scene
  // target kept its first size, and the distortion pass stretched it over the new canvas — minifying a target that has
  // no mipmaps, so the 1-px lines dropped out between samples (MEASURED: loaded at 1680 × 1050, shown at 1440 × 900).
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  useEffect(() => {
    effectComposer.setPixelRatio(dpr);
    effectComposer.setSize(size.width, size.height);
    distortionShader.update(); // k follows the new aspect at once
  }, [effectComposer, distortionShader, size.width, size.height, dpr]);

  useEffect(() => {
    if (isForceFlat || workgridState === 'intro') distortionShader.setDistortion(DISTORTION_FLAT);
    else distortionShader.setDistortion(DISTORTION_WORK);
  }, [workgridState, isForceFlat, distortionShader]);

  useEffect(() => {
    tierRef.current = graphicsTier;
  }, [graphicsTier]);

  useFrame(() => {
    if (tierRef.current === HIGH) effectComposer.render();
    else gl.render(scene, camera);
  }, 1);

  return null;
}

export default PostFX;
