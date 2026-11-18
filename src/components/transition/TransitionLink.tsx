'use client';
// Original module 68481. next/link (prefetch on) whose click, when href !== pathname, is replaced by the
// page-transition intent + click.mp3. Same-path clicks fall through to next/link (soft navigation to href).
//   <TransitionLink href="/careers" isNavOrigin>Careers</TransitionLink>
// Same-path click on the home (href "/" while pathname is "/"): the original's next/link push("/") lands on the
// session's home alias (Next 16.2.1 router quirk, emulated in home/ui/homeAlias.ts), so on a hard-loaded
// /?zone=product the logo is a no-op (URL, history.length and the filtered grid kept; MEASURED, audit navigation-04).
// Here: when the aliased target is the current URL the default is prevented and nothing happens; otherwise (e.g. a
// filter chosen after a plain "/" load, alias "") next/link pushes "/" as on the original.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { forwardRef, memo, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { resolveHomeHref } from '@/components/home/ui/homeAlias';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { usePageTransition } from './usePageTransition';

export interface TransitionLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children?: ReactNode;
  /** logo / nav items (original `isNavOrigin`) */
  isNavOrigin?: boolean;
  prefetch?: boolean;
}

export const TransitionLink = memo(
  forwardRef<HTMLAnchorElement, TransitionLinkProps>(function TransitionLink({ href, children, isNavOrigin = false, prefetch = true, onClick, ...rest }, ref) {
    const sound = useOptionalSound();
    const { handlePageTransition } = usePageTransition();
    const pathname = usePathname();
    return (
      <Link
        {...rest}
        ref={ref}
        prefetch={prefetch}
        href={href}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          onClick?.(e);
          if (href !== pathname) {
            e.preventDefault();
            handlePageTransition(href, isNavOrigin);
            void sound?.playClip('click');
          } else if (href === '/' && resolveHomeHref('/', '') === window.location.pathname + window.location.search) {
            // push("/") would land on the current aliased URL (a replace of the same entry): nothing to do
            e.preventDefault();
          }
        }}
      >
        {children}
      </Link>
    );
  }),
);

export default TransitionLink;
