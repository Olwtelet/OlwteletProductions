/** Join class names, skipping falsy values (equivalent of the original `styled()` helper's className concat). */
export function cx(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(' ');
}
