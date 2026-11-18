// Renders Prismic rich-text JSON exactly like @prismicio/react's <PrismicRichText> default serializer
// (paragraph/heading1-6/preformatted/list-item/o-list-item/image/embed + strong/em/hyperlink/label spans).
// Works in server and client components (no hooks). Media URLs go through mediaUrl().
import { Fragment, type ElementType, type ReactNode } from 'react';
import { mediaUrl } from '../media';
import type { PrismicLink, RichTextField, RTBlock, RTSpan } from '../types';

export type RTNodeType =
  | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6'
  | 'paragraph' | 'preformatted' | 'strong' | 'em' | 'list-item' | 'o-list-item'
  | 'group-list-item' | 'group-o-list-item' | 'image' | 'embed' | 'hyperlink' | 'label' | 'span';

export interface RTComponentProps {
  children: ReactNode;
  /** the block (for block types) or span (for strong/em/hyperlink/label) */
  node: RTBlock | RTSpan;
  /** raw text of the block/span */
  text?: string;
  /** resolved href for hyperlinks */
  href?: string;
}
export type RTComponents = Partial<Record<RTNodeType, (props: RTComponentProps) => ReactNode>>;

/**
 * Props the link components receive. Typing the components with them (instead of a bare ElementType) keeps the JSX below
 * valid when a library adds its own intrinsic elements: @react-three/fiber 9.5.0 declares its three.js elements globally,
 * and a bare ElementType union then types `children` as never.
 */
export interface LinkComponentProps {
  href?: string;
  target?: string;
  rel?: string;
  children?: ReactNode;
}

export interface RichTextProps {
  field: RichTextField;
  /** per-type overrides */
  components?: RTComponents;
  /** custom URL resolver for Document links (default: link.url, then a route by custom type) */
  linkResolver?: (link: PrismicLink) => string | null | undefined;
  /** component for internal links (default 'a'). It must accept LinkComponentProps, whose `href` can be undefined (a
   * link field with no resolvable URL), so components that require `href`, such as TransitionLink or next/link, need
   * a wrapper. No caller passes one today. */
  internalLinkComponent?: ElementType<LinkComponentProps>;
  /** component for external links (default 'a') */
  externalLinkComponent?: ElementType<LinkComponentProps>;
  /** value returned when the field is empty (default null) */
  fallback?: ReactNode;
}

/** Default Document-link routes (module 72175 templates). */
export function defaultLinkResolver(link: PrismicLink): string | null {
  if (link.url) return link.url;
  if (link.link_type === 'Document' && link.uid) {
    switch (link.type) {
      case 'project':
        return `/projects/${link.uid}`;
      case 'about_page':
        return `/about/${link.uid}`;
      case 'contact':
        return '/contact';
      case 'page':
        return `/${link.uid}`;
      default:
        return `/${link.uid}`;
    }
  }
  return null;
}

/** Resolved href for any Prismic link field (Web/Document/Media). Media links are mapped to local files. */
export function linkHref(
  link: PrismicLink | null | undefined,
  resolver: (link: PrismicLink) => string | null | undefined = defaultLinkResolver,
): string | null {
  if (!link || link.link_type === 'Any') return null;
  if (link.link_type === 'Media') return link.url ? mediaUrl(link.url) : null;
  if (link.link_type === 'Document') return resolver(link) ?? null;
  return link.url ?? null;
}

/** Plain text of a rich-text field (blocks joined with "\n" — @prismicio/client asText default separator is " "). */
export function asText(field: RichTextField, separator = ' '): string {
  if (!field) return '';
  return field.map((b) => b.text ?? '').filter(Boolean).join(separator);
}

interface SpanNode {
  start: number;
  end: number;
  span: RTSpan;
  children: SpanNode[];
}

