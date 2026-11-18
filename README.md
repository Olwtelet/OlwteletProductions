# Olwtelet Productions

Site of **Olwtelet Productions**, the independent studio of Isaac Rodrigues (Olwtelet) in Brasília: software, games and digital experiences. Next.js 16 + TypeScript, pt-BR.

The site keeps the visual and interaction system of an earlier technical reproduction (curved WebGL work grid, intro, transitions, About toggle, contact modal, sound). That reproduction's documentation, evidence, scripts and media mirror stay only in the history of the local repository, from commit `228dc9e0`, and are not part of this version; its engine is the base of this one (see "Pendências de publicação", item 8, in docs/OLWTELET.md). The transformation into Olwtelet Productions — sources, centralized data, logo applications, external dependencies — is in [docs/OLWTELET.md](docs/OLWTELET.md).

## Requirements

- Node.js 20 or newer (developed on Node 26, Windows 11).
- Google Chrome, only for the scripts in `scripts/` (Playwright uses `channel: 'chrome'`).

## Run

```bash
npm install
```

`@react-three/fiber` is pinned to 9.5.0. Its declared peer range stops below React 19.3, so the repository's `.npmrc` sets `legacy-peer-deps=true` for `npm install` / `npm ci`.

Production:

```bash
npm run build
```

```bash
npm start
```

The site is then at <http://localhost:3000>. On Windows, double-clicking `scripts\start-production.cmd` (or `explorer.exe scripts\start-production.cmd`) opens a console window that builds if needed and serves on port 3000 until the window is closed. A server started as a background task of an assistant session ends with that session.

Development server:

```bash
npm run dev
```

## Content and brand

- `src/content/brand.ts`: every brand and project fact (name, signature, creator, location, contact, links, projects, statuses, categories, grid slots).
- `src/content/brand-mark.ts`: the symbol as vector faces.
- `node scripts/brand/build-content.mjs`: writes `src/content/{projects,home,pages,settings,taxonomies,page-themes}.json` from brand.ts.
- `node scripts/brand/build-brand-assets.mjs [task…]`: regenerates the logo files, icons, Open Graph images, intro frames, particle model, About sequence, work-grid atlases and blueprint, and the project images (sources in `assets-src/`).
- `node scripts/brand/verify-olwtelet.mjs`: captures and checks the running site at 1440×900, 1920×1080, 768×1024, 390×844 and 360×800, and ties the captures to the served build (`.next/BUILD_ID` against the HTML documents, the RSC responses and the SHA-256 of every `/_next/static` file the browser loaded). See `scripts/brand/README.md`.

## Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

## Environment variables

| Variable | Effect when set | When not set |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public origin: canonical URLs, absolute Open Graph images, URLs in the JSON-LD, sitemap entries. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` is used if this is not set. | No canonical, no `og:image`, empty sitemap: no address is invented. |
| `CONTACT_WEBHOOK_URL` | `/api/contact` forwards the contact form (multipart) to this URL; a 2xx answer shows the success step. | The submit gets `503 integration not configured` and the form shows a visible error with the e-mail address. No success is ever faked. |
| `NEXT_PUBLIC_GA_ID` | Loads Google Analytics with consent denied by default; the cookie banner appears and drives the consent. | No analytics and no cookie banner. |
| `NEXT_PUBLIC_TYPEKIT_KIT` | Adobe Fonts kit that serves `ballinger-mono` (the mono UI font). | The kit the reproduction used (`gtx3zug`): it needs to be replaced by a kit licensed for this site. |
| `IMG_AVIF` | `0` disables AVIF output of the `/api/img` resizer. | AVIF allowed. |

## Layout

- `src/app/`: routes. Home `/`, `/projects/[uid]` (Filmes HD Online Grátis and the Veil presentation), `/about/{studio,process}`, `/contact` (page plus a modal intercepted from any route), `/privacy-policy`, API routes (contact form, image resizer), icons, manifest, robots, sitemap, 404 and 500.
- `src/components/`: one folder per area (`brand`, `chrome`, `home`, `project`, `about`, `contact`, `legal`, `footer`, `transition`, `providers`, `ui`).
- `public/brand/`, `public/projects/`, `public/assets/`: generated brand files, project images, intro frames, atlases, sounds, fonts.
- `assets-src/`: sources of the generated files (the owner's logo, captures of the published project).
- `docs/`: `docs/OLWTELET.md` and its evidence (`docs/evidence/olwtelet/`).

## License

Proprietary. Copyright © 2026 Olwtelet Productions. All rights reserved. The materials whose rights belong to Olwtelet Productions may not be copied, modified, redistributed, republished, sublicensed, sold or used for derivative works without prior written authorization. [LICENSE](LICENSE), in Portuguese, has the full terms, including what remains allowed: uses permitted by law, normal browsing of the site and authorized hosting.

The license claims nothing over third-party materials: dependencies, fonts, sounds, film images in the project captures, code inherited from the earlier reproduction and other third-party works keep their own rights and licenses. The notices required by the open-source code embedded in `src/` are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The licensing items still open are listed in [docs/OLWTELET.md](docs/OLWTELET.md), under "Pendências de publicação".
