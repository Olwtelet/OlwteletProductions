// Media helpers of the case-study template (client-safe).
// - isSafari: module 66754 `nr` (verbatim regex).
// - videoPoster / videoMimeType: module 26641 `c` and module 72452 (LazyVideo poster + <source type>).
// - imageSrcSet: the srcset next/image (2000×1000, default loader, q 75) and PrismicNextImage (imgix, fit=max)
//   produce on the original, re-expressed with the local imgix emulation (/api/img).
import { imageUrl, resolveMedia } from '@/lib/media';

/** module 66754 `nr`: true for Safari (incl. iOS UA), false for Chrome/Android. */
export function isSafari(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.userAgent && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

const AT = /^@/;
const EXT = /\.[^.]+$/;
/** module 26641 `c`: `<dir>/posters/<basename without extension>-poster.webp` ('' when the URL has no "/"). */
export function videoPoster(url: string): string {
  if (!url) return '';
  const u = url.replace(AT, '');
  const slash = u.lastIndexOf('/');
  if (slash === -1) return '';
  return `${u.substring(0, slash + 1)}posters/${u.substring(slash + 1).replace(EXT, '')}-poster.webp`;
}

/** module 72452: `video/<last dot segment>` (mp4 when empty). */
export function videoMimeType(url?: string | null): string {
  const parts = url?.split('.') || [];
  return `video/${parts[parts.length - 1] || 'mp4'}`;
}

/** Media URL as served: local paths unchanged (no remote host is mirrored any more). */
export function noHotlink(url: string | null | undefined): string {
  if (!url) return '';
  return resolveMedia(url).url;
}

/**
 * next/image (default loader, `width={2000}`, q 75) → 1x w=2048, 2x w=3840, src = the 2x URL
 * (MEASURED: `/_next/image?url=…&w=2048&q=75 1x, …&w=3840&q=75 2x`, src w=3840).
 */
export function nextImage2000(url: string) {
  const one = imageUrl(url, { w: 2048, fit: 'max', q: 75 });
  const two = imageUrl(url, { w: 3840, fit: 'max', q: 75 });
  return { src: two, srcSet: `${one} 1x, ${two} 2x` };
}

/**
 * PrismicNextImage (imgix loader, no `width` prop, field width ≤ 1920) → `fit=max&w=1920` 1x, `w=3840` 2x,
 * src = the 2x URL (MEASURED on the carousel).
 */
export function prismicNextImage(url: string) {
  const one = imageUrl(url, { w: 1920, fit: 'max' });
  const two = imageUrl(url, { w: 3840, fit: 'max' });
  return { src: two, srcSet: `${one} 1x, ${two} 2x` };
}

/** React ids (`«r1»`, `_r_1_`, `:r1:`) made safe for a CSS class/id selector (original: replaceAll(":", "_")). */
export function safeDomId(id: string): string {
  return 'p' + id.replace(/[^A-Za-z0-9_-]/g, '_');
}

/**
 * module 25743 `e` = @prismicio/client asText(field, " "): concatenates every block's text with the separator
 * (empty blocks still add a separator, unlike a filter/join). null when the field is empty.
 */
export function asTextVerbatim(field: Array<{ text?: string }> | null | undefined, separator = ' '): string | null {
  if (!field) return null;
  let out = '';
  for (const b of field) if (b && 'text' in b) out += (out ? separator : '') + (b.text ?? '');
  return out;
}
