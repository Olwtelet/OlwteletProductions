// Generic CMS page (original app/[uid]/page, server-rendered): the inner-page shell with one
//   <section.styles_Section__KsgW4 data-slice-type data-slice-variation> + reveal block (module 37492)
// per copy_section slice, then the footer inside PageWrapper (MEASURED DOM of /privacy-policy, /ai-policy,
// /modern-slavery-statement and /home on the live site; /home has no slices → only the footer).
import Footer from '@/components/footer/Footer';
import { PageContainer, PageWrapper } from '@/components/ui/layout';
import type { PageRecord } from '@/lib/types';
import { RevealBlock } from './RevealBlock';
import { DefaultSlice, TitleSlice, TwoColumnsManualSlice, type DefaultSliceContent, type TitleSliceContent, type TwoColumnsContent } from './Slices';
import styles from './legal.module.css';

interface SectionComponent {
  module: string;
  props: { content?: unknown };
}
interface PageSection {
  slice_type: string;
  variation: string;
  components?: SectionComponent[];
}

function SliceBody({ section }: { section: PageSection }) {
  const content = section.components?.[0]?.props?.content;
  if (!content) return null;
  switch (section.variation) {
    case 'title':
      return <TitleSlice content={content as TitleSliceContent} />;
    case 'twoColumnsManual':
      return <TwoColumnsManualSlice content={content as TwoColumnsContent} />;
    case 'default':
      return <DefaultSlice content={content as DefaultSliceContent} />;
    default:
      return null;
  }
}

export function LegalPage({ page }: { page: PageRecord }) {
  const sections = ((page as unknown as { sections?: PageSection[] }).sections ?? []).filter((s) => s.slice_type === 'copy_section');
  return (
    <PageContainer>
      <PageWrapper>
        {sections.map((section, i) => (
          <section key={i} className={styles.Section} data-slice-type={section.slice_type} data-slice-variation={section.variation}>
            <RevealBlock>
              <SliceBody section={section} />
            </RevealBlock>
          </section>
        ))}
        <Footer />
      </PageWrapper>
    </PageContainer>
  );
}

export default LegalPage;
