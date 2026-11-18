// Shared content types for src/content/*.json (see docs/recon/content-model.md §2).
// Normalised fields are typed precisely; verbatim Prismic payloads (`data`, slices, rich text) are typed loosely
// (`PrismicData`) because they are kept byte-for-byte from the CMS.

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PrismicData = Record<string, any>;

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
}
export type PageThemes = Record<string, Theme>;

/** Prismic image field ({dimensions,url,alt,...}) */
export interface PrismicImage {
  dimensions?: { width: number; height: number };
  url?: string;
  alt?: string | null;
  copyright?: string | null;
  id?: string;
  edit?: { x: number; y: number; zoom: number; background: string };
  [k: string]: unknown;
}

/** Prismic rich-text block */
export interface RTSpan {
  start: number;
  end: number;
  type: 'strong' | 'em' | 'hyperlink' | 'label' | string;
  data?: PrismicLink & { label?: string };
}
export interface RTBlock {
  type: string;
  text?: string;
  spans?: RTSpan[];
  direction?: string;
  // image blocks
  url?: string;
  alt?: string | null;
  dimensions?: { width: number; height: number };
  linkTo?: PrismicLink;
  // embed blocks
  oembed?: { html?: string; embed_url?: string; type?: string; [k: string]: unknown };
  [k: string]: unknown;
}
export type RichTextField = RTBlock[] | null | undefined;

export interface PrismicLink {
  link_type?: 'Web' | 'Document' | 'Media' | 'Any' | string;
  url?: string;
  uid?: string;
  type?: string;
  target?: string;
  kind?: string;
  name?: string;
  isBroken?: boolean;
  [k: string]: unknown;
}

export interface SeoRecord {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  googlebot: string | null;
  og: { title?: string; description?: string; site_name?: string; image?: string };
  twitter: { card?: string; title?: string; description?: string; image?: string };
  icons: Array<{ rel: string; href: string; type?: string; sizes?: string }>;
  otherMeta?: unknown[];
  /** robots value found in the static HTML <head> (404: "noindex") */
  headRobots: string | null;
}

export interface ProjectClientRef {
  uid?: string;
  id?: string;
  name?: string;
  logo?: { url: string; width: number; height: number; alt: string | null } | null;
  display_order?: number | null;
  disable_filter?: boolean;
  hide_from_about_page?: boolean;
  emptyLink?: true;
}
export interface ProjectFeatureRef {
  uid?: string;
  id?: string;
  feature_name?: string;
  emptyLink?: true;
}

export interface Project {
  uid: string;
  id: string;
  type: 'project';
  route: string;
  url: string;
  inSitemap: boolean;
  /** catalogue order (src/content/brand.ts PROJECTS) */
  cmsOrderIndex: number;
  first_publication_date: string;
  last_publication_date: string;
  tags: string[];
  lang: string;
  alternate_languages: unknown[];
  title: string;
  launch_date: string | null;
  /** 'published' | 'in-development' (src/content/brand.ts) */
  status?: string;
  clients: ProjectClientRef[];
  features: ProjectFeatureRef[];
  zone: { uid: string; id: string; zone_name: string } | null;
  service: { uid: string; id: string; service_name: string } | null;
  workGrid: {
    priority: number | null;
    hide_from_work_grid: boolean;
    title: string | null;
    mediatype: 'image' | 'video' | null;
    media_url: string | null;
    cell_blur: PrismicLink;
    entries: number;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    pageThemesEntry: Theme | null;
    pageThemesMatchesField: boolean;
    effective: Theme;
    effectiveSource: string;
    [k: string]: unknown;
  };
  slicesSummary: string[];
  meta: { meta_title: string | null; meta_description: string | null; meta_image: PrismicImage | Record<string, never> };
  /** computed by src/lib/seo.ts (projectSeo); not stored */
  seo: SeoRecord | null;
  /** "Related work" cards, verbatim order (0-3 uids) */
  relatedProjects: string[];
  grid: {
    inBlueprint: boolean;
    blueprintIndex: number | null;
    atlas: { index: number; cellX: number; cellY: number } | null;
    listYear: number | null;
    listIndexInYear: number | null;
  };
  /** VERBATIM Prismic project data (hero, about, awards, live_experience, slices, meta_*) */
  data: PrismicData;
}

export interface PageRecord {
  route: string;
  kind: string;
  inSitemap: boolean | null;
  httpStatus: number | null;
  seo: SeoRecord;
  rscDocument: PrismicData | null;
  cmsDocument: PrismicData | null;
  sections: PrismicData[];
  components: PrismicData[];
}

export interface HomeContent {
  route: '/';
  seo: SeoRecord;
  document: PrismicData;
  screenReaderText: { h1: string[]; p: string[] };
  workGridConfig: PrismicData;
  gridContent: { count: number; order: string[]; note?: string; docs: PrismicData[] };
  gridTiles: PrismicData;
  listView: PrismicData;
  filters: PrismicData;
}

export interface TaxonomyItem {
  uid: string;
  id: string;
  name: string;
  display_order: number | null;
  disable_filter: boolean;
  projectCount?: number;
  visibleProjectCount?: number;
  doc: PrismicData;
  [k: string]: unknown;
}
export interface Taxonomies {
  zones: { customType: string; fields: string[]; items: TaxonomyItem[] };
  features: { customType: string; fields: string[]; items: TaxonomyItem[] };
  services: { customType: string; fields: string[]; items: TaxonomyItem[] };
  clients: { customType: string; fields: string[]; items: TaxonomyItem[] };
  filterPanelOrder: PrismicData;
  departments: { items: PrismicData[]; [k: string]: unknown };
  employees: { items: PrismicData[]; [k: string]: unknown };
  awardRecognitions: { items: PrismicData[]; [k: string]: unknown };
}

export interface HeaderData {
  logo: PrismicImage;
  short_description: string;
  contact_cta_text: string;
  contact_cta_link: PrismicLink;
}
export interface CookieBannerData {
  description: string;
  accept_text: string;
  decline_text: string;
  main_text: RTBlock[];
}

/** src/content/settings.json: the header CTA, the tagline and the cookie banner copy (brand facts: brand.ts). */
export interface Settings {
  header: { data: HeaderData; [k: string]: unknown };
  tagline: { text: string; [k: string]: unknown };
  cookieBanner: { data: CookieBannerData; [k: string]: unknown };
  [k: string]: unknown;
}

export interface Blueprint {
  atlases: Array<{ type: 'image' | 'video'; mediaAtlas: string; mediaAlphaAtlas: string; labelsAtlas: string }>;
  cells: PrismicData[];
  [k: string]: unknown;
}
