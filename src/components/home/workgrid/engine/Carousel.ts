// Original class `G extends THREE.Group` ("Carousel", module 55607 L1587-1697). Holds the grey background, the
// instanced tiles, the atlas textures/video and the navigation (input, drag, inertia, press zoom, ambient parallax).
import gsap from 'gsap';
import * as THREE from 'three';
import { CAMERA_Z, EASE_YN, HOME_FOCUS } from './env';
import { AtlasAssets, GridBackground, WorkGridMesh, type GridTile } from './grid';
import { Navigation } from './navigation';
import type { WorkGridAtlas } from '../types';

const UNIFORM_NAMES = [
  { labelMap: 'labelMap0', colorMap: 'colorMap0', alphaMap: 'alphaMap0' },
  { labelMap: 'labelMap1', colorMap: 'colorMap1', alphaMap: 'alphaMap1' },
  { labelMap: 'labelMap2', colorMap: 'colorMap2', alphaMap: 'alphaMap2' },
] as const;

export class Carousel extends THREE.Group {
  cameraAnimationRef: gsap.core.Tween | null = null;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  assets: AtlasAssets;
  navigation: Navigation;
  background: GridBackground;
  skipIntro: boolean;
  mesh: WorkGridMesh;
  onProjectSelect?: (slug: string) => void;

  constructor(atlases: WorkGridAtlas[], tiles: GridTile[], canvas: HTMLCanvasElement, skipIntro: boolean, camera: THREE.PerspectiveCamera) {
    super();
    this.camera = camera;
    this.canvas = canvas;
    this.assets = new AtlasAssets(atlases);
    this.navigation = new Navigation(camera, canvas);
    this.background = new GridBackground();
    this.skipIntro = skipIntro;
    this.mesh = new WorkGridMesh(tiles, 11, 6, this.skipIntro);
    this.add(this.background);
    this.add(this.mesh);
    this.initMesh();
    this.initListeners();
  }

  onClick = () => {
    const e = this.mesh.getSelectedTile();
    // empty cells (and the original placeholder) are not links: no navigation, no '/projects/' 404
    if (e && e.clickable && e.slug && this.onProjectSelect) this.onProjectSelect(e.slug);
  };
  onPressStart = () => {
    this.animateCameraZ(CAMERA_Z + 0.4, 0.4);
    this.canvas.style.cursor = 'grabbing';
  };
  onPressEnd = (e: boolean) => {
    // the original returned to rest only after a drag (any click on its grid opened a project). Olwtelet: empty cells
    // are not links, so a click there would leave the grid at the pressed (zoomed-out) scale until the next drag;
    // it returns to rest unless the click opens a project
    const t = this.mesh.getSelectedTile();
    const opensProject = !e && !!(t && t.clickable && t.slug);
    if (!opensProject) this.animateCameraZ(CAMERA_Z, 0.4);
    this.canvas.style.cursor = 'default';
  };
  /**
   * Tab / Shift+Tab: steps through the project tiles only (empty cells are skipped) and centres the focused tile on
   * the screen (offset gridSize/2 − slot position), so Enter then opens it. The first Tab (focusIndex 1) goes to the
   * first project of the catalogue.
   */
  onFocus = (e: number) => {
    const targets: number[] = [];
    this.mesh.tiles.forEach((t, i) => {
      if (t.clickable) targets.push(i);
    });
    if (!targets.length) return;
    const n = targets.length;
    const p = this.mesh.tiles[targets[(((e - 1) % n) + n) % n]].workGridPosition;
    this.navigation.moveTo(new THREE.Vector2(this.mesh.gridSize / 2 - p.x, this.mesh.gridSize / 2 - p.y));
  };

  setTiles(e: GridTile[]) {
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.mesh = new WorkGridMesh(e, 11, 6, this.skipIntro);
    this.initMesh();
    this.add(this.mesh);
  }
  fadeIn() {
    this.assets.play();
    this.mesh.fade(false);
    this.animateCameraZ(CAMERA_Z, 1);
  }
  fadeOut() {
    this.assets.pause();
    this.mesh.fade(true);
    this.animateCameraZ(CAMERA_Z + 1, 1);
  }
  /** back to the resting view, centred on the published project (HOME_FOCUS) */
  center() {
    this.navigation.moveTo(new THREE.Vector2(HOME_FOCUS.x, HOME_FOCUS.y));
  }
  update(dt: number) {
    this.navigation.update(dt);
    const t = this.navigation.positionOffset.clone();
    t.add(this.getMovementAmbientOffset());
    this.mesh.position.set(t.x, t.y, 0);
    this.mesh.update(this.camera, this.navigation.pointerUv, dt);
  }
  setOpacity(e: number) {
    this.mesh.setUniform('opacity', e);
  }
  dispose() {
    this.mesh.dispose();
    this.navigation.dispose();
    this.assets.dispose();
    this.mesh.removeFromParent();
    this.background.removeFromParent();
    this.removeFromParent();
    this.removeListeners();
  }
  animateCameraZ(e: number, t: number) {
    if (this.cameraAnimationRef) this.cameraAnimationRef.kill();
    this.cameraAnimationRef = gsap.to(this.camera.position, { z: e, duration: t, ease: EASE_YN });
  }
  /** `(pointerUv − 0.5)·0.07` — double −0.5 kept (offset range (−0.07..0, −0.07..0)), applied instantly. */
  getMovementAmbientOffset() {
    return this.navigation.pointerUv.clone().subScalar(0.5).multiplyScalar(0.07);
  }
  private initMesh() {
    const packs = this.assets.atlasPacks;
    for (let e = 0; e < packs.length; e++) {
      if (!UNIFORM_NAMES[e]) return;
      const t = UNIFORM_NAMES[e];
      const i = packs[e];
      this.mesh.setUniform(t.labelMap, i.labelMap);
      this.mesh.setUniform(t.colorMap, i.rgbMap);
      this.mesh.setUniform(t.alphaMap, i.alphaMap);
    }
  }
  private initListeners() {
    this.navigation.onClick = this.onClick;
    this.navigation.onPressStart = this.onPressStart;
    this.navigation.onPressEnd = this.onPressEnd;
    this.navigation.onFocus = this.onFocus;
  }
  private removeListeners() {
    this.navigation.onClick = undefined;
    this.navigation.onPressStart = undefined;
    this.navigation.onPressEnd = undefined;
    this.navigation.onFocus = undefined;
  }
}
