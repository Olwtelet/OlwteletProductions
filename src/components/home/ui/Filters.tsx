'use client';
// Work-grid filters (button + overlay panel) — original module 10555 (default export `N`, item `g`, list `P`,
// button `R`, processing `W`, content `Y`). Rendered by the server page inside <LayoutWrapper order={0}> + <Suspense
// fallback={null}> (as the original RSC tree). docs/recon/home-interaction.md §7.
//  - URL → store: every change of the search params runs setWorkGridFilters(filtersFromSearchParams(sp)) (first value
//    of each key only). Because this lives in the LayoutWrapper, it first runs 500 ms after workgridState==='work'.
//  - Item click: router.push(pathname + "?" + toggle(type, id)) (append, or delete when it is the FIRST value), "All"
//    → router.push("/"). Soft navigation, new history entry, no page transition. Overlay stays open.
//  - Button click: click.mp3 + toggle the local overlay state. innerWidth <= 599: showContactCta = !open.
//  - Escape / outside click do nothing (MEASURED).
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useOptionalSound } from '@/components/providers/SoundProvider';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { EASE_XQ } from '@/lib/easings';
import { filtersFromSearchParams, setShowContactCta, setWorkGridFilters, useAppStore } from '@/lib/store';
import { useMediaQueries } from '@/lib/useMediaQueries';
import styles from './filters.module.css';
import { noteHomeSearch, resolveHomeHref } from './homeAlias';

/** module 37330 */
export const FILTERS_OVERLAY_ID = 'work-grid-filters-overlay';
export type FilterType = 'zone' | 'feature' | 'service' | 'client';

export interface FilterOption {
  /** Prismic document id (React key) */
  id: string;
  uid: string;
  /** zone_name / feature_name / service_name / client_name */
  name: string;
}
export interface FiltersData {
  /** raw CMS order (not processed by W) */
  zones: FilterOption[];
  /** W(features) */
  features: FilterOption[];
  /** W(services) */
  services: FilterOption[];
  /** W(clients, true) */
  clients: FilterOption[];
}

/** module 10555 `Y` */
const PANEL_ANIMATION = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: 0.9, type: 'tween' as const, ease: EASE_XQ },
};
// Olwtelet: `zone` = project type, `feature` = category; no regions or partners (those panels render only with items)
const CONTENT = { zone: 'TIPO', feature: 'CATEGORIA', service: 'REGIÃO', client: 'PARCEIRO' } as const;

/** module 10555 `g` */
function FilterItem({ type, id, clearFilter, children }: { type: FilterType; id?: string; clearFilter?: boolean; children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const current = (!!id && searchParams.getAll(type).includes(id)) || (!searchParams.getAll(type).length && !!clearFilter);
  const toggle = useCallback(
    (t: string, v: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (p.get(t) === v) p.delete(t, v);
      else p.append(t, v);
      return p.toString();
    },
    [searchParams],
  );
  const onClick = useCallback(() => {
    // original: clearFilter ? router.push("/") : router.push(pathname + "?" + toggle(type, id)); an empty query lands
    // on the session's home alias on the original (router quirk, see ./homeAlias.ts)
    if (clearFilter) router.push(resolveHomeHref('/', ''));
    else router.push(resolveHomeHref(pathname, '?' + toggle(type, id || '')));
  }, [clearFilter, toggle, id, pathname, router, type]);
  const zone = type === 'zone';
  return (
    <button
      onClick={onClick}
      className={cx(
        styles.FilterItemElement,
        current && styles.FilterItemElement_Current,
        zone ? styles.FilterItemElement_Zone : undefined,
        zone ? typography.SmallSubTitle : typography.MonoDetail,
      )}
    >
      {children}
    </button>
  );
}

/** module 10555 `P` */
function FilterItemList({ type, items }: { type: FilterType; items: FilterOption[] }) {
  const zone = type === 'zone';
  return (
    <div className={cx(styles.FilterItemListContainer, zone && styles.FilterItemListContainer_Zone)}>
      {zone && (
        <FilterItem clearFilter type={type}>
          Todos
        </FilterItem>
      )}
      {items.map((t) => (
        <FilterItem key={t.id} id={t.uid} type={type}>
          {t.name || ''}
        </FilterItem>
      ))}
    </div>
  );
}

/** module 10555 `R` */
function FilterButton({ showFilterOverlay, setShowFilterOverlay }: { showFilterOverlay: boolean; setShowFilterOverlay: (v: boolean) => void }) {
  const sound = useOptionalSound();
  const mq = useMediaQueries();
  // original `R`: `{ setShowContactCta: o } = (0, c.P)()` — whole-store subscription (re-renders on every store write)
  useAppStore();
  useEffect(() => {
    if (!mq.isMinMedium) setShowContactCta(!showFilterOverlay);
  }, [showFilterOverlay, mq.isMinMedium]);
  return (
    <button
      className={cx(styles.Button, typography.LargeButtonUi, showFilterOverlay && styles.showFilterOverLay)}
      onClick={() => {
        void sound?.playClip('click');
        setShowFilterOverlay(!showFilterOverlay);
      }}
    >
      <p>{showFilterOverlay ? 'Fechar' : 'Filtrar'}</p>
    </button>
  );
}

/** module 10555 `N` (default export) */
export function Filters({ filtersData }: { filtersData: FiltersData }) {
  const searchParams = useSearchParams();
  // original `N`: `{ setWorkGridFilters: i } = (0, c.P)()` — whole-store subscription (re-renders on every store write)
  useAppStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setWorkGridFilters(filtersFromSearchParams(new URLSearchParams(searchParams.toString())));
    const q = searchParams.toString();
    noteHomeSearch(q ? '?' + q : '');
  }, [searchParams]);

  // The overlay state stays local, as the original's `[a, u] = useState(!1)` (module 10555): no store mirror, since
  // the store notifies every subscriber on every write (as zustand) and nothing reads such a mirror.

  return (
    <>
      <FilterButton showFilterOverlay={open} setShowFilterOverlay={setOpen} />
      <AnimatePresence>
        {open ? (
          <motion.section key={FILTERS_OVERLAY_ID} id={FILTERS_OVERLAY_ID} className={styles.Section} {...PANEL_ANIMATION}>
            <div className={styles.Container}>
              <div className={styles.FiltersSection}>
                <p className={cx(styles.Title, typography.MonoDetail)}>{CONTENT.zone}</p>
                <div className={styles.HeadersWrapper}>
                  <FilterItemList type="zone" items={filtersData.zones} />
                </div>
              </div>
              <div className={styles.PrimaryContainer}>
                <div className={styles.FiltersSection}>
                  <p className={cx(styles.Title, typography.MonoDetail)}>{CONTENT.feature}</p>
                  <FilterItemList type="feature" items={filtersData.features} />
                </div>
                {(filtersData.services.length > 0 || filtersData.clients.length > 0) && (
                  <div className={styles.SecondaryContainer}>
                    {filtersData.services.length > 0 && (
                      <div className={styles.FiltersSection}>
                        <p className={cx(styles.Title, typography.MonoDetail)}>{CONTENT.service}</p>
                        <FilterItemList type="service" items={filtersData.services} />
                      </div>
                    )}
                    {filtersData.clients.length > 0 && (
                      <div className={styles.FiltersSection}>
                        <p className={cx(styles.Title, typography.MonoDetail)}>{CONTENT.client}</p>
                        <FilterItemList type="client" items={filtersData.clients} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default Filters;
