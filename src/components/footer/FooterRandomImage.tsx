'use client';
// Original chunk 5428 / module 95428, verbatim logic:
//   memo(({content}) => { const i = floor(random() * main_images.length); const {main_image} = main_images[i];
//                         return isFilled(main_image) ? <Image src={main_image.url} alt={main_image.alt ?? ""} fill/> : null })
// The pick is re-evaluated on every render of the memoised component (in practice once per mount).
//
// Delivery (audit about-07, MEASURED 2026-11-07 docs/evidence/chrome/wave-b/footer-img-orig.json): the original's
// next/image uses the default loader — `fill` without `sizes` ⇒ sizes="100vw" and an 8-candidate srcset over
// deviceSizes (`/_next/image?url=…&w=640…3840&q=75 Nw`), src = the 3840 candidate, loading="lazy",
// decoding="async", data-nimg="fill". The optimizer never upscales, so every candidate is the 440×890 source
// re-encoded as WebP q75: at 1440 DPR 1 the browser picks w=1920 (naturalWidth 330×667), at DPR 2 w=3840 (165×333).
// The coordinator config has `images.unoptimized` (no /_next/image), which makes next/image drop srcset/sizes, so the
// same <img> is emitted here by hand on the local resizer (/api/img fit=max = no upscale, q=75, fm=webp): identical
// candidate choice, natural size and pixels.
import { memo, type CSSProperties } from 'react';
import { imageUrl } from '@/lib/media';

export interface FooterImageItem {
  main_image: { url?: string | null; alt?: string | null; dimensions?: { width: number; height: number } } | null;
}

const isFilledImage = (img: FooterImageItem['main_image']): img is { url: string; alt?: string | null } => img != null && !!img.url;

/** next.config default `images.deviceSizes` (the widths next/image lists for a `fill` image without `sizes`). */
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
/** next/image default quality. */
const QUALITY = 75;

/** next/image default loader (`/_next/image?url&w&q`) mapped onto /api/img: resize to `w` without upscaling, WebP q75. */
function loader(src: string, width: number): string {
  const u = imageUrl(src, { w: width, fit: 'max', q: QUALITY, autoFormat: false });
  // the Next optimizer answers WebP (default images.formats); /api/img only when the file is available locally
  return u.startsWith('/api/img?') ? `${u}&fm=webp` : u;
}

/** next/image `fill` style (placeholder "empty" ⇒ color: transparent). */
const FILL_STYLE: CSSProperties = { position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent' };

function FooterRandomImage({ images }: { images: FooterImageItem[] }) {
  if (!images.length) return null;
  const i = Math.floor(Math.random() * images.length);
  const { main_image } = images[i];
  if (!isFilledImage(main_image)) return null;
  const srcSet = DEVICE_SIZES.map((w) => `${loader(main_image.url, w)} ${w}w`).join(', ');
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image cannot emit a srcset under images.unoptimized
    <img
      alt={main_image.alt ?? ''}
      loading="lazy"
      decoding="async"
      data-nimg="fill"
      style={FILL_STYLE}
      sizes="100vw"
      srcSet={srcSet}
      src={loader(main_image.url, DEVICE_SIZES[DEVICE_SIZES.length - 1])}
    />
  );
}

export default memo(FooterRandomImage);
