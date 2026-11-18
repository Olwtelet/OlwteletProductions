// Grid input + navigation, ported from the original page chunk (module 55607):
//   F (ActionManager, L1235-1331)  R (Coordinates, L1332-1402)  Y (InputListener, L1404-1496)  N (Navigation, L1497-1586)
// docs/recon/grid-engine.md §12, docs/recon/home-interaction.md §2.
//
// Behaviour identical to the original, including its frame-rate dependence (owner review 2026-11-08 removed the former
// "60 fps calibration"): Navigation.update applies `offset += v; v.lerp(0, clamp(4·dt))` once per RENDERED frame, as
// module 55607 does, so the inertia glide length depends on the display rate (≈15× the last pointer delta per frame
// at 60 Hz, ≈30× at 120 Hz, ≈36× at 144 Hz) exactly like the original.
import gsap from 'gsap';
import * as THREE from 'three';
import { clamp, HOME_FOCUS } from './env';

type Vec2 = THREE.Vector2;

// ------------------------------------------------------------------------------------------------ Y: raw listeners
export class InputListener {
  touchId: number | null = null;
  canvas: HTMLCanvasElement;
  onPointerDown?: (p: Vec2) => void;
  onPointerMove?: (p: Vec2) => void;
  onPointerUp?: (p: Vec2) => void;
  onKey?: (key: string, shift: boolean) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initListeners();
  }
  touchStart = (e: TouchEvent) => {
    e.preventDefault();
    // original quirk kept: a touch identifier of 0 is falsy
    if (this.touchId || !e.touches[0]) return;
    const t = e.touches[0];
    this.touchId = t.identifier;
    const i = new THREE.Vector2(t.clientX, t.clientY);
    if (this.onPointerDown) this.onPointerDown(i);
  };
  touchMove = (e: TouchEvent) => {
    e.preventDefault();
    const t = Array.from(e.touches).find((x) => x.identifier === this.touchId);
    if (!t) return;
    const i = new THREE.Vector2(t.clientX, t.clientY);
    if (this.onPointerMove) this.onPointerMove(i);
  };
  touchEnd = (e: TouchEvent) => {
    e.preventDefault();
    const t = Array.from(e.changedTouches).find((x) => x.identifier === this.touchId);
    if (!t) return;
    const i = new THREE.Vector2(t.clientX, t.clientY);
    if (this.onPointerUp) this.onPointerUp(i);
    this.touchId = null;
  };
  mouseDown = (e: MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return;
    const t = new THREE.Vector2(e.clientX, e.clientY);
    if (this.onPointerDown) this.onPointerDown(t);
  };
  mouseMove = (e: MouseEvent) => {
    e.preventDefault();
    const t = new THREE.Vector2(e.clientX, e.clientY);
    if (this.onPointerMove) this.onPointerMove(t);
  };
  mouseUp = (e: MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return;
    const t = new THREE.Vector2(e.clientX, e.clientY);
    if (this.onPointerUp) this.onPointerUp(t);
  };
  keyPress = (e: KeyboardEvent) => {
    // Olwtelet: the grid stays mounted under the contact modal; keys typed in the open dialog (Tab, Enter on its
    // buttons, arrows in its fields) are the dialog's, not the grid's (Enter used to open a project behind the modal)
    if (document.querySelector('dialog[open]')) return;
    // Enter / Space on a link or button belong to that control ("Vamos conversar", the nav pills…): the grid would also
    // take them as a click on its focused tile and open a project a moment later. The grid's Enter acts only when the
    // page itself has the focus (body or the canvas).
    const t = e.target as Element | null;
    if ((e.key === 'Enter' || e.key === ' ') && t && t !== document.body && !(t instanceof HTMLCanvasElement)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) e.preventDefault();
    if (
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) &&
      this.onKey
    )
      this.onKey(e.key, e.shiftKey);
  };
  dispose() {
    this.removeListeners();
  }
  private initListeners() {
    this.canvas.addEventListener('touchstart', this.touchStart);
    this.canvas.addEventListener('touchmove', this.touchMove);
    this.canvas.addEventListener('touchend', this.touchEnd);
    this.canvas.addEventListener('touchcancel', this.touchEnd);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('mousedown', this.mouseDown);
    this.canvas.addEventListener('mouseup', this.mouseUp);
    this.canvas.addEventListener('mouseout', this.mouseUp);
    window.addEventListener('keydown', this.keyPress);
  }
  private removeListeners() {
    this.canvas.removeEventListener('touchstart', this.touchStart);
    this.canvas.removeEventListener('touchmove', this.touchMove);
    this.canvas.removeEventListener('touchend', this.touchEnd);
    this.canvas.removeEventListener('touchcancel', this.touchEnd);
    this.canvas.removeEventListener('mousemove', this.mouseMove);
    this.canvas.removeEventListener('mousedown', this.mouseDown);
    this.canvas.removeEventListener('mouseup', this.mouseUp);
    this.canvas.removeEventListener('mouseout', this.mouseUp);
    window.removeEventListener('keydown', this.keyPress);
    this.onKey = undefined;
    this.onPointerDown = undefined;
    this.onPointerMove = undefined;
    this.onPointerUp = undefined;
  }
}

