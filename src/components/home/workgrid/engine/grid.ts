// Work-grid scene objects, ported 1:1 from the original page chunk (module 55607, chunks__app__page-011a848178cd2676.js),
// except the Olwtelet line fixes (tile geometry, label atlas filtering: see WorkGridMesh and AtlasAssets):
//   L  (AtlasVideo, L753-815)      S  (AtlasAssets, L816-858)     z  (Background, L859-872)
//   A  (TileMaterial, L1087-1129)  O  (WorkGridMesh, L1130-1233)
// docs/recon/grid-engine.md §4-§10.
import gsap from 'gsap';
import * as THREE from 'three';
import { TILE_FRAG, TILE_VERT } from './shaders';
import { isMobileUA } from './env';
import type { WorkGridAtlas, WorkGridTileFilters } from '../types';

/** Runtime tile (original tile object with THREE.Vector2 positions). */
export interface GridTile {
  id: string;
  slug: string;
  atlasIndex: number;
  /** (cellX, cellY) of the blueprint: cellX = atlas row, cellY = atlas column */
  atlasCellPosition: THREE.Vector2;
  workGridPosition: THREE.Vector2;
  filters: WorkGridTileFilters;
  launchDate: string;
  /** false for the empty-cell designs: no hover highlight, no click, no keyboard focus */
  clickable: boolean;
}

/** Original placeholder `_` (pure black cell, atlasIndex −1). Not clickable. */
export const PLACEHOLDER_TILE: GridTile = {
  id: '',
  slug: '',
  atlasIndex: -1,
  atlasCellPosition: new THREE.Vector2(),
  workGridPosition: new THREE.Vector2(),
  filters: { services: [], zones: [], clients: [], features: [] },
  launchDate: '',
  clickable: false,
};

// ------------------------------------------------------------------------------------------------ L: video atlas
interface AtlasVideoState {
  domElement: HTMLVideoElement;
  texture: THREE.VideoTexture;
  isReady: boolean;
}

export class AtlasVideo {
  document: Document;
  video: AtlasVideoState;
  onReady?: () => void;
  private onCanPlayThrough?: () => void;
  private onEnded?: () => void;

  constructor(src: string, doc: Document) {
    this.document = doc;
    this.video = this.initAtlasVideo(src);
    this.initListeners();
  }
  play() {
    // the original ignores the returned promise (an autoplay rejection surfaces as an unhandled rejection there)
    void this.video.domElement.play().catch(() => {});
  }
  pause() {
    this.video.domElement.pause();
  }
  getTexture() {
    return this.video.texture;
  }
  private initListeners() {
    this.onCanPlayThrough = () => {
      this.video.isReady = true;
      if (this.onReady) this.onReady();
    };
    this.video.domElement.addEventListener('canplaythrough', this.onCanPlayThrough);
    this.onEnded = () => {
      this.video.domElement.pause();
      this.video.domElement.currentTime = 0;
      void this.video.domElement.play().catch(() => {});
    };
    this.video.domElement.addEventListener('ended', this.onEnded);
  }
  private initAtlasVideo(src: string): AtlasVideoState {
    const t = this.document.createElement('video');
    t.src = src;
    t.crossOrigin = 'anonymous';
    t.muted = true;
    t.playsInline = true;
    t.preload = 'auto';
    t.loop = true;
    t.setAttribute('webkit-playsinline', '');
    t.setAttribute('playbackRate', '1.0');
    if (t.canPlayType('video/webm')) t.setAttribute('type', 'video/webm');
    t.pause();
    const i = new THREE.VideoTexture(t);
    i.generateMipmaps = false;
    i.minFilter = THREE.LinearFilter;
    i.magFilter = THREE.LinearFilter;
    return { domElement: t, texture: i, isReady: false };
  }
  dispose() {
    this.pause();
    this.video.texture.dispose();
    if (this.onEnded) this.video.domElement.removeEventListener('ended', this.onEnded);
    if (this.onCanPlayThrough) this.video.domElement.removeEventListener('canplaythrough', this.onCanPlayThrough);
    this.video.domElement.remove();
  }
}

