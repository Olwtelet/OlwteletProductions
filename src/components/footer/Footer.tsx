// Footer — same structure and styles as the replica's footer (module 76602, CSS module 80437), filled with the
// Olwtelet Productions facts of src/content/brand.ts. Server component; only the centre image is a client component.
//
// footer.Container.Wrapper > div.Wrapper >
//   div.Column [ div.FooterText (name, city, country),
//                div.FooterPart [ div.FooterMark (the Olwtelet mark), div.CustomLinksWrapper > link "Política de privacidade" ] ]
//   div.Column [ div.FooterText (e-mail, site), div.SocialLinks > a(GitHub) a(LinkedIn) ]
//   div.MainImage (client: one of the two generated renders of the mark, at random)
//
// No certification badge, no office addresses: none exist for this studio.
import Link from 'next/link';
import { OlwteletMark } from '@/components/brand/OlwteletMark';
import { layout } from '@/components/ui/layout';
import { BRAND } from '@/content/brand';
import { cx } from '@/lib/cx';
import FooterMainImage from './FooterMainImage';
import type { FooterImageItem } from './FooterRandomImage';
import s from './footer.module.css';

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <path
      fill="currentColor"
      d="M14.22 0H1.78C.8 0 0 .8 0 1.78v12.44C0 15.2.8 16 1.78 16h12.44c.98 0 1.78-.8 1.78-1.78V1.78C16 .8 15.2 0 14.22 0ZM4.84 13.78H2.45v-7.7h2.39v7.7ZM3.63 5.07c-.78 0-1.41-.64-1.41-1.42s.63-1.42 1.41-1.42 1.41.64 1.41 1.42-.63 1.42-1.41 1.42Zm10.15 8.71h-2.37V9.74c0-1.11-.42-1.73-1.3-1.73-.95 0-1.45.64-1.45 1.73v4.04H6.37v-7.7h2.29v1.04s.69-1.27 2.32-1.27 2.8 1 2.8 3.06v4.88Z"
    />
  </svg>
);
const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <path
      fill="currentColor"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
    />
  </svg>
);

// The e-mail on one line, as always, and on two (OLWTELET@ / OUTLOOK.COM) for screens under 360 px: one of the two is
// display:none at any width (footer.module.css, .EmailOneLine / .EmailTwoLines), so a single address is shown, read and
// focused. The one-line version is the same single text as before, so from 360 px up the footer is drawn as before.
// The two-line version wraps at a <wbr> (no forced break), so copying or searching the page still finds one address.
const [EMAIL_USER, EMAIL_DOMAIN] = BRAND.contact.email.toUpperCase().split('@');

const IMAGES: FooterImageItem[] = BRAND.assets.footerImages.map((url) => ({ main_image: { url, alt: '', dimensions: { width: 440, height: 890 } } }));

export default function Footer() {
  return (
    <footer className={cx(s.Container, layout.Wrapper)}>
      <div className={s.Wrapper}>
        <div className={s.Column}>
          <div className={s.FooterText}>
            <p>
              {BRAND.name}
              <br />
              {BRAND.location.city}, {BRAND.location.region}
              <br />
              {BRAND.location.country}
            </p>
          </div>
          <div className={s.FooterPart}>
            <div className={s.FooterMark}>
              <OlwteletMark title={null} />
            </div>
            <div className={s.CustomLinksWrapper}>
              <Link href="/privacy-policy" className={s.CustomLink}>
                Política de privacidade
              </Link>
            </div>
          </div>
        </div>
        <div className={s.Column}>
          <div className={s.FooterText}>
            <p>
              <a href={`mailto:${BRAND.contact.email}`}>
                <span className={s.EmailOneLine}>{BRAND.contact.email.toUpperCase()}</span>
                <span className={s.EmailTwoLines}>
                  {EMAIL_USER}@<wbr />
                  {EMAIL_DOMAIN}
                </span>
              </a>
              <br />
              <a href={BRAND.links.site.href} target="_blank" rel="noreferrer">
                {BRAND.links.site.label.toUpperCase()}
              </a>
            </p>
          </div>
          <div className={s.SocialLinks}>
            <a href={BRAND.links.github.href} target="_blank" rel="noreferrer" aria-label={`${BRAND.links.github.label} de ${BRAND.creator.pseudonym}`}>
              <GitHubIcon />
            </a>
            <a href={BRAND.links.linkedin.href} target="_blank" rel="noreferrer" aria-label={`${BRAND.links.linkedin.label} de ${BRAND.creator.pseudonym}`}>
              <LinkedInIcon />
            </a>
          </div>
        </div>
        <FooterMainImage images={IMAGES} />
      </div>
    </footer>
  );
}
