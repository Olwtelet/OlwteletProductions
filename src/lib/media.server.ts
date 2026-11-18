// Server-only media helpers: map a local public URL to its file under /public (used by /api/img).
import 'server-only';
import path from 'node:path';
import { resolveMedia, stripQuery } from './media';

/** No remote media inventory any more (every asset is a local /public file). Kept for the helpers' signatures. */
export function inventoryPublicUrl(url: string): string | null {
  void url;
  return null;
}

/** True when the URL is a downloaded asset of the inventory (status ok). */
export function isInventoryAsset(url: string): boolean {
  return inventoryPublicUrl(url) !== null;
}

export const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Absolute file path inside /public for a local public URL ("/remote/...", "/assets/..."), or an original URL
 * (mapped first). Returns null if the result would escape /public or the URL is not local.
 */
export function publicFilePath(urlOrPublic: string): string | null {
  let local = urlOrPublic;
  if (/^https?:\/\//i.test(local)) {
    const inv = inventoryPublicUrl(local);
    const r = inv ? { kind: 'local' as const, url: inv } : resolveMedia(local);
    if (r.kind !== 'local') return null;
    local = r.url;
  }
  if (!local.startsWith('/')) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(stripQuery(local));
  } catch {
    return null;
  }
  const file = path.resolve(PUBLIC_DIR, '.' + decoded);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
  return file;
}
