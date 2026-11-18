'use client';
// Lenis smooth scrolling (original module 74232). Disabled on "/" and "/contact" (instance destroyed there).
//   const lenis = useLenis();  lenis?.stop(); … lenis?.start();   (e.g. the contact modal)
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { lenisEasing } from '@/lib/easings';
import { ROUTES } from '@/lib/theme';

export const LENIS_OPTIONS = {
  duration: 0.7,
  easing: lenisEasing,
  orientation: 'vertical' as const,
  gestureOrientation: 'vertical' as const,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1,
};
const DISABLED_ON: string[] = [ROUTES.contact, ROUTES.home];

const LenisContext = createContext<Lenis | null>(null);

/** The active Lenis instance, or null on "/" and "/contact". */
export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const ref = useRef<Lenis | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const disabled = DISABLED_ON.includes(pathname);

  useEffect(() => {
    if (disabled) {
      ref.current?.destroy();
      ref.current = null;
      setLenis(null);
      return;
    }
    const instance = new Lenis({ ...LENIS_OPTIONS, autoRaf: true });
    ref.current = instance;
    setLenis(instance);
    return () => {
      instance.destroy();
      if (ref.current === instance) ref.current = null;
      setLenis(null);
    };
  }, [disabled]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

export default SmoothScroll;
