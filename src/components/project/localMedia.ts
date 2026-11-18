// Deep pass over case-study data that maps mirrored media URLs to local paths. No remote host is mirrored any more
// (every project asset is a /public path), so this returns the data unchanged; kept as the single place to plug a CDN.
import { isMediaUrl } from '@/lib/media';
import { noHotlink } from './media';

export function localMediaDeep<T>(value: T): T {
  if (typeof value === 'string') return (/^https?:\/\//i.test(value) && isMediaUrl(value) ? noHotlink(value) : value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => localMediaDeep(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = localMediaDeep(v);
    return out as T;
  }
  return value;
}
