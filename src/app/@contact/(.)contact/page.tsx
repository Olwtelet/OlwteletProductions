// Intercepted /contact (soft navigation from any route, e.g. the header "Let's talk" next/link): the contact
// modal rendered in the root layout's @contact parallel slot while the current page stays mounted in `children`
// (original app/@contact/(.)contact/page — MEASURED segment prefetch `/@contact/(__SLOT__)/(.)contact/__PAGE__`).
//
// Static, like the original's (prefetch responses `x-nextjs-prerender: 1`, `x-nextjs-postponed: 2`, segments
// `/_tree`, `/_head`, `/_index`, `/@contact/(__SLOT__)`, `…/(.)contact`, `…/__PAGE__`, `/__DEFAULT__`): no request
// data is read here, so the load-time prefetch of every page is served from the prerender (no aborted dynamic
// /contact?_rsc requests) and its head is the same for every opener.
// Head: no metadata of its own (the original's `/_head` segment carries charset, viewport and favicon only); the
// document keeps the head of the page underneath, as on the original — see UnderlyingHead.
import { ContactRoute } from '@/components/contact/ContactRoute';
import { UnderlyingHead } from '@/components/contact/UnderlyingHead';

export default function ContactModalSlot() {
  return (
    <>
      <UnderlyingHead />
      {/* Olwtelet: only a client navigation (or a Back/Forward to such an entry) renders this intercepted page, so the
          entry before it is the page underneath: closing goes back to it (ContactModal) */}
      <ContactRoute intercepted />
    </>
  );
}
