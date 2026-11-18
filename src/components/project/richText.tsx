'use client';
// PrismicRichText as used by the case study (module 95417 default serializer): hyperlinks are PrismicLink
// (chunk 5417): href = the field's resolved URL, VERBATIM (an absolute link stays absolute);
// target = the field's target; rel = "noreferrer" for every href that does not start with "/" (not "//") or "#"
// (PrismicLink `isExternal`), none otherwise; internal hrefs use the internal component (next/link), the others a plain <a>.
import Link from 'next/link';
import { RichText, type RTComponents } from '@/lib/prismic/RichText';
import type { PrismicLink, RichTextField } from '@/lib/types';

const INTERNAL = /^(\/(?!\/)|#)/;

const components: RTComponents = {
  hyperlink: ({ children, node, href }) => {
    const link = ((node as { data?: PrismicLink }).data || {}) as PrismicLink;
    const target = link.target || undefined;
    if (!href) return <>{children}</>;
    if (INTERNAL.test(href))
      return (
        <Link href={href} {...(target ? { target } : {})}>
          {children}
        </Link>
      );
    // attribute order as PrismicLink renders it: {...{target}, href, rel}
    return (
      <a {...(target ? { target } : {})} href={href} rel="noreferrer">
        {children}
      </a>
    );
  },
};

export function CaseStudyRichText({ field }: { field: RichTextField }) {
  return <RichText field={field} components={components} />;
}