// ------------------------------------------------------------------------------------------------ S: atlas packs
export interface AtlasPack {
  rgbMap: THREE.Texture;
  alphaMap: THREE.Texture;
  labelMap: THREE.Texture;
}

export class AtlasAssets {
  loader = new THREE.TextureLoader();
  private _atlasPacks: AtlasPack[] = [];
  videoManagers: AtlasVideo[] = [];

  constructor(atlases: WorkGridAtlas[]) {
    let t: AtlasPack | null = null;
    for (const i of atlases) {
      if (i.type === 'video') {
        const e = new AtlasVideo(i.mediaAtlas, document);
        this.videoManagers.push(e);
        t = { rgbMap: e.getTexture(), alphaMap: this.getTexture(i.mediaAlphaAtlas), labelMap: this.getLabelTexture(i.labelsAtlas) };
      } else {
        t = { rgbMap: this.getTexture(i.mediaAtlas), alphaMap: this.getTexture(i.mediaAlphaAtlas), labelMap: this.getLabelTexture(i.labelsAtlas) };
      }
      this._atlasPacks.push(t);
    }
  }
  get atlasPacks() {
    return this._atlasPacks;
  }
  play() {
    for (const e of this.videoManagers) e.play();
  }
  pause() {
    for (const e of this.videoManagers) e.pause();
  }
  dispose() {
    for (const e of this._atlasPacks) {
      e.labelMap.dispose();
      e.alphaMap.dispose();
      e.rgbMap.dispose();
    }
  }
  private getTexture(url: string) {
    return this.loader.load(url, (e) => {
      e.format = THREE.RGBAFormat;
      e.minFilter = THREE.LinearFilter;
      e.magFilter = THREE.LinearFilter;
    });
  }
  /**
   * Olwtelet: the label atlas carries the thin strokes of the empty-cell designs, the labels and the pills. A tile
   * shows one 683-texel cell on 150–300 screen px, so without mipmaps a 1.5-texel line was hit or missed by the 2×2
   * bilinear footprint as the grid moved (it blinked). Mipmapped (trilinear) and premultiplied, so the filtered
   * strokes keep their brightness (TILE_FRAG composites premultiplied: the same result as before at texel centres).
   */
  private getLabelTexture(url: string) {
    return this.loader.load(url, (e) => {
      e.format = THREE.RGBAFormat;
      e.generateMipmaps = true;
      e.minFilter = THREE.LinearMipmapLinearFilter;
      e.magFilter = THREE.LinearFilter;
      e.premultiplyAlpha = true;
      e.needsUpdate = true;
    });
  }
}

// ------------------------------------------------------------------------------------------------ z: grey background
const BACKGROUND = {
  position: new THREE.Vector3(),
  scale: new THREE.Vector3(10, 10, 1),
  // ColorManagement converts "#888" to linear 0.2462, never re-encoded by the linear pipeline => gaps render ≈#3f3f3f
  color: new THREE.Color('#888'),
  renderOrder: -10,
};

export class GridBackground extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  constructor() {
    super(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ color: BACKGROUND.color }));
    this.position.copy(BACKGROUND.position);
    this.scale.copy(BACKGROUND.scale);
    this.renderOrder = BACKGROUND.renderOrder;
  }
}

// ------------------------------------------------------------------------------------------------ A: tile material
type TileUniforms = {
  colorMap0: THREE.IUniform<THREE.Texture>;
  alphaMap0: THREE.IUniform<THREE.Texture>;
  labelMap0: THREE.IUniform<THREE.Texture>;
  colorMap1: THREE.IUniform<THREE.Texture>;
  alphaMap1: THREE.IUniform<THREE.Texture>;
  labelMap1: THREE.IUniform<THREE.Texture>;
  colorMap2: THREE.IUniform<THREE.Texture>;
  alphaMap2: THREE.IUniform<THREE.Texture>;
  labelMap2: THREE.IUniform<THREE.Texture>;
  activeInstance: THREE.IUniform<number[]>;
  activeInstanceIntensity: THREE.IUniform<number[]>;
  opacity: THREE.IUniform<number>;
};

