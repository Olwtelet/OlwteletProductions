'use client';
// drei <PerformanceMonitor> (original chunk 3671 module 13923 `l`), copied from the bundle (drei is not installed
// here). Samples performance.now() each frame; every `ms` it records an fps average; after `iterations` averages it
// calls onIncline / onDecline when more than `threshold` of them are above/below `bounds(refreshrate)`.
// The team section only uses onDecline → graphicsTier LOW (module 15888).
import { useFrame } from '@react-three/fiber';
import { createContext, createElement, useState, type ReactNode } from 'react';

interface PerfApi {
  fps: number;
  index: number;
  factor: number;
  flipped: number;
  refreshrate: number;
  fallback: boolean;
  frames: number[];
  averages: number[];
  subscriptions: Map<symbol, unknown>;
}

const PerfContext = createContext<PerfApi | null>(null);

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
  children,
}: {
  iterations?: number;
  ms?: number;
  threshold?: number;
  step?: number;
  factor?: number;
  flipflops?: number;
  bounds?: (refreshrate: number) => number[];
  onIncline?: (api: PerfApi) => void;
  onDecline?: (api: PerfApi) => void;
  onChange?: (api: PerfApi) => void;
  onFallback?: (api: PerfApi) => void;
  children?: ReactNode;
}) {
  const [api] = useState<PerfApi>(() => ({
    fps: 0,
    index: 0,
    factor,
    flipped: 0,
    refreshrate: 0,
    fallback: false,
    frames: [],
    averages: [],
    subscriptions: new Map(),
  }));
  let lastFactor = 0;
  useFrame(() => {
    const { frames, averages } = api;
    if (api.fallback || averages.length >= iterations) return;
    frames.push(performance.now());
    const passed = frames[frames.length - 1] - frames[0];
    if (passed < ms) return;
    api.fps = Math.round((frames.length / passed) * 1e3) / 1;
    api.refreshrate = Math.max(api.refreshrate, api.fps);
    averages[api.index++ % iterations] = api.fps;
    if (averages.length === iterations) {
      const [lower, upper] = bounds(api.refreshrate);
      const above = averages.filter((v) => v >= upper);
      const below = averages.filter((v) => v < lower);
      if (above.length > iterations * threshold) {
        api.factor = Math.min(1, api.factor + step);
        api.flipped++;
        onIncline?.(api);
      }
      if (below.length > iterations * threshold) {
        api.factor = Math.max(0, api.factor - step);
        api.flipped++;
        onDecline?.(api);
      }
      if (lastFactor !== api.factor) {
        lastFactor = api.factor;
        onChange?.(api);
      }
      if (api.flipped > flipflops && !api.fallback) {
        api.fallback = true;
        onFallback?.(api);
      }
      api.averages = [];
    }
    api.frames = [];
  });
  return createElement(PerfContext.Provider, { value: api }, children);
}
