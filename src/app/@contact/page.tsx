// Olwtelet: the @contact slot is empty on this route. Next keeps a parallel slot's last active page on a soft
// navigation to a route the slot does not match (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// parallel-routes.md, "Modals" > closing): without a page here, following a link from the open contact modal (e.g.
// "Política de privacidade") left the modal open over the new page. One null page per existing route (/, /[uid],
// /about/[uid], /projects/[uid]) instead of a [...catchAll], which would add a route of its own and take over the
// deep 404s. default.tsx still covers hard loads.
export default function ContactSlotEmpty() {
  return null;
}
