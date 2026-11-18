// Root 404: full chrome, the mark background, "Esta página não existe ou saiu do ar." and a "Voltar ao início" pill.
// The metadata export covers the cases Next renders through the root not-found; NotFoundHead covers the bare error
// shell of a segment notFound() (see ./[uid]/NotFoundHead.tsx).
import type { Metadata } from 'next';
import { NotFoundHead } from './[uid]/NotFoundHead';
import { Shush } from '@/components/ui/Shush';
import { notFoundMetadata } from '@/lib/seo';

export const metadata: Metadata = notFoundMetadata;

export default function NotFound() {
  return (
    <>
      <NotFoundHead />
      <Shush errorTitle="Página não encontrada" />
    </>
  );
}