// ------------------------------------------------------------------------------------------------ F: press/drag/click
export class ActionManager {
  private _isKeyboard = false;
  private _isDrag = false;
  isPress = false;
  pressOrigin = new THREE.Vector2();
  private _position = new THREE.Vector2();
  canvas: HTMLCanvasElement;
  inputListener: InputListener;
  onPressStart?: () => void;
  onPressEnd?: (wasDrag: boolean) => void;
  onDrag?: (delta: Vec2) => void;
  onClick?: (p?: Vec2) => void;
  onFocusChange?: (d: number) => void;

  constructor(inputListener: InputListener, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.inputListener = inputListener;
    this.initListeners();
  }
  get actionPosition(): Vec2 {
    return this._isKeyboard ? new THREE.Vector2(this.canvas.clientWidth / 2, this.canvas.clientHeight / 2) : this._position;
  }
  get isDrag() {
    return this._isDrag;
  }
  dispose() {
    this.removeListeners();
  }
  onPointerDown(e: Vec2) {
    this._isKeyboard = false;
    this._position = e;
    this.isPress = true;
    this.pressOrigin = e;
    if (this.onPressStart) this.onPressStart();
  }
  onPointerMove(e: Vec2) {
    this._isKeyboard = false;
    const t = this._position.clone();
    this._position = e;
    if (this.isPress) {
      if (e.clone().sub(this.pressOrigin).length() > 3) this._isDrag = true;
      if (this._isDrag && this.onDrag) {
        const i = e.clone().sub(t);
        this.onDrag(i);
      }
    }
  }
  onPointerUp(e: Vec2) {
    this._isKeyboard = false;
    this._position = e;
    if (!this._isDrag && this.isPress && this.onClick) this.onClick(e);
    if (this.onPressEnd) this.onPressEnd(this._isDrag);
    this._isDrag = false;
    this.isPress = false;
  }
  onKey(e: string, t: boolean) {
    switch (e) {
      case 'ArrowLeft':
        this._isKeyboard = true;
        if (this.onDrag) this.onDrag(new THREE.Vector2(4, 0));
        break;
      case 'ArrowRight':
        this._isKeyboard = true;
        if (this.onDrag) this.onDrag(new THREE.Vector2(-4, 0));
        break;
      case 'ArrowUp':
        this._isKeyboard = true;
        if (this.onDrag) this.onDrag(new THREE.Vector2(0, 4));
        break;
      case 'ArrowDown':
        this._isKeyboard = true;
        if (this.onDrag) this.onDrag(new THREE.Vector2(0, -4));
        break;
      case 'Tab':
        this._isKeyboard = true;
        if (this.onFocusChange) this.onFocusChange(t ? -1 : 1);
        break;
      case 'Enter':
        if (this._isKeyboard && this.onClick) this.onClick();
    }
  }
  private initListeners() {
    this.inputListener.onPointerDown = this.onPointerDown.bind(this);
    this.inputListener.onPointerMove = this.onPointerMove.bind(this);
    this.inputListener.onPointerUp = this.onPointerUp.bind(this);
    this.inputListener.onKey = this.onKey.bind(this);
  }
  private removeListeners() {
    this.inputListener.onPointerDown = undefined;
    this.inputListener.onPointerMove = undefined;
    this.inputListener.onPointerUp = undefined;
    this.inputListener.onKey = undefined;
    this.onPressStart = undefined;
    this.onPressEnd = undefined;
    this.onDrag = undefined;
    this.onClick = undefined;
    this.onFocusChange = undefined;
  }
}

