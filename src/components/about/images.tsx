// Emulations of the two Prismic image components used by the About slices, rewritten onto the local media
// (`@/lib/media` imageUrl → /api/img imgix emulation). No hooks: usable from server and client components.
//
// - `PrismicImage` (@prismicio/react, chunk 7544 module 15741 `P`): a plain eager <img> whose srcset uses the
//   default widths [640, 828, 1200, 2048, 3840] (`?width=N Nw`, no `sizes` ⇒ 100vw), src = the field URL.
//   Used by AboutColumns (section image, zone icons, zone images).
// - `PrismicNextImage` (@prismicio/next, chunk 1460 module 32048): next/image with the imgix loader
//   (`fit=max` unless the URL has one, `w=<width>`), width/height = field dimensions, `loading="lazy"`,
//   `decoding="async"`, `style="color:transparent"`, fixed-width 1x/2x srcset picked from next's
//   deviceSizes+imageSizes (e.g. 1146 → w=1200 1x, w=3840 2x — MEASURED in live-texts-media-agency-1440.json).
import type { CSSProperties } from 'react';
import { imageUrl } from '@/lib/media';

export interface PrismicImageField {
  url?: string | null;
  alt?: string | null;
  dimensions?: { width: number; height: number } | null;
  id?: string;
  [k: string]: unknown;
}

export function isFilledImage(field: PrismicImageField | null | undefined): field is PrismicImageField & { url: string } {
  return !!field && typeof field.url === 'string' && field.url.length > 0;
}

const PRISMIC_DEFAULT_WIDTHS = [640, 828, 1200, 2048, 3840];

/** @prismicio/react <PrismicImage field fallbackAlt? /> */
export function PrismicImage({ field, alt, fallbackAlt, className }: { field?: PrismicImageField | null; alt?: string; fallbackAlt?: string; className?: string }) {
  if (!isFilledImage(field)) return null;
  const src = imageUrl(field.url, { useUrlParams: true });
  const srcSet = PRISMIC_DEFAULT_WIDTHS.map((w) => `${imageUrl(field.url, { w })} ${w}w`).join(', ');
  // eslint-disable-next-line @next/next/no-img-element -- reproduces @prismicio/react PrismicImage markup (plain img + srcset)
  return <img className={className} src={src} srcSet={srcSet} alt={alt ?? (field.alt || fallbackAlt) ?? undefined} />;
}

/** next.config defaults (deviceSizes + imageSizes), sorted — used by next/image to build a fixed-width srcset. */
const NEXT_ALL_SIZES = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

function nextWidths(width: number): number[] {
  const ws = [width, width * 2].map((w) => NEXT_ALL_SIZES.find((p) => p >= w) || NEXT_ALL_SIZES[NEXT_ALL_SIZES.length - 1]);
  return [...new Set(ws)];
}

/** imgix loader of @prismicio/next: keeps the URL's params, `fit` from the URL or `max`, `w=<width>`. */
function prismicNextLoader(url: string, width: number): string {
  const qi = url.indexOf('?');
  const fit = qi >= 0 ? new URLSearchParams(url.slice(qi + 1)).get('fit') : null;
  return imageUrl(url, { w: width, fit: (fit as 'max' | null) || 'max' });
}

/** @prismicio/next <PrismicNextImage field fallbackAlt? /> */
export function PrismicNextImage({
  field,
  alt,
  fallbackAlt,
  className,
  style,
}: {
  field?: PrismicImageField | null;
  alt?: string;
  fallbackAlt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!isFilledImage(field)) return null;
  const width = field.dimensions?.width;
  const height = field.dimensions?.height;
  const widths = width ? nextWidths(width) : [3840];
  const srcSet = widths.map((w, i) => `${prismicNextLoader(field.url, w)} ${i + 1}x`).join(', ');
  const src = prismicNextLoader(field.url, widths[widths.length - 1]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- reproduces the PrismicNextImage output markup
    <img
      alt={alt ?? (field.alt || fallbackAlt) ?? ''}
      loading="lazy"
      width={width}
      height={height}
      decoding="async"
      data-nimg="1"
      className={className}
      style={{ color: 'transparent', ...style }}
      srcSet={srcSet}
      src={src}
    />
  );
}
