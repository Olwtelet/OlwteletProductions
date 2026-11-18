'use client';
// Original module 91944: records the visited case study in sessionStorage.VIEWED_CASE_STUDIES ({[uid]: true});
// the contact form schema carries it as `viewed_case_studies`. Renders nothing.
import { useEffect } from 'react';

export const VIEWED_CASE_STUDIES = 'VIEWED_CASE_STUDIES';

export function ViewedCaseStudy({ value }: { value: string }) {
  useEffect(() => {
    try {
      const seen = JSON.parse(sessionStorage.getItem(VIEWED_CASE_STUDIES) ?? '{}');
      seen[value] = true;
      sessionStorage.setItem(VIEWED_CASE_STUDIES, JSON.stringify(seen));
    } catch {
      /* storage unavailable */
    }
  }, [value]);
  return null;
}

export default ViewedCaseStudy;
