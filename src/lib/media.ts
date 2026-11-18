// Media URL helpers. Olwtelet Productions serves every image, video and model from /public (site-root paths such as
// /brand/…, /projects/…, /assets/…). There is no remote media mirror: local paths are returned unchanged and any
// other URL passes through (the CSP only allows 'self' for media, so content must reference local files).
// `resolveMedia` / `mediaUrl` / `isMediaUrl` keep their former signatures so the components did not change.

const HOST_RE = /^https?:\/\/([^/?#]+)(\/[^?#]*)?/i;

/** URL without query/fragment (first `?` wins). */
export function stripQuery(url: string): string {
  return url.split('#')[0].split('?')[0];
}

export type MediaResolution =
  | { kind: 'local'; url: string }
  | { kind: 'missing'; url: string }
  | { kind: 'passthrough'; url: string };

/** Local site-root paths are 'local'; everything else is 'passthrough' (no remote host is mapped). */
export function resolveMedia(input: string | null | undefined): MediaResolution {
  if (!input) return { kind: 'passthrough', url: '' };
  const url = input.trim();
  if (url.startsWith('/') && !url.startsWith('//')) return { kind: 'local', url };
  return { kind: 'passthrough', url };
}

/** Public URL of a media reference (local paths unchanged). */
export function mediaUrl(input: string | null | undefined): string {
  return resolveMedia(input).url;
}

/** True for an absolute URL of a mapped media host. None are mapped any more. */
export function isMediaUrl(input: string): boolean {
  return HOST_RE.test(input) && false;
}

export type ImgixFit = 'crop' | 'max' | 'clip' | 'min' | 'scale' | 'fill';
export interface ImageTransform {
  /** output width (px) */
  w?: number;
  /** output height (px) */
  h?: number;
  /** source rectangle before resizing: [x, y, w, h] or "x,y,w,h" */
  rect?: [number, number, number, number] | string;
  /** imgix fit; default 'clip' (imgix default) */
  fit?: ImgixFit;
  /** quality 1-100 (imgix default 75) */
  q?: number;
  /** imgix auto=format (webp/avif by Accept). Default true */
  autoFormat?: boolean;
  /** honour rect/w/h/fit/q found in the original URL's query (Prismic adds them). Default true */
  useUrlParams?: boolean;
}

/** Parse imgix params from an original URL (tolerates Prismic's doubled `?`). */
export function imgixParams(url: string): Partial<Record<'rect' | 'w' | 'h' | 'fit' | 'q' | 'auto' | 'fm', string>> {
  const out: Record<string, string> = {};
  const qi = url.indexOf('?');
  if (qi < 0) return out;
  for (const part of url.slice(qi + 1).split(/[?&]/)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq);
    let v = part.slice(eq + 1);
    try {
      v = decodeURIComponent(v);
    } catch {}
    if (['rect', 'w', 'h', 'fit', 'q', 'auto', 'fm'].includes(k)) out[k] = v;
  }
  return out;
}

const NO_TRANSFORM_EXT = /\.(svg|gif|mp4|webm|mov|json|glb)$/i;

/**
 * imgix-style transformed image URL served by /api/img (sharp). Falls back to `mediaUrl()` when no geometric
 * transform is requested, for SVG/GIF/video, and for assets that are not available locally.
 *
 * @example imageUrl('/projects/x/a.jpg', { w: 1920, fit: 'max' })   // '/api/img?src=%2Fprojects%2Fx%2Fa.jpg&w=1920&fit=max&auto=format'
 */
export function imageUrl(input: string | null | undefined, t: ImageTransform = {}): string {
  const r = resolveMedia(input);
  if (r.kind !== 'local' || !r.url) return r.url;
  const local = r.url;
  if (NO_TRANSFORM_EXT.test(stripQuery(local))) return stripQuery(local);
  const fromUrl = t.useUrlParams === false || !input ? {} : imgixParams(input);
  const rect = t.rect !== undefined ? (Array.isArray(t.rect) ? t.rect.join(',') : t.rect) : fromUrl.rect;
  const w = t.w ?? (fromUrl.w ? Number(fromUrl.w) : undefined);
  const h = t.h ?? (fromUrl.h ? Number(fromUrl.h) : undefined);
  const fit = t.fit ?? (fromUrl.fit as ImgixFit | undefined);
  const q = t.q ?? (fromUrl.q ? Number(fromUrl.q) : undefined);
  if (!rect && !w && !h) return stripQuery(local);
  const p = new URLSearchParams();
  p.set('src', stripQuery(local));
  if (rect) p.set('rect', rect);
  if (w) p.set('w', String(Math.round(w)));
  if (h) p.set('h', String(Math.round(h)));
  if (fit) p.set('fit', fit);
  if (q) p.set('q', String(q));
  if (t.autoFormat !== false) p.set('auto', 'format');
  return `/api/img?${p.toString()}`;
}

/**
 * Deep-copy any JSON value replacing every original media URL string with its local URL.
 * Use it on the server before handing CMS data / the blueprint to client components.
 */
export function mapMediaDeep<T>(value: T): T {
  if (typeof value === 'string') return (isMediaUrl(value) ? mediaUrl(value) : value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => mapMediaDeep(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = mapMediaDeep(v);
    return out as T;
  }
  return value;
}
