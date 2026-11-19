'use client';
// 404 description rendered on the client. A notFound() thrown by a dynamic segment ([uid], projects/[uid],
// about/[uid]) is answered by Next 16 with a bare error shell whose head only has the root defaults; the 404 view then
// renders on the client, and this sets the 404 description. The tab title needs nothing here: it is TAB_TITLE in that
// server head already, as on every page (src/lib/seo.ts).
import { useEffect, useState } from 'react';

export const NOT_FOUND_DESCRIPTION = 'Página não encontrada.';

export function NotFoundHead() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;
  return <meta name="description" content={NOT_FOUND_DESCRIPTION} />;
}

export default NotFoundHead;
