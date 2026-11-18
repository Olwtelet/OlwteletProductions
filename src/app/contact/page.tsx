// /contact on hard load / reload (original app/contact/page, chunk 665): the same <Modal><ContactForm modal/>
// tree as the intercepted slot, rendered as the page itself (nothing else behind the blur but the root-layout
// chrome on the black body). Lenis is destroyed on /contact (SmoothScroll), the nav pill hides (chrome).
import type { Metadata } from 'next';
import { ContactRoute } from '@/components/contact/ContactRoute';
import { routeMetadata } from '@/lib/seo';

export const metadata: Metadata = routeMetadata('/contact');

export default function ContactPage() {
  return <ContactRoute />;
}
