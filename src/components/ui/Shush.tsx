// Error view (original module 69910 "Shush"), used by the 404 and by app/error (500). Olwtelet: background =
// /brand/404.jpg (the mark, generated), copy in pt-BR.
//   <Shush errorTitle="Página não encontrada" />                       → 404: no h1, the mono line only
//   <Shush errorCode="500" errorTitle="Erro interno do servidor" />    → h1 "500: Erro interno do servidor" + "Erro 500."
import { cx } from '@/lib/cx';
import { CTA } from './CTA';
import { layout } from './layout';
import { typography } from './typography';
import styles from './shush.module.css';

export interface ShushProps {
  errorCode?: string;
  errorTitle?: string;
}

export function Shush({ errorCode, errorTitle }: ShushProps) {
  return (
    <main className={styles.ShushContainer}>
      <div className={cx(layout.Wrapper, styles.ShushWrapper)}>
        <div className={styles.ShushCopy}>
          {errorCode ? (
            <h1 className={cx(styles.ShushTitle, typography.MidTitle)}>
              {errorCode}: {errorTitle}
            </h1>
          ) : (
            <h1 className="screen-reader-only">{errorTitle}</h1>
          )}
          <span className={cx(styles.ShushTitle, typography.MonoDetail)}>
            {errorCode && <span>Erro {errorCode}. </span>}
            {errorCode ? 'Algo deu errado no servidor. Tente de novo em instantes.' : 'Esta página não existe ou saiu do ar.'}
          </span>
        </div>
        <div className={styles.HomeCTA}>
          <CTA link="/" useTargetBlank={false} type="Header">
            Voltar ao início
          </CTA>
        </div>
      </div>
    </main>
  );
}

export default Shush;
