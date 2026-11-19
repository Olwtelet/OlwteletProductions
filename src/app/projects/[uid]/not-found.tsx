// notFound() of this route (unknown uid): the same 404 view as the root not-found. Next 16 answers it with a bare
// error shell whose head has the root defaults (tab title "Olwtelet Productions", as every page); NotFoundHead adds
// the 404 description once rendered.
import { NotFoundHead } from '@/app/[uid]/NotFoundHead';
import { Shush } from '@/components/ui/Shush';

export default function NotFound() {
  return (
    <>
      <NotFoundHead />
      <Shush errorTitle="Página não encontrada" />
    </>
  );
}
