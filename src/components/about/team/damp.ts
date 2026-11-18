// maath `easing.damp` (original chunk 1590 module 51590 `B`), copied from the bundle: critically damped spring
// with smoothTime (default 0.25), delta (default 0.01), maxSpeed (∞), easing `N`, eps 0.001. Mutates current[prop]
// and stores its velocity in current.__damp["velocity_" + prop]. Returns true while still moving.
// (maath is not installed here; the function is 25 lines, so it is reproduced instead of adding the dependency.)

const exp = (t: number) => 1 / (1 + t + 0.48 * t * t + 0.235 * t * t * t);

type Dampable = Record<string, unknown> & { __damp?: Record<string, number> };

export function damp(
  current: object,
  prop: string,
  target: number,
  smoothTime = 0.25,
  delta = 0.01,
  maxSpeed = Infinity,
  easing: (t: number) => number = exp,
  eps = 0.001,
): boolean {
  const t = current as Dampable;
  const vel = 'velocity_' + prop;
  if (t.__damp === undefined) t.__damp = {};
  if (t.__damp[vel] === undefined) t.__damp[vel] = 0;
  const cur = t[prop] as number;
  if (Math.abs(cur - target) <= eps) {
    t[prop] = target;
    return false;
  }
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const e = easing(omega * delta);
  let change = cur - target;
  const originalTo = target;
  const maxChange = maxSpeed * smoothTime;
  change = Math.min(Math.max(change, -maxChange), maxChange);
  target = cur - change;
  const temp = (t.__damp[vel] + omega * change) * delta;
  t.__damp[vel] = (t.__damp[vel] - omega * temp) * e;
  let output = target + (change + temp) * e;
  if (originalTo - cur > 0.0 === output > originalTo) {
    output = originalTo;
    t.__damp[vel] = (output - originalTo) / delta;
  }
  t[prop] = output;
  return true;
}
