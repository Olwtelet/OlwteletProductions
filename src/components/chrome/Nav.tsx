'use client';
// Bottom navigation pill — original root-layout module 96026. docs/recon/design-system.md §4.7.
//   AnimatePresence > (pathname !== /contact && showContactCta) && motion.nav (no class: the original asks for a
//   CSS-module key that does not exist; no motion props, so it appears/disappears instantly)
//   > ul.NavigationWrapper > [div indicator (inert), li(inert when active) > TransitionLink ×3]
// Indicator index from the TRANSITION TARGET as soon as a transition starts (moves on click), else the pathname:
//   0 for "/" and /projects*, 1 for /about*, 2 for /careers*, null → opacity 0. JS writes style.opacity / style.translate,
//   the CSS transitions animate them (translate .7s cubic-bezier(.93,-.24,.4,1.17), opacity 1s ease-in-out).
// Final API (kept): default export `Nav()`, `NAV_ITEMS`. Items are TransitionLinks WITHOUT isNavOrigin.
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TransitionLink } from '@/components/transition/TransitionLink';
import { useAppStore } from '@/lib/store';
import { navIndexFor, ROUTES, stripSearch } from '@/lib/theme';
import Link from 'next/link';
import { useSound } from '@/components/providers/SoundProvider';
import s from './nav.module.css';

// Olwtelet Productions: Projetos / Sobre / Contato. Contato opens the contact modal exactly like the header CTA
// (next/link to the intercepted /contact route + click sound), not a page transition.
export const NAV_ITEMS = [
  { url: ROUTES.home, text: 'Projetos', modal: false },
  { url: `${ROUTES.about}/studio`, text: 'Sobre', modal: false },
  { url: ROUTES.contact, text: 'Contato', modal: true },
] as const;

const HIDDEN_ON: string[] = [ROUTES.contact];

/** module 96026 `w` */
function NavigationList() {
  const indicator = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname() || '/';
  const transition = useAppStore((st) => st.transition);
  const [index, setIndex] = useState<0 | 1 | 2 | null>(null);
  const { playClip } = useSound();

  useEffect(() => {
    setIndex(navIndexFor(transition ? stripSearch(transition.to) : pathname));
  }, [pathname, transition]);

  useEffect(() => {
    const el = indicator.current;
    if (!el) return;
    if (index !== null) {
      el.style.opacity = '1';
      el.style.translate = `${100 * index}% 0`;
    } else el.style.opacity = '0';
  }, [index]);

  // The original renders `<div inert>` as the first child of the <ul>. React (dev) reports a <div> inside a <ul>
  // as an invalid-nesting console error, so the same element is created imperatively, before the first paint:
  // identical DOM, no dev-only console noise.
  const list = useRef<HTMLUListElement | null>(null);
  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const div = document.createElement('div');
    div.inert = true;
    ul.prepend(div);
    indicator.current = div;
    return () => {
      div.remove();
      indicator.current = null;
    };
  }, []);

  return (
    <ul className={s.NavigationWrapper} ref={list}>
      {NAV_ITEMS.map((item, i) => (
        <li key={item.text} inert={i === index}>
          {item.modal ? (
            <Link
              href={item.url}
              onClick={() => {
                void playClip('click');
              }}
            >
              {item.text}
            </Link>
          ) : (
            <TransitionLink href={item.url}>{item.text}</TransitionLink>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Nav() {
  const pathname = usePathname() || '/';
  const showContactCta = useAppStore((st) => st.showContactCta);
  const visible = !HIDDEN_ON.includes(pathname) && showContactCta;
  return <AnimatePresence>{visible && <motion.nav key="navigation-wrapper">{<NavigationList />}</motion.nav>}</AnimatePresence>;
}
