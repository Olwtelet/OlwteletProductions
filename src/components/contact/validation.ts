// Contact form schema — hand-written equivalent of the original zod schema `wZ` (chunk 8462, module 76938),
// zod v3 (chunk 316: its .email() regex is copied verbatim below). zod is not installed in this project.
//
//   name     string().min(1,"Name is required").max(50,"Name cannot exceed 50 characters")
//                   .regex(/^[A-Za-z\s-]+$/,"Name can only contain letters, spaces, and hyphens")
//   email    string().min(1,"Email is required").max(50,"Email cannot exceed 50 characters").email("Invalid email address")
//   company  string().min(1,"Company is required").max(50,"Company cannot exceed 50 characters").optional()
//   note     string().max(1000,"Note cannot exceed 1000 characters").optional()
//   callouts string().max(1000,"Callouts cannot exceed 1000 characters").optional()
//   attachment any().optional(); features array(string()).optional(); viewed_case_studies any().optional()
//   contact_reason string()
//
// zod v3 runs every check of a string and reports issues in declaration order; @hookform/resolvers (zodResolver,
// criteriaMode "firstError") keeps the FIRST issue per path. `validateContact` reproduces that.
// Shared by the client form and the /api/contact route handler (no DOM types here).

export const CONTACT_MESSAGES = {
  nameRequired: 'Informe o seu nome',
  nameMax: 'O nome pode ter no máximo 50 caracteres',
  nameRegex: 'O nome pode ter apenas letras, espaços, apóstrofos e hífens',
  emailRequired: 'Informe o seu e-mail',
  emailMax: 'O e-mail pode ter no máximo 50 caracteres',
  emailInvalid: 'E-mail inválido',
  companyRequired: 'Informe a empresa ou o projeto',
  companyMax: 'Este campo pode ter no máximo 50 caracteres',
  noteMax: 'A mensagem pode ter no máximo 1000 caracteres',
  calloutsMax: 'Este campo pode ter no máximo 1000 caracteres',
  fileTooBig: 'O arquivo passa do limite de 2 MB',
} as const;

/** zod v3 `emailRegex` (chunk 316 line 688). */
export const ZOD_EMAIL_REGEX = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
/** Letters of any language (João, Conceição, Ñúñez), spaces, apostrophes and hyphens. */
export const NAME_REGEX = /^[\p{L}\p{M}\s'’-]+$/u;
/** client file hook (module 17258): files larger than this show "File size exceeds 2MB limit". */
export const MAX_ATTACHMENT_BYTES = 2097152;
/** module 76938 `Xx` */
export const VIEWED_CASE_STUDIES_KEY = 'VIEWED_CASE_STUDIES';
/** module 76938 `jk` — replaced by the stored name in the step-3 texts (the CMS copy has no token). */
export const NAME_TOKEN = '*Name*';

export type ContactField = 'name' | 'email' | 'company' | 'note' | 'callouts' | 'attachment' | 'features' | 'viewed_case_studies' | 'contact_reason';
export type ContactErrors = Partial<Record<ContactField, string>>;

export interface ContactValues {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  note?: unknown;
  callouts?: unknown;
  attachment?: unknown;
  features?: unknown;
  viewed_case_studies?: unknown;
  contact_reason?: unknown;
}

/** zod type error for a non-string where a string is required ("Required" when undefined). */
function typeIssue(v: unknown): string {
  return v === undefined ? 'Required' : `Expected string, received ${v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v}`;
}

function checkString(
  v: unknown,
  { optional, min, max, regex, email }: { optional?: boolean; min?: [number, string]; max?: [number, string]; regex?: [RegExp, string]; email?: string },
): string | undefined {
  if (v === undefined && optional) return undefined;
  if (typeof v !== 'string') return typeIssue(v);
  const issues: string[] = [];
  if (min && v.length < min[0]) issues.push(min[1]);
  if (max && v.length > max[0]) issues.push(max[1]);
  if (regex && !regex[0].test(v)) issues.push(regex[1]);
  if (email !== undefined && !ZOD_EMAIL_REGEX.test(v)) issues.push(email);
  return issues[0];
}

/** Full-schema validation; returns the first message per field (empty object = valid). */
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const set = (k: ContactField, m: string | undefined) => {
    if (m) errors[k] = m;
  };
  set('name', checkString(values.name, { min: [1, CONTACT_MESSAGES.nameRequired], max: [50, CONTACT_MESSAGES.nameMax], regex: [NAME_REGEX, CONTACT_MESSAGES.nameRegex] }));
  set('email', checkString(values.email, { min: [1, CONTACT_MESSAGES.emailRequired], max: [50, CONTACT_MESSAGES.emailMax], email: CONTACT_MESSAGES.emailInvalid }));
  // Olwtelet: "Empresa ou projeto" is optional (empty allowed); only its length is checked
  set('company', checkString(values.company, { optional: true, max: [50, CONTACT_MESSAGES.companyMax] }));
  set('note', checkString(values.note, { optional: true, max: [1000, CONTACT_MESSAGES.noteMax] }));
  set('callouts', checkString(values.callouts, { optional: true, max: [1000, CONTACT_MESSAGES.calloutsMax] }));
  if (values.features !== undefined) {
    if (!Array.isArray(values.features)) set('features', `Expected array, received ${typeof values.features}`);
    else if (values.features.some((f) => typeof f !== 'string')) set('features', 'Expected string, received ' + typeof values.features.find((f) => typeof f !== 'string'));
  }
  set('contact_reason', checkString(values.contact_reason, {}));
  return errors;
}