export class TileMaterial extends THREE.ShaderMaterial {
  declare uniforms: TileUniforms;
  activeInstance = -1;

  constructor(skipIntro: boolean) {
    super({
      vertexShader: TILE_VERT,
      fragmentShader: TILE_FRAG,
      uniforms: {
        colorMap0: { value: new THREE.Texture() },
        alphaMap0: { value: new THREE.Texture() },
        labelMap0: { value: new THREE.Texture() },
        colorMap1: { value: new THREE.Texture() },
        alphaMap1: { value: new THREE.Texture() },
        labelMap1: { value: new THREE.Texture() },
        colorMap2: { value: new THREE.Texture() },
        alphaMap2: { value: new THREE.Texture() },
        labelMap2: { value: new THREE.Texture() },
        activeInstance: { value: [-1, -1, -1, -1] },
        activeInstanceIntensity: { value: [1, 1, 1, 1] },
        opacity: { value: +!skipIntro },
      },
      side: THREE.FrontSide,
      transparent: false,
      depthWrite: false,
    });
  }
  setActiveInstance(e: number) {
    const { activeInstance: t, activeInstanceIntensity: i } = this.uniforms;
    if (e !== this.activeInstance) {
      t.value.unshift(e);
      i.value.unshift(0);
      t.value.pop();
      i.value.pop();
    }
    this.activeInstance = e;
  }
  /** Highlight history lerp, `5·dt`, NOT clamped (as the original). */
  update(e: number) {
    const { activeInstance: t, activeInstanceIntensity: i } = this.uniforms;
    for (let n = 0; n < t.value.length; n++) {
      const o = +(t.value[n] === this.activeInstance);
      const r = 5 * e;
      i.value[n] = i.value[n] * (1 - r) + o * r;
    }
  }
}

// ------------------------------------------------------------------------------------------------ O: instanced tiles
export class WorkGridMesh extends THREE.InstancedMesh<THREE.PlaneGeometry, TileMaterial> {
  hoverTileIndex = -1;
  tiles: GridTile[];
  gridSize: number;

