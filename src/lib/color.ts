// Colour helpers that must match three.js exactly (the original lerps theme colours with THREE.Color,
// colour management ON => interpolation in linear-sRGB, output as sRGB hex). See design-system.md §6.1.
import { Color } from 'three';

/**
 * `new THREE.Color(from).lerp(new THREE.Color(to), t).getHexString()` with a leading '#'.
 * Quirk kept: an empty/unknown `from` (first load, no inline var yet) is THREE's default white.
 */
export function lerpHex(from: string, to: string, t: number): string {
  return `#${new Color(from).lerp(new Color(to), t).getHexString()}`;
}
