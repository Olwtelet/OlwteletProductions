// CTA button/link (original module 24683 "Button"). With `link` it renders a plain <a> (full navigation,
// `target="_blank"` unless useTargetBlank=false → target=""), otherwise a <button>.
//   <CTA link="/" useTargetBlank={false} type="Header">Return home</CTA>
//   <CTA action={onClick} disabled={busy}>Submit</CTA>
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '@/lib/cx';
import styles from './cta.module.css';

export const ctaStyles = styles as {
  CTAButtonElement: string;
  CTALinkElement: string;
  Header: string;
  CaseStudy_Share: string;
  About_View: string;
};

export type CTAType = 'Header' | 'CaseStudy_Share' | 'About_View';

export interface CTAProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "type" | "onClick" | "color"> {
  children?: ReactNode;
  action?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  link?: string;
  type?: CTAType;
  colour?: string;
  disabled?: boolean;
  useTargetBlank?: boolean;
  tabIndex?: number;
  className?: string;
}

export const CTA = forwardRef<HTMLAnchorElement | HTMLButtonElement, CTAProps>(function CTA(
  { children, action, link, type, colour, disabled, useTargetBlank = true, tabIndex = 0, className, ...rest },
  ref,
) {
  const style = { color: colour };
  if (link) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        style={style}
        href={link}
        target={useTargetBlank ? '_blank' : ''}
        tabIndex={tabIndex}
        className={cx(className, styles.CTALinkElement, type && styles[type])}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      style={style}
      onClick={action}
      disabled={disabled}
      tabIndex={tabIndex}
      className={cx(className, styles.CTAButtonElement)}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
});

export default CTA;