/** Build the nested span tree (overlapping spans are split, as in @prismicio/richtext asTree). */
function buildSpanTree(text: string, spans: RTSpan[] = []): SpanNode[] {
  const queue = spans
    .filter((s) => s.end > s.start)
    .map((s) => ({ start: s.start, end: s.end, span: s }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const root: SpanNode = { start: 0, end: text.length, span: { start: 0, end: text.length, type: 'span' }, children: [] };
  const stack: SpanNode[] = [root];
  while (queue.length) {
    const s = queue.shift()!;
    while (stack.length > 1 && s.start >= stack[stack.length - 1].end) stack.pop();
    const parent = stack[stack.length - 1];
    let end = s.end;
    if (end > parent.end) {
      // split: the part outside the parent is re-queued
      const rest = { start: parent.end, end: s.end, span: s.span };
      let i = queue.findIndex((q) => q.start > rest.start || (q.start === rest.start && q.end < rest.end));
      if (i < 0) i = queue.length;
      queue.splice(i, 0, rest);
      end = parent.end;
    }
    const node: SpanNode = { start: s.start, end, span: s.span, children: [] };
    parent.children.push(node);
    stack.push(node);
  }
  return root.children;
}

function withBreaks(text: string, key: string): ReactNode {
  const parts = text.split('\n');
  if (parts.length === 1) return text;
  return parts.map((p, i) => (
    <Fragment key={`${key}-${i}`}>
      {i > 0 && <br />}
      {p}
    </Fragment>
  ));
}

export function RichText({
  field,
  components = {},
  linkResolver = defaultLinkResolver,
  internalLinkComponent: Internal = 'a',
  externalLinkComponent: External = 'a',
  fallback = null,
}: RichTextProps) {
  if (!field || !Array.isArray(field) || field.length === 0 || (field.length === 1 && !field[0].text && field[0].type !== 'image' && field[0].type !== 'embed'))
    return <>{fallback}</>;

  const renderSpans = (text: string, nodes: SpanNode[], from: number, to: number, key: string): ReactNode[] => {
    const out: ReactNode[] = [];
    let cursor = from;
    nodes.forEach((n, i) => {
      if (n.start > cursor) out.push(<Fragment key={`${key}-t${i}`}>{withBreaks(text.slice(cursor, n.start), `${key}-t${i}`)}</Fragment>);
      const inner = renderSpans(text, n.children, n.start, n.end, `${key}-${i}`);
      const sText = text.slice(n.start, n.end);
      const k = `${key}-s${i}`;
      const type = n.span.type as RTNodeType;
      const custom = components[type];
      if (type === 'hyperlink') {
        const link = (n.span.data || {}) as PrismicLink;
        const href = linkHref(link, linkResolver) ?? undefined;
        if (custom) out.push(<Fragment key={k}>{custom({ children: inner, node: n.span, text: sText, href })}</Fragment>);
        else {
          const internal = link.link_type === 'Document' || (href ? href.startsWith('/') && !href.startsWith('//') : false);
          const Comp = internal ? Internal : External;
          const target = link.target || undefined;
          out.push(
            <Comp key={k} href={href} {...(target ? { target, rel: 'noreferrer' } : {})}>
              {inner}
            </Comp>,
          );
        }
      } else if (custom) out.push(<Fragment key={k}>{custom({ children: inner, node: n.span, text: sText })}</Fragment>);
      else if (type === 'strong') out.push(<strong key={k}>{inner}</strong>);
      else if (type === 'em') out.push(<em key={k}>{inner}</em>);
      else if (type === 'label') out.push(<span key={k} className={n.span.data?.label}>{inner}</span>);
      else out.push(<span key={k}>{inner}</span>);
      cursor = n.end;
    });
    if (cursor < to) out.push(<Fragment key={`${key}-end`}>{withBreaks(text.slice(cursor, to), `${key}-end`)}</Fragment>);
    return out;
  };

  const renderBlock = (b: RTBlock, key: string): ReactNode => {
    const text = b.text ?? '';
    const children = renderSpans(text, buildSpanTree(text, b.spans), 0, text.length, key);
    const type = b.type as RTNodeType;
    const custom = components[type];
    if (custom) return <Fragment key={key}>{custom({ children, node: b, text })}</Fragment>;
    switch (b.type) {
      case 'heading1': return <h1 key={key}>{children}</h1>;
      case 'heading2': return <h2 key={key}>{children}</h2>;
      case 'heading3': return <h3 key={key}>{children}</h3>;
      case 'heading4': return <h4 key={key}>{children}</h4>;
      case 'heading5': return <h5 key={key}>{children}</h5>;
      case 'heading6': return <h6 key={key}>{children}</h6>;
      case 'preformatted': return <pre key={key}>{children}</pre>;
      case 'list-item':
      case 'o-list-item': return <li key={key}>{children}</li>;
      case 'image': {
        const img = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(b.url)} alt={b.alt ?? ''} {...(b.copyright ? { 'data-copyright': String(b.copyright) } : {})} />
        );
        const href = b.linkTo ? linkHref(b.linkTo, linkResolver) : null;
        return (
          <p key={key} className="block-img">
            {href ? <a href={href}>{img}</a> : img}
          </p>
        );
      }
      case 'embed':
        return (
          <div
            key={key}
            data-oembed={b.oembed?.embed_url}
            data-oembed-type={b.oembed?.type}
            dangerouslySetInnerHTML={{ __html: b.oembed?.html ?? '' }}
          />
        );
      default: return <p key={key}>{children}</p>;
    }
  };

  // group consecutive list items
  const out: ReactNode[] = [];
  for (let i = 0; i < field.length; i++) {
    const b = field[i];
    if (b.type === 'list-item' || b.type === 'o-list-item') {
      const items: ReactNode[] = [];
      const t = b.type;
      let j = i;
      while (j < field.length && field[j].type === t) {
        items.push(renderBlock(field[j], `b${j}`));
        j++;
      }
      const groupType = t === 'list-item' ? 'group-list-item' : 'group-o-list-item';
      const custom = components[groupType];
      if (custom) out.push(<Fragment key={`g${i}`}>{custom({ children: items, node: b })}</Fragment>);
      else out.push(t === 'list-item' ? <ul key={`g${i}`}>{items}</ul> : <ol key={`g${i}`}>{items}</ol>);
      i = j - 1;
    } else out.push(renderBlock(b, `b${i}`));
  }
  return <>{out}</>;
}

export default RichText;
