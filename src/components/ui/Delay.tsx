'use client';
// Original module 42686: renders children only after `delay` ms (setTimeout from mount).
//   <Delay delay={500}><Slices/></Delay>
import { useEffect, useState, type ReactNode } from 'react';

export function Delay({ children, delay = 0 }: { children?: ReactNode; delay?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return ready ? <>{children}</> : null;
}

export default Delay;
