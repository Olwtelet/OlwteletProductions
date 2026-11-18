// About layout — original chunk app/about/layout (module 36736 `f`):
// <PageContainer><PageWrapper><AboutLayoutToggle/>{children}</PageWrapper></PageContainer>.
// It is shared by /about/studio and /about/process, so the toggle (and its highlight state) stays mounted across
// the switch while the [uid] page segment is replaced. docs/recon/about.md §1, §3
import type { ReactNode } from 'react';
import AboutLayoutToggle from '@/components/about/AboutLayoutToggle';
import { PageContainer, PageWrapper } from '@/components/ui/layout';

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer>
      <PageWrapper>
        <AboutLayoutToggle />
        {children}
      </PageWrapper>
    </PageContainer>
  );
}
