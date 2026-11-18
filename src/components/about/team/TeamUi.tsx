'use client';
// Team UI overlay — original chunk 105 module 60105 `ea` (div.grid-layout.page-width.layout_Grid.layout_Wrapper.
// TeamUiContainer) with `k` (CurrentEmployee: name + title h4.MonoDetail) and `V` (DepartmentList, motion.div) of
// `O` (Department: p.SmallSubTitle name + p.MonoDetail.Count team size). recon §7.4
// - Department click: unless `isFaceTransitioning` (never true — the face writes another key), set the department and
//   its first member.
// - Below/at 1024 px (`!isMinLarge`, JS width > 1024): the list scrolls smoothly so the current department is centred
//   (`offsetLeft + offsetWidth - innerWidth / 2`).
import { motion } from 'framer-motion';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { layout } from '@/components/ui/layout';
import { typography } from '@/components/ui/typography';
import { appStore, useAppStore } from '@/lib/store';
import { useMediaQueries } from '@/lib/useMediaQueries';
import { cx } from '@/lib/cx';
import type { EmployeeDoc } from '../types';
import s from './team.module.css';

type TeamGroups = Record<string, { name: string; team: EmployeeDoc[] }>;

function CurrentEmployee() {
  const currentEmployee = useAppStore((st) => st.currentEmployee) as EmployeeDoc | null;
  return (
    <div className={s.CurrentEmployeeContainer}>
      {currentEmployee && (
        <>
          <h4 className={cx(typography.MonoDetail, s.CurrentEmployeeName)}>{currentEmployee.data.employee_name}</h4>
          <h4 className={cx(typography.MonoDetail, s.CurrentEmployeeTitle)}>{currentEmployee.data.job_title}</h4>
        </>
      )}
    </div>
  );
}

function Department({
  id,
  currentEmployeeRef,
  handleDepartmentChange,
  departmentElements,
  isFirstDepartment,
  isLastDepartment,
  firstDepartmentRef,
  lastDepartmentRef,
  name,
  team,
}: {
  id: string;
  currentEmployeeRef: MutableRefObject<HTMLDivElement | null>;
  handleDepartmentChange: (id: string) => void;
  departmentElements: MutableRefObject<Record<string, HTMLDivElement>>;
  isFirstDepartment: boolean;
  isLastDepartment: boolean;
  firstDepartmentRef: MutableRefObject<HTMLDivElement | null>;
  lastDepartmentRef: MutableRefObject<HTMLDivElement | null>;
  name: string;
  team: EmployeeDoc[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const currentDepartmentId = useAppStore((st) => st.currentDepartmentId);
  const isCurrent = id === currentDepartmentId;
  useEffect(() => {
    if (ref.current && isCurrent) currentEmployeeRef.current = ref.current;
  }, [currentEmployeeRef, isCurrent]);
  useEffect(() => {
    if (ref.current) departmentElements.current = { ...departmentElements.current, [id]: ref.current };
  }, [id, departmentElements]);
  useEffect(() => {
    if (ref.current && isFirstDepartment) firstDepartmentRef.current = ref.current;
  }, [isFirstDepartment, firstDepartmentRef]);
  useEffect(() => {
    if (ref.current && isLastDepartment) lastDepartmentRef.current = ref.current;
  }, [isLastDepartment, lastDepartmentRef]);
  useEffect(
    () => () => {
      ref.current = null;
    },
    [],
  );
  return (
    <div id={id} className={cx(s.Wrapper, isCurrent && s.Wrapper_Current)} onClick={() => handleDepartmentChange(id)} ref={ref}>
      <p className={typography.SmallSubTitle}>{name}</p>
      <div>
        <p className={cx(typography.MonoDetail, s.Count)}>{team.length}</p>
      </div>
    </div>
  );
}

function DepartmentList() {
  const currentDepartmentId = useAppStore((st) => st.currentDepartmentId);
  const teamGroups = useAppStore((st) => st.teamGroups) as TeamGroups | null;
  const isFaceTransitioning = useAppStore((st) => st.isFaceTransitioning);
  const { isMinLarge } = useMediaQueries();
  const listRef = useRef<HTMLDivElement | null>(null);
  const elements = useRef<Record<string, HTMLDivElement>>({});
  const firstRef = useRef<HTMLDivElement | null>(null);
  const lastRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const change = (id: string) => {
    if (isFaceTransitioning || !teamGroups) return;
    appStore.set({ currentDepartmentId: id, currentEmployee: teamGroups[id].team[0] });
  };
  useEffect(() => {
    if (!listRef.current || !currentDepartmentId || !elements.current || isMinLarge || !teamGroups || Object.keys(teamGroups).indexOf(currentDepartmentId) === -1)
      return;
    const { offsetLeft, offsetWidth } = elements.current[currentDepartmentId];
    const { innerWidth } = window;
    listRef.current.scrollTo({ left: offsetLeft + offsetWidth - innerWidth / 2, behavior: 'smooth' });
  }, [currentDepartmentId, teamGroups, isMinLarge]);
  useEffect(
    () => () => {
      listRef.current = null;
      elements.current = {};
      firstRef.current = null;
      lastRef.current = null;
      currentRef.current = null;
    },
    [],
  );
  return (
    <motion.div className={s.TeamUiEmployeesContainer} ref={listRef}>
      {teamGroups &&
        Object.entries(teamGroups).map(([id, { name, team }], o, all) => (
          <div key={`${name}-${o}`} className={s.TeamUiDepartmentContainer}>
            <div>
              <Department
                key={`${id}`}
                name={name}
                team={team}
                id={id}
                currentEmployeeRef={currentRef}
                handleDepartmentChange={change}
                departmentElements={elements}
                firstDepartmentRef={firstRef}
                lastDepartmentRef={lastRef}
                isFirstDepartment={o === 0}
                isLastDepartment={o === all.length - 1}
              />
            </div>
          </div>
        ))}
    </motion.div>
  );
}

export default function TeamUi() {
  return (
    <div className={cx(layout.Grid, layout.Wrapper, s.TeamUiContainer, 'grid-layout page-width')}>
      <CurrentEmployee />
      <DepartmentList />
    </div>
  );
}