  constructor(tiles: GridTile[], gridSize: number, atlasGridSize: number, skipIntro: boolean) {
    const r = tiles.length;
    const n = new TileMaterial(skipIntro);
    // Olwtelet: tiles abut (pitch 1). The replica left a 0.002-unit gap between 0.998 tiles for the grey background to
    // show through as the grid's lines: 0.35–1 px wide on screen, drawn without antialiasing into the composer's
    // target, so whole lines popped on and off as the grid moved. TILE_FRAG now draws that same gap analytically
    // (exact pixel coverage, same grey); GridBackground stays behind as before.
    super(new THREE.PlaneGeometry(1, 1, 1), n, r);
    this.frustumCulled = false;
    this.tiles = tiles;
    this.gridSize = gridSize;
    this.setupMatrices(gridSize);
    this.setupCustomAttributes(atlasGridSize);
    this.instanceMatrix.needsUpdate = true;
    this.updateMatrix();
  }
  /** Original quirk kept: `floor(workGridPosition) + 0.5` (Tab focus does not centre the tile). */
  getTilePosition(e: number) {
    const t = e % this.tiles.length;
    const i = this.tiles[t].workGridPosition.clone();
    return new THREE.Vector2(Math.floor(i.x) + 0.5, Math.floor(i.y) + 0.5);
  }
  getSelectedTile(): GridTile | undefined {
    return this.tiles[this.hoverTileIndex];
  }
  setUniform<K extends keyof TileUniforms>(e: K, t: TileUniforms[K]['value']) {
    this.material.uniforms[e].value = t;
  }
  fade(e: boolean) {
    gsap.to(this.material.uniforms.opacity, { duration: 1, value: e ? 0.3 : 1, ease: 'power1.inOut' });
  }
  update(camera: THREE.Camera, pointerUv: THREE.Vector2, dt: number) {
    this.material.update(dt);
    const s = new THREE.Matrix4();
    const r = new THREE.Vector3();
    let n = -1;
    let o = 100;
    for (let i = 0; i < this.count; i++) {
      const a = this.updateGridTiling(i, s, r);
      const l = this.updateGridHover(a, camera, pointerUv, o);
      // original `l && (o = l, n = i)`: a distance of exactly 0 is falsy and never selected (kept)
      if (l) {
        o = l;
        n = i;
      }
    }
    this.hoverTileIndex = n;
    // empty cells never light up: the highlight (blurred media + full label) is for project tiles only
    const hovered = this.tiles[n];
    if (!isMobileUA()) this.material.setActiveInstance(hovered && hovered.clickable ? n : -1);
    this.instanceMatrix.needsUpdate = true;
  }
  /** Not a raycast: NDC of the tile centre (group z ignored) vs pointerUv in [-0.5,0.5] (original quirks kept). */
  updateGridHover(e: THREE.Vector3, camera: THREE.Camera, pointerUv: THREE.Vector2, best: number): number | null {
    const r = e.clone().project(camera);
    const n = new THREE.Vector2(r.x, r.y).distanceTo(pointerUv);
    return n < best ? n : null;
  }
  /** Torus wrap with period gridSize (11). Returns the tile centre in group space. */
  updateGridTiling(e: number, t: THREE.Matrix4, i: THREE.Vector3): THREE.Vector3 {
    this.getMatrixAt(e, t);
    t.decompose(i, new THREE.Quaternion(), new THREE.Vector3());
    const s = new THREE.Vector3(this.gridSize / 2, this.gridSize / 2, 0);
    const r = new THREE.Vector3(this.tiles[e].workGridPosition.x, this.tiles[e].workGridPosition.y, 0);
    const n = r
      .clone()
      .subScalar(this.gridSize / 2)
      .addScalar(0.5)
      .clone()
      .add(this.position);
    const o = new THREE.Vector3(Math.round(n.x / this.gridSize), Math.round(n.y / this.gridSize), 0);
    const a = r.sub(s).sub(o.multiplyScalar(this.gridSize));
    const l = a.clone().add(this.position);
    t.setPosition(a);
    this.setMatrixAt(e, t);
    return l;
  }
  private setupCustomAttributes(e: number) {
    const t = this.tiles.flatMap((tile) => tile.atlasCellPosition.clone().divideScalar(e));
    const i = new Float32Array(2 * t.length);
    // x and y deliberately swapped (cellY → u, cellX → v)
    for (let k = 0; k < i.length; k += 2) {
      i[k] = t[k / 2].y;
      i[k + 1] = t[k / 2].x;
    }
    const s = new Float32Array(this.count);
    for (let k = 0; k < s.length; k++) s[k] = k;
    const r = new Float32Array(this.count);
    for (let k = 0; k < r.length; k++) r[k] = this.tiles[k].atlasIndex;
    this.geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(i, 2));
    this.geometry.setAttribute('instanceIndex', new THREE.InstancedBufferAttribute(s, 1));
    this.geometry.setAttribute('atlasIndex', new THREE.InstancedBufferAttribute(r, 1));
  }
  private setupMatrices(e: number) {
    const t = e / 2;
    const i = new THREE.Matrix4();
    for (const k in this.tiles) {
      const s = this.tiles[k];
      i.setPosition(s.workGridPosition.x - t, s.workGridPosition.y - t, 0);
      this.setMatrixAt(Number(k), i.clone());
    }
  }
}
