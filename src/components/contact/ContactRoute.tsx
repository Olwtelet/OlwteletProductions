// Server entry shared by both /contact routes (original chunk 665: `<Modal><ContactForm contactData modal/></Modal>`,
// the intercepted payload and the hard-load page render the same tree, both with `modal: true`).
// Content: the Prismic "contact" document `lets-talk` (id ZlWzwRAAACMAmh2d) from the local snapshot; media URLs
// (hover videos) mapped to the local copies.
import 'server-only';
import { getPage } from '@/lib/content';
import { mapMediaDeep } from '@/lib/media';
import type { PrismicData } from '@/lib/types';
import { ContactForm } from './ContactForm';
import type { ContactDocumentData } from './ContactFormFields';
import { ContactModal } from './ContactModal';

export function getContactData(): ContactDocumentData {
  const page = getPage('/contact');
  const doc = ((page?.rscDocument as PrismicData | null)?.doc ?? (page?.cmsDocument as PrismicData | null)?.doc) as { data: ContactDocumentData } | undefined;
  if (!doc) throw new Error('contact document missing from src/content/pages.json');
  return mapMediaDeep(doc.data);
}

/** `intercepted`: rendered in the @contact slot over the page it was opened from (closing goes back to that page) */
export function ContactRoute({ intercepted = false }: { intercepted?: boolean }) {
  return (
    <ContactModal intercepted={intercepted}>
      <ContactForm contactData={{ data: getContactData() }} modal />
    </ContactModal>
  );
}

export default ContactRoute;
