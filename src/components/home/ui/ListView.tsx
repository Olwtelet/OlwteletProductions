'use client';
// List view — original module 55607 `tT` (wrapper) / `tL` (list) / `tI` (group) / `tb` (row) / `th` (sr paragraphs).
// docs/recon/home-interaction.md §6. Always in the DOM (SEO), hidden with opacity 0 + pointer-events none + inert.
// Motion (FROM-CODE): wrapper CSS opacity .3 s; content variants q1 (hidden {y:0,opacity:0} with framer defaults,
// visible {y:-100,opacity:1} .5 s delay .3 ease ZW); rows animate {opacity:1,y:0} .5 s delay .2+.05·index (index per
// year group) ease ZW, exit {opacity:0,y:20} framer defaults. No `initial` prop anywhere (no SSR inline styles, the
// first client render animates from the DOM values), no AnimatePresence (filtered-out rows vanish at once).
import { motion, type Transition, type Variants } from 'framer-motion';
import { Fragment, useMemo } from 'react';
import { TransitionLink } from '@/components/transition/TransitionLink';
import { PageContainer, PageWrapper } from '@/components/ui/layout';
import { mainThreadTransforms, riseOut } from '@/components/ui/motion';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { EASE_ZW } from '@/lib/easings';
import { useAppStore } from '@/lib/store';
import { filterListProjects, groupListProjects, GROUP_TITLE, LIST_EMPTY, LIST_TITLE, listCountText, type ListProject } from './listData';
import type { ProjectStatus } from '@/content/brand';
import styles from './listView.module.css';

// `y` on the main thread (mainThreadTransforms, acceptance item A2): the original's framer build runs these transforms as
// JS animations (inline writes every frame); framer 14 would group them into compositor animations. Values unchanged.
const rowVariants = (index: number): Variants => ({
  animate: { opacity: 1, y: 0, transition: mainThreadTransforms(['y'], { duration: 0.5, delay: 0.2 + 0.05 * index, ease: EASE_ZW }) },
  initial: { opacity: 0, y: 20 },
  exit: { opacity: 0, y: 20, transition: mainThreadTransforms(['y']) },
});
/** `v.q1` (riseOut) with its `y` on the main thread, as rowVariants */
const contentVariants: Variants = {
  hidden: { ...riseOut.hidden, transition: mainThreadTransforms(['y']) },
  visible: { ...riseOut.visible, transition: mainThreadTransforms(['y'], (riseOut.visible as { transition: Transition }).transition) },
};


/** `tb` — a plain component (not memoized) whose variants object is rebuilt on every render, as the original. */
function ProjectListItem({ project, index, isVisible }: { project: ListProject; index: number; isVisible: boolean }) {
  const variants = rowVariants(index);
  return (
    <motion.li className={styles.ProjectListItemWrapper} animate={isVisible ? 'animate' : 'exit'} variants={variants}>
      <TransitionLink className={styles.ProjectLink} href={`/projects/${project.uid}`}>
        <div className={styles.ProjectInfo}>
          <h3 className={styles.ProjectTitle}>{project.title}</h3>
          <p className="screen-reader-only">{project.summary}</p>
        </div>
        <div className={styles.MetaInfo}>
          <ul className={styles.FeaturesList}>
            <li>
              <span className={cx(styles.Pill, typography.MonoDetail)}>{project.kindName}</span>
            </li>
            {project.categoryNames.slice(0, 3).map((name, i) => (
              <li key={i}>
                <span className={cx(styles.Pill, typography.MonoDetail)}>{name}</span>
              </li>
            ))}
          </ul>
          {/* full text kept in the DOM and in the title: the line may be shortened with an ellipsis */}
          <div className={styles.Client} title={project.detail}>
            {project.detail}
          </div>
        </div>
      </TransitionLink>
    </motion.li>
  );
}

/** `tI` — one group per status (the original grouped by year) */
function ProjectGroup({ status, projects, isVisible }: { status: ProjectStatus; projects: ListProject[]; isVisible: boolean }) {
  return (
    <motion.div className={styles.ProjectGroup} data-status={status}>
      <p>{GROUP_TITLE[status]}</p>
      <motion.ul className={styles.ProjectListItemsWrapper}>
        {projects.map((p, i) => (
          <ProjectListItem key={p.uid} project={p} isVisible={isVisible} index={i} />
        ))}
      </motion.ul>
    </motion.div>
  );
}

/** `tL` */
function ProjectList({ projects, isVisible }: { projects: ListProject[]; isVisible: boolean }) {
  // original `tL`: `let { workGridFilters: i } = (0, p.P)()` — whole-store subscription (re-renders on every store write)
  const { workGridFilters: filters } = useAppStore();
  const [groups, countText, isEmpty] = useMemo(() => {
    const filtered = filterListProjects(projects, filters);
    return [groupListProjects(filtered), listCountText(filtered), filtered.length === 0] as const;
  }, [projects, filters]);
  return (
    <motion.div className={styles.ProjectListWrapper} animate={isVisible ? 'visible' : 'hidden'} variants={contentVariants}>
      <div className={styles.ProjectListContainer}>
        <div className={styles.Header}>
          <h2>{LIST_TITLE}</h2>
          <h3>
            {countText.split(' · ').map((part, i) => (
              <Fragment key={i}>
                {i > 0 && ' · '}
                <span className={styles.CountPart}>{part}</span>
              </Fragment>
            ))}
          </h3>
        </div>
        {/* original `tl` = styled("div", {css: ProjectsContainer}) whose class is missing from the CSS module → class="" */}
        <div className="">
          {groups.map(([status, ps]) => (
            <ProjectGroup key={status} status={status} projects={ps} isVisible={isVisible} />
          ))}
          {isEmpty && (
            <div className={styles.ProjectGroup} role="status">
              <p>{LIST_EMPTY.text}</p>
              <div className={styles.EmptyCta}>
                <TransitionLink className={cx(styles.Pill, typography.MonoDetail)} href="/">
                  {LIST_EMPTY.cta}
                </TransitionLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** `tT` */
export function ListView({ projects, isOpen }: { projects: ListProject[]; isOpen: boolean }) {
  return (
    <div className={cx(styles.ListViewWrapper, isOpen && styles.IsOpen)} inert={!isOpen}>
      <PageContainer>
        {/* ListPageWrapper: no 100svh min-height here (listView.module.css, "list shell") */}
        <PageWrapper className={styles.ListPageWrapper}>
          <ProjectList projects={projects} isVisible={isOpen} />
        </PageWrapper>
      </PageContainer>
    </div>
  );
}

export default ListView;
