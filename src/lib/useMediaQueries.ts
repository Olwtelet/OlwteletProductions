'use client';
// JS breakpoints of the original (module 86832, copied in chunks 105/665/9332, careers page and home page;
// design-system.md §3.2). STRICTLY greater than — unlike the CSS `min-width` (≥) queries — so at exactly 1024px
// `isMinLarge` is false while the ≥1024 CSS already applies (quirk: the home view toggle is vertical at 1024).
// The width starts at 0 (SSR and first client render ⇒ all false) and is set from window.innerWidth in an effect,
// then on every `resize`.
//   const { isMinMedium, isMinLarge, isMinXLarge } = useMediaQueries();
import { useEffect, useState } from 'react';

export const JS_BREAKPOINTS = { medium: 599, large: 1024, xlarge: 1440 } as const;

export function useMediaQueries() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return {
    isMinMedium: width > JS_BREAKPOINTS.medium,
    isMinLarge: width > JS_BREAKPOINTS.large,
    isMinXLarge: width > JS_BREAKPOINTS.xlarge,
    /** below the CSS large band (width < 1024, true before the first measure like !isMinLarge): matches the
     *  `@media (min-width: 1024px)` rules exactly, without the 1024 px quirk of isMinLarge */
    isBelowLargeCss: width < JS_BREAKPOINTS.large,
  };
}

export default useMediaQueries;
