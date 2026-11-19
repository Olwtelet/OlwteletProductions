// Olwtelet Productions: the single source of brand and project facts.
// Everything public (header, footer, grid, list, case pages, About, contact, metadata, JSON-LD, generated assets)
// reads from here, directly or through the content files that scripts/brand/build-content.mjs writes from it.
//
// Facts come only from the owner's brief and the owner's sites (olwtelet.vercel.app, filmeshdonlinegratis.vercel.app,
// read on 2026-11-16). Nothing here is a metric, an award, a client, a date or a technology that was not confirmed.
// Plain data, erasable TypeScript only: the Node scripts import this file directly.

export const BRAND = {
  name: 'Olwtelet Productions',
  shortName: 'Olwtelet',
  /** Loader / intro words (they split apart like the original two-line loader). */
  loaderWords: ['OLWTELET', 'PRODUCTIONS'],
  signature: 'Software, jogos e experiências digitais.',
  /** Header line (rendered upper-case in the MonoDetail style). */
  tagline: 'Estúdio independente em Brasília: software, jogos e experiências digitais.',
  description:
    'Espaço de criação independente de Isaac Rodrigues (Olwtelet), em Brasília: projetos próprios de software, jogos e aplicações web.',
  locale: 'pt-BR',
  ogLocale: 'pt_BR',
  creator: {
    name: 'Isaac Rodrigues',
    pseudonym: 'Olwtelet',
    role: 'Desenvolvedor de software',
    /** Short role for the creator panel of /about/studio. */
    shortRole: 'Criador',
    studies: 'Ciência da Computação',
    work: 'desenvolvimento web',
    interests: ['inteligência artificial', 'cibersegurança', 'arquitetura de sistemas'],
  },
  location: {
    city: 'Brasília',
    region: 'DF',
    country: 'Brasil',
    countryCode: 'BR',
    label: 'Brasília, Brasil',
    clockLabel: 'Brasília, BR',
    timeZone: 'America/Sao_Paulo',
  },
  contact: {
    email: 'olwtelet@outlook.com',
  },
  links: {
    site: { label: 'olwtelet.vercel.app', href: 'https://olwtelet.vercel.app/' },
    github: { label: 'GitHub', href: 'https://github.com/Olwtelet' },
    linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/olwtelet/' },
  },
  /** Theme colours of the brand surfaces (header/footer pages keep their own page themes). */
  colors: { ink: '#000000', paper: '#FFFFFF', graphite: '#202020', mist: '#DFDFDF' },
  /** Generated logo applications (scripts/brand/build-brand-assets.mjs). */
  assets: {
    markWhiteSvg: '/brand/olwtelet-mark-white.svg',
    markBlackSvg: '/brand/olwtelet-mark-black.svg',
    markWhitePng: '/brand/olwtelet-mark-white-512.png',
    markBlackPng: '/brand/olwtelet-mark-black-512.png',
    logoPng: '/brand/olwtelet-logo-1024.png',
    ogImage: '/brand/og.png',
    notFound: '/brand/404.jpg',
    footerImages: ['/brand/footer-mark-porcelain.png', '/brand/footer-mark-signal.png'],
  },
} as const;

/** The browser tab title of every page: the brand name alone, with no page name, separator or description
 *  (owner's request of 2026-11-19). Used by the metadata of every route (src/lib/seo.ts), the client 404 head, the
 *  static /500 document (src/proxy.ts) and the content generator. Sharing titles (Open Graph, Twitter) stay per page. */
export const TAB_TITLE: string = BRAND.name;

export type ProjectStatus = 'published' | 'in-development';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  published: 'Publicado',
  'in-development': 'Em desenvolvimento',
};

/** Project types (filter "TIPO", the old "zone" slot). */
export const KINDS = {
  web: 'Web',
  jogo: 'Jogo',
} as const;
export type ProjectKind = keyof typeof KINDS;

/** True categories only (filter "CATEGORIA", the old "feature" slot). */
export const CATEGORIES = {
  cinema: 'Cinema',
  curadoria: 'Curadoria',
  comunidade: 'Comunidade',
  estrategia: 'Estratégia',
  navegador: 'Navegador',
} as const;
export type ProjectCategory = keyof typeof CATEGORIES;

export interface BrandProject {
  uid: string;
  /** stable id (grid tile id / list key) */
  id: string;
  title: string;
  status: ProjectStatus;
  kind: ProjectKind;
  categories: ProjectCategory[];
  /** one sentence, used by the grid list, About and metadata */
  summary: string;
  /** external address, only when the project is public */
  url: string | null;
  urlLabel: string | null;
  /** page theme of /projects/<uid>: primary = text, secondary = background */
  theme: { primaryColor: string; secondaryColor: string };
  /** work-grid slot in the 11×11 spiral (0 = just below-left of the screen centre) */
  gridSlot: number;
}

export const PROJECTS: readonly BrandProject[] = [
  {
    uid: 'filmes-hd-online-gratis',
    id: 'olwtelet-filmes-hd-online-gratis',
    title: 'Filmes HD Online Grátis',
    status: 'published',
    kind: 'web',
    categories: ['cinema', 'curadoria', 'comunidade'],
    summary:
      'Uma curadoria cinematográfica independente que reúne programação, textos sobre os filmes e sessões ao vivo no Discord.',
    url: 'https://filmeshdonlinegratis.vercel.app/',
    urlLabel: 'filmeshdonlinegratis.vercel.app',
    theme: { primaryColor: '#FFFFFF', secondaryColor: '#0E0F11' },
    gridSlot: 0,
  },
  {
    uid: 'veil',
    id: 'olwtelet-veil',
    title: 'Veil',
    status: 'in-development',
    kind: 'jogo',
    categories: ['estrategia', 'navegador'],
    summary: 'Um jogo de estratégia para navegador inspirado no xadrez, em desenvolvimento.',
    url: null,
    urlLabel: null,
    theme: { primaryColor: '#111111', secondaryColor: '#E4E2DD' },
    gridSlot: 2,
  },
];

export const PUBLISHED_PROJECTS = PROJECTS.filter((p) => p.status === 'published');
export const IN_DEVELOPMENT_PROJECTS = PROJECTS.filter((p) => p.status === 'in-development');

/** "1 projeto publicado", "2 projetos publicados" */
export function publishedCountLabel(n: number): string {
  return `${n} ${n === 1 ? 'projeto publicado' : 'projetos publicados'}`;
}
/** "1 em desenvolvimento" */
export function inDevelopmentCountLabel(n: number): string {
  return `${n} em desenvolvimento`;
}

/** Absolute site origin, only when configured (never invented). */
export function configuredOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;
  return null;
}
