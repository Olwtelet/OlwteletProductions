// Loose shapes of the Prismic `about_page` slices as stored in src/content/pages.json (rscDocument.slices) and of
// the slice `context` the original passes to every slice (additionalPageData, clientsData, departments, employees).
import type { PrismicImageField } from './images';

export interface PrismicLink {
  link_type?: string;
  url?: string | null;
  uid?: string;
  text?: string;
  target?: string;
  data?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface AboutSlice {
  id: string;
  slice_type: string;
  variation: string;
  version?: string;
  slice_label?: string | null;
  primary: Record<string, unknown>;
  items: Record<string, unknown>[];
}

export interface AboutColumnsPrimary {
  about_section_id?: string | null;
  page_title?: boolean;
  include_section_line_above?: boolean;
  sub_text?: string | null;
  description?: string | null;
  cta_link?: PrismicLink;
  image?: PrismicImageField;
  video?: PrismicLink;
  video_blending?: boolean;
  // zone variation
  linked_zone?: PrismicLink;
  row_number?: string | null;
  row_icon?: PrismicImageField;
  zone_title?: string | null;
  zone_description?: string | null;
  zone_link_text?: string | null;
  list_items?: unknown[];
  list_image?: PrismicImageField;
  list_video?: PrismicLink;
  list_video_blending?: boolean;
}

/** Olwtelet: Processo steps slice (`about_process_steps`, ProcessSteps.tsx) */
export type ProcessDiagramKind = 'ideia' | 'investigacao' | 'construcao' | 'refinamento';
export interface ProcessStepsPrimary {
  about_section_id?: string | null;
  sub_text?: string | null;
  description?: string | null;
}
export interface ProcessStepItem {
  step_number: string;
  title: string;
  description: string;
  diagram: ProcessDiagramKind;
  /** three words of the step's text, set beside the diagram's three inputs */
  labels: string[];
}

export interface CarouselItem {
  image?: PrismicImageField;
  video_url?: string | null;
}

export interface EmployeeDoc {
  id: string;
  uid: string;
  data: {
    employee_name: string;
    job_title: string;
    department: { id: string };
    depth_map_image_link: { url?: string | null };
    texture_image_link: { url?: string | null };
    particle_params?: { face_scale_z?: number; offset_z?: number; face_size?: number }[];
  };
}

export interface DepartmentDoc {
  id: string;
  uid?: string;
  data: { department_name: string };
}

