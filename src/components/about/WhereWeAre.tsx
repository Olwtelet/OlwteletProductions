// `about_where_we_are` slice — a SERVER component in the original (markup recorded in about__agency.rsc.txt line 23):
// section > div.layout_Wrapper.styles_Container > div.styles_Location × 2 >
//   [div.styles_Copy.MonoDetail > (div.styles_Logo > PrismicNextImage, div.styles_Address > RichText,
//    div.styles_Contact > RichText), div.styles_ImageContainer > PrismicNextImage]. No animation. recon §5.10
import { RichText } from '@/lib/prismic/RichText';
import type { RichTextField } from '@/lib/types';
import { layout } from '@/components/ui/layout';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { PrismicNextImage, type PrismicImageField } from './images';
import type { AboutSlice } from './types';
import s from './whereWeAre.module.css';

interface Office {
  name?: string;
  logo?: PrismicImageField;
  address?: RichTextField;
  contact?: RichTextField;
  image?: PrismicImageField;
}

export default function WhereWeAre({ slice }: { slice: AboutSlice }) {
  const offices = (slice.primary.office as Office[]) || [];
  return (
    <section data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      <div className={cx(layout.Wrapper, s.Container)}>
        {offices.map((o, i) => (
          <div key={`office-${i}`} className={s.Location}>
            <div className={cx(s.Copy, typography.MonoDetail)}>
              <div className={s.Logo}>
                <PrismicNextImage field={o.logo} fallbackAlt="" />
              </div>
              <div className={s.Address}>
                <RichText field={o.address} />
              </div>
              <div className={s.Contact}>
                <RichText field={o.contact} />
              </div>
            </div>
            <div className={s.ImageContainer}>
              <PrismicNextImage field={o.image} fallbackAlt="" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
