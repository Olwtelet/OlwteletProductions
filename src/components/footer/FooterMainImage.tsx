'use client';
// Footer centre image — original module 29774 (div.Footer_MainImage > Suspense > next/dynamic(chunk 5428, ssr:false)).
// Chunk 5428 (module 95428) is NOT WebGL: it is a memoised component that picks one of `main_images` at random
// (Math.random, once per mount) and renders next/image with `fill` (object-fit: contain from the footer CSS);
// emitted here as the equivalent hand-written <img> on /api/img (see FooterRandomImage).
// SSR output is the bail-out-to-client template, so the image only appears after hydration (same here).
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import type { FooterImageItem } from './FooterRandomImage';
import s from './footer.module.css';

const FooterRandomImage = dynamic(() => import('./FooterRandomImage'), { ssr: false });

export default function FooterMainImage({ images }: { images: FooterImageItem[] }) {
  return (
    <div className={s.MainImage}>
      <Suspense fallback={null}>
        <FooterRandomImage images={images} />
      </Suspense>
    </div>
  );
}
