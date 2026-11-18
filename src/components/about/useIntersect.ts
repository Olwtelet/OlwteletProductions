'use client';
// Original module 6250 `useIntersect(options)`: IntersectionObserver ({rootMargin:"200px", threshold:0, ...options});
// latches `true` once the element intersects while window.scrollY > 0 (never resets). The options object is an
// effect dependency (module-level constant in the callers, so the observer is created once).
import { useEffect, useRef, useState } from 'react';

export function useIntersect<T extends Element>(options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && window.scrollY > 0) setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: '200px', threshold: 0, ...options },
    );
    io.observe(el);
    return () => {
      if (el) io.unobserve(el);
    };
  }, [options]);
  useEffect(
    () => () => {
      ref.current = null;
    },
    [],
  );
  return { ref, isIntersecting };
}
