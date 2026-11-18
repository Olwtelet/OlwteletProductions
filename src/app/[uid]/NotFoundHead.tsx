'use client';
// 404 title + description rendered on the client. A notFound() thrown by a dynamic segment ([uid], projects/[uid],
// about/[uid]) is answered by Next 16 with a bare error shell whose head only has the root defaults (title
// "Olwtelet Productions"); the 404 view then renders on the client, and this sets the right title there.
import { useEffect, useState } from 'react';

export const NOT_FOUND_TITLE = 'Página não encontrada · Olwtelet Productions';
export const NOT_FOUND_DESCRIPTION = 'Página não encontrada.';

export function NotFoundHead() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;
  return (
    <>
      <title>{NOT_FOUND_TITLE}</title>
      <meta name="description" content={NOT_FOUND_DESCRIPTION} />
    </>
  );
}

export default NotFoundHead;
