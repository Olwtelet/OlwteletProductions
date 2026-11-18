// Layout primitives (JS modules 43774 + 131 + 83439 of the original).
//   <Box wrapper grid spaced>   -> div with layout_Wrapper / layout_Grid / layout_Spaced
//   <Section wrapper grid>      -> same on <section>
//   <Grid>, <Wrapper>           -> shorthands
//   <PageContainer><PageWrapper>…</PageWrapper></PageContainer>  -> the inner-page shell (bg = --color-secondary)
import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import styles from './layout.module.css';

export const layout = styles as {
  Wrapper: string;
  Grid: string;
  Spaced: string;
  PageContainer: string;
  PageWrapper: string;
  AnimatePresenceListContainer: string;
  'split-line': string;
  'split-word': string;
  'split-char': string;
};

export interface LayoutVariantProps extends HTMLAttributes<HTMLElement> {
  wrapper?: boolean;
  grid?: boolean;
  spaced?: boolean;
}

export const Box = forwardRef<HTMLDivElement, LayoutVariantProps>(function Box({ wrapper, grid, spaced, className, ...rest }, ref) {
  return <div ref={ref} className={cx(className, wrapper && styles.Wrapper, grid && styles.Grid, spaced && styles.Spaced) || undefined} {...rest} />;
});

export const Section = forwardRef<HTMLElement, LayoutVariantProps>(function Section({ wrapper, grid, spaced, className, ...rest }, ref) {
  return <section ref={ref} className={cx(className, wrapper && styles.Wrapper, grid && styles.Grid, spaced && styles.Spaced) || undefined} {...rest} />;
});

export const Grid = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Grid({ className, ...rest }, ref) {
  return <div ref={ref} className={cx(className, styles.Grid)} {...rest} />;
});

export const Wrapper = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Wrapper({ className, ...rest }, ref) {
  return <div ref={ref} className={cx(className, styles.Wrapper)} {...rest} />;
});

export const PageContainer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function PageContainer({ className, ...rest }, ref) {
  return <div ref={ref} className={cx(className, styles.PageContainer)} {...rest} />;
});

export const PageWrapper = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function PageWrapper({ className, ...rest }, ref) {
  return <div ref={ref} className={cx(className, styles.PageWrapper)} {...rest} />;
});
