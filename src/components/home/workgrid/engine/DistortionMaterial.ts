// Original `e8 extends THREE.ShaderMaterial` ("DistortionShader", module 55607 L2593-2644).
// k = distortionFactor · innerWidth/innerHeight, tweened 1 s power2.out (0 in intro / after a tile click, -0.07 in work).
// The original registers `window.addEventListener("resize", c.update)` with an UNBOUND method that returns early, so `k`
// was not recomputed on resize (docs/recon/grid-engine.md §14.2). Olwtelet: PostFX now calls update() whenever the
// canvas size or pixel ratio changes, together with the composer resize.
import gsap from 'gsap';
import * as THREE from 'three';
import { DISTORTION_FRAG, DISTORTION_VERT } from './shaders';

export const DISTORTION_FLAT = 0; // e7
export const DISTORTION_WORK = -0.07; // e6
const DISTORTION_TWEEN = { duration: 1, ease: 'power2.out' }; // e9

export class DistortionMaterial extends THREE.ShaderMaterial {
  distortionFactor = 0;
  tweenRef: gsap.core.Tween | null = null;
  screenSize = new THREE.Vector2();

  constructor() {
    super({
      name: 'DistortionShader',
      uniforms: {
        tDiffuse: { value: null },
        distortion: { value: new THREE.Vector2() },
        vignetteOffset: { value: 0.6 },
        vignetteDarkness: { value: 0.6 },
        isVignette: { value: true },
      },
      vertexShader: DISTORTION_VERT,
      fragmentShader: DISTORTION_FRAG,
    });
    this.initListeners();
    this.onResize();
  }
  onResize = () => {
    this.screenSize.set(window.innerWidth, window.innerHeight);
  };
  update() {
    if (!this.screenSize) return;
    const e = this.screenSize.x / this.screenSize.y;
    (this.uniforms.distortion.value as THREE.Vector2).set(this.distortionFactor * e, this.distortionFactor * e);
  }
  dispose() {
    super.dispose();
    this.removeListeners();
  }
  setDistortion(e: number, immediate = false) {
    if (this.tweenRef) this.tweenRef.kill();
    if (immediate) {
      this.distortionFactor = e;
      this.update();
      return;
    }
    this.tweenRef = gsap.to(this, { distortionFactor: e, ...DISTORTION_TWEEN, onUpdate: () => this.update() });
  }
  private initListeners() {
    window.addEventListener('resize', this.onResize);
  }
  private removeListeners() {
    window.removeEventListener('resize', this.onResize);
  }
}