// ------------------------------------------------------------------------------------------------ R: coordinates
export class Coordinates {
  camera: THREE.PerspectiveCamera;
  element: HTMLElement;
  constructor(camera: THREE.PerspectiveCamera, element: HTMLElement) {
    this.camera = camera;
    this.element = element;
  }
  uvToWorldAtDepth(e: Vec2, t: number) {
    this.updateCamera();
    const i = this.worldDepthToScreenDepth(t);
    const s = new THREE.Vector3(e.x, e.y, i);
    s.unproject(this.camera);
    return s;
  }
  pxDistanceToUvDistance(e: Vec2) {
    const { offsetWidth: t, offsetHeight: i } = this.element;
    const s = new THREE.Vector2(t, i);
    return e.divide(s);
  }
  /** Passes a 0..1 pixel fraction as if it were NDC (halves it) — original behaviour. */
  uvDistanceToWorldDistance(e: Vec2, t: number) {
    const i = this.uvToWorldAtDepth(new THREE.Vector2(), t);
    const s = this.uvToWorldAtDepth(e, t);
    return new THREE.Vector2(s.x - i.x, s.y - i.y);
  }
  worldDepthToScreenDepth(e: number) {
    this.updateCamera();
    return new THREE.Vector3(0, 0, -e).applyMatrix4(this.camera.projectionMatrix.clone()).z;
  }
  updateCamera() {
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrix();
    this.camera.updateMatrixWorld();
  }
}

// ------------------------------------------------------------------------------------------------ N: navigation
export class Navigation {
  dragAction = new THREE.Vector2();
  velocity = new THREE.Vector2();
  private _positionOffset = new THREE.Vector2(HOME_FOCUS.x, HOME_FOCUS.y);
  focusIndex = 0;
  camera: THREE.PerspectiveCamera;
  coordinates: Coordinates;
  canvas: HTMLCanvasElement;
  inputListener: InputListener;
  actionManager: ActionManager;
  onClick?: () => void;
  onPressStart?: () => void;
  onPressEnd?: (wasDrag: boolean) => void;
  onFocus?: (index: number) => void;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.coordinates = new Coordinates(camera, canvas);
    this.canvas = canvas;
    this.inputListener = new InputListener(this.canvas);
    this.actionManager = new ActionManager(this.inputListener, canvas);
    this.initListeners();
  }
  get pointerUv() {
    return this.actionManager.actionPosition
      .clone()
      .divide(new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight))
      .subScalar(0.5)
      .multiply(new THREE.Vector2(1, -1));
  }
  get positionOffset() {
    return this._positionOffset;
  }
  /** Original `N.update(e)` (module 55607), once per rendered frame with the R3F frame delta `dt` (seconds). */
  update(dt: number) {
    const t = clamp(4 * dt, 0, 1);
    if (this.actionManager.isDrag) this._positionOffset.add(this.dragAction.clone());
    else this._positionOffset.add(this.velocity);
    this.dragAction = new THREE.Vector2();
    this.velocity.lerp(new THREE.Vector2(0, 0), t);
  }
  dispose() {
    this.removeListeners();
    this.actionManager.dispose();
    this.inputListener.dispose();
    // original: `this.canvas.remove()` — the R3F canvas element is removed when the Carousel is disposed
    this.canvas.remove();
  }
  moveTo(e: Vec2) {
    gsap.to(this._positionOffset, { x: e.x, y: e.y, duration: 0.3, ease: 'power2.inOut' });
  }
  click() {
    if (this.onClick) this.onClick();
  }
  drag(e: Vec2) {
    const t = this.getWorldOffset(e);
    this.dragAction = t.clone();
    this.velocity.lerp(t, 1);
  }
  focusChange(e: number) {
    this.focusIndex += e;
    this.focusIndex = Math.max(0, this.focusIndex);
    if (this.onFocus) this.onFocus(this.focusIndex);
  }
  getWorldOffset(e: Vec2) {
    const t = e.clone().multiply(new THREE.Vector2(1, -1));
    const i = this.coordinates.pxDistanceToUvDistance(t);
    return this.coordinates.uvDistanceToWorldDistance(i, this.camera.position.z + 0.58);
  }
  private initListeners() {
    this.actionManager.onClick = this.click.bind(this);
    this.actionManager.onDrag = this.drag.bind(this);
    this.actionManager.onPressStart = () => {
      if (this.onPressStart) this.onPressStart();
    };
    this.actionManager.onPressEnd = (e) => {
      if (this.onPressEnd) this.onPressEnd(e);
    };
    this.actionManager.onFocusChange = this.focusChange.bind(this);
  }
  private removeListeners() {
    this.actionManager.onClick = undefined;
    this.actionManager.onDrag = undefined;
    this.actionManager.onPressStart = undefined;
    this.actionManager.onPressEnd = undefined;
    this.actionManager.onFocusChange = undefined;
    this.onPressStart = undefined;
    this.onPressEnd = undefined;
    this.onClick = undefined;
    this.onFocus = undefined;
  }
}
