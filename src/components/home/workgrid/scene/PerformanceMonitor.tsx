'use client';
// Port of the drei-style PerformanceMonitor shipped with the original (chunks__3671 module 13923). The original only
// passes `onDecline: () => setGraphicsTier(LOW)`; nothing ever switches back to HIGH (no onIncline).
// Defaults: iterations 10, ms 250, threshold .75, step .1, factor .5, bounds = refreshrate > 100 ? [60,100] : [40,60].
// Adapted from the PerformanceMonitor of @react-three/drei, under the MIT license: see THIRD_PARTY_NOTICES.md.
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';

interface MonitorApi {
  fps: number;
  index: number;
  factor: number;
  flipped: number;
  refreshrate: number;
  fallback: boolean;
  frames: number[];
  averages: number[];
}

export function PerformanceMonitor({
  iterations = 10,
  ms = 250,
  threshold = 0.75,
  step = 0.1,
  factor = 0.5,
  flipflops = Infinity,
  bounds = (r: number) => (r > 100 ? [60, 100] : [40, 60]),
  onIncline,
  onDecline,
  onChange,
  onFallback,
}: {
  iterations?: number;
  ms?: number;
  threshold?: number;
  step?: number;
  factor?: number;
  flipflops?: number;
  bounds?: (refreshrate: number) => number[];
  onIncline?: (api: MonitorApi) => void;
  onDecline?: (api: MonitorApi) => void;
  onChange?: (api: MonitorApi) => void;
  onFallback?: (api: MonitorApi) => void;
}) {
  const [b] = useState<MonitorApi>(() => ({ fps: 0, index: 0, factor, flipped: 0, refreshrate: 0, fallback: false, frames: [], averages: [] }));
  let w = 0;
  useFrame(() => {
    const { frames: r, averages: o } = b;
    if (b.fallback || o.length >= iterations) return;
    r.push(performance.now());
    const i = r[r.length - 1] - r[0];
    if (i < ms) return;
    b.fps = Math.round((r.length / i) * 1e3) / 1;
    b.refreshrate = Math.max(b.refreshrate, b.fps);
    o[b.index++ % iterations] = b.fps;
    if (o.length === iterations) {
      const [lo, up] = bounds(b.refreshrate);
      const upper = o.filter((e) => e >= up);
      const lower = o.filter((e) => e < lo);
      if (upper.length > iterations * threshold) {
        b.factor = Math.min(1, b.factor + step);
        b.flipped++;
        if (onIncline) onIncline(b);
      }
      if (lower.length > iterations * threshold) {
        b.factor = Math.max(0, b.factor - step);
        b.flipped++;
        if (onDecline) onDecline(b);
      }
      if (w !== b.factor) {
        w = b.factor;
        if (onChange) onChange(b);
      }
      if (b.flipped > flipflops && !b.fallback) {
        b.fallback = true;
        if (onFallback) onFallback(b);
      }
      b.averages = [];
    }
    b.frames = [];
  });
  return null;
}

export default PerformanceMonitor;
