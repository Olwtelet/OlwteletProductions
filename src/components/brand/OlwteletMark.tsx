// The Olwtelet Productions symbol as inline SVG (src/content/brand-mark.ts). It takes the current text colour
// (`currentColor`), so it follows the page theme: white on dark pages, black on light ones. Proportions are the
// drawing's own (781.8 × 978.3); size it by height only.
import type { SVGProps } from 'react';
import { BRAND } from '@/content/brand';
import { MARK_PATH, MARK_VIEWBOX } from '@/content/brand-mark';

export function OlwteletMark({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string | null }) {
  const label = title === undefined ? BRAND.name : title;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`}
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...props}
    >
      {label ? <title>{label}</title> : null}
      <path fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}

export default OlwteletMark;
