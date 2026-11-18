'use client';
// `team_section` slice — original chunk 105 module 60105 `eo` + memoised `en`. docs/recon/about.md §7.4
// section#team-section-sticky-container.TeamSectionElement (not sticky despite the id) >
//   div#team-section-inner-container.TeamSectionContent > [FaceParticles, TeamUi]
// - departments sorted by the slice's department order; teamGroups = {deptId: {name, team: employees having both a
//   depth map and a texture}} (built once: the global store keeps teamGroups / currentDepartmentId across About
//   visits, so returning to Agency resumes on the last department — original behaviour).
// - currentDepartmentId/teamGroups change ⇒ currentTeams = that team, currentEmployee = its first member.
import { memo, useCallback, useEffect } from 'react';
import { appStore, useAppStore } from '@/lib/store';
import FaceParticles from './FaceParticles';
import TeamUi from './TeamUi';
import type { AboutSlice, DepartmentDoc, EmployeeDoc } from '../types';
import s from './team.module.css';

type TeamGroups = Record<string, { name: string; team: EmployeeDoc[] }>;

const TeamContent = memo(function TeamContent({ departments, employees }: { departments: DepartmentDoc[]; employees: EmployeeDoc[] }) {
  const teamGroups = useAppStore((st) => st.teamGroups) as TeamGroups | null;
  const currentDepartmentId = useAppStore((st) => st.currentDepartmentId);
  const build = useCallback((deps: DepartmentDoc[], emps: EmployeeDoc[]) => {
    const groups: TeamGroups = deps.reduce((acc, d) => ({ ...acc, [d.id]: { name: d.data.department_name, team: [] as EmployeeDoc[] } }), {} as TeamGroups);
    for (const emp of emps.filter((e) => e.data.depth_map_image_link.url && e.data.texture_image_link.url)) {
      const id = emp.data.department.id;
      if (id === Object.keys(groups)[0] && groups[id].team.length === 0) appStore.set({ currentEmployee: emp });
      if (groups[id]) groups[id].team.push(emp);
      else console.log('Department not found', emp.data.department);
    }
    return groups;
  }, []);

  useEffect(() => {
    if (appStore.get().teamGroups) return;
    const groups = build(departments, employees);
    appStore.set({ teamGroups: groups });
    appStore.set({ currentDepartmentId: Object.keys(groups)[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (teamGroups && currentDepartmentId) {
      appStore.set({ currentTeams: teamGroups[currentDepartmentId].team });
      appStore.set({ currentEmployee: teamGroups[currentDepartmentId].team[0] });
    }
  }, [currentDepartmentId, teamGroups]);

  return (
    <div id="team-section-inner-container" className={s.TeamSectionContent}>
      <FaceParticles />
      <TeamUi />
    </div>
  );
});

export default function TeamSection({ slice, departments, employees }: { slice: AboutSlice; departments: DepartmentDoc[]; employees: EmployeeDoc[] }) {
  const order = (slice.primary.departments as { department: { id: string } }[]) || [];
  const sorted = departments
    ? [...departments].sort((a, b) => order.findIndex((d) => d.department.id === a.id) - order.findIndex((d) => d.department.id === b.id))
    : undefined;
  return (
    <section key="team-section-sticky-container" data-slice-type={slice.slice_type} id="team-section-sticky-container" className={s.TeamSectionElement}>
      <TeamContent departments={sorted || []} employees={employees || []} />
    </section>
  );
}
