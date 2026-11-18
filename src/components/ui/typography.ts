// Typography tokens (JS module 75923 keys). Usage:
//   import { typography } from '@/components/ui/typography';
//   <p className={typography.MonoDetail}>…</p>
// In another CSS module: `composes: MonoDetail from '@/components/ui/typography.module.css';`
import typographyStyles from './typography.module.css';
import labelStyles from './label.module.css';

export const typography = typographyStyles as {
  LargeTitle: string;
  MidTitle: string;
  LargeSubTitle: string;
  MidSubTitle: string;
  SmallSubTitle: string;
  LargeBody: string;
  DefaultBody: string;
  LargeButtonUi: string;
  MonoDetail: string;
};
export type TypographyToken = keyof typeof typography;

/** `styles_Label__MI0Aa` (dot + text label, grid-column 1/span 5|2|3|4) and `styles_Label__7QeQ9` (end-aligned). */
export const label = labelStyles as { Label: string; LabelEnd: string };
