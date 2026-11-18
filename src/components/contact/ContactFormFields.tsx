'use client';
// Contact form (step two) — original component `tf` (chunk 665 module 95192) built on react-hook-form
// (`mode:"onChange"`, zodResolver(wZ), shouldFocusError) — neither library is installed here, so the
// form-state semantics the visitor can observe are reproduced by hand:
//   - a field is validated (against the full schema, first issue per field) on its own change events only;
//     only that field's error is updated;
//   - blur marks the field touched (no validation on blur in onChange mode);
//   - submit: isSubmitting → full validation → errors for every field + focus on the first invalid registered
//     field, or the submit handler; isSubmitSuccessful → setName + step 3;
//   - button state (enum yG): touched ≥ 1 ? (no errors ? (submitting ? Submitting : successful ? Successful :
//     Errored) : Invalid) : Ready; disabled when Invalid or Submitting; spinner while isSubmitting.
// Honest submission: when /api/contact fails (no integration configured → 503, network error, upstream error), the
// form stays on step two and shows a visible message with the e-mail address; the success step only follows a
// successful request (no fake success).
import { motion } from 'framer-motion';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import { CTA } from '@/components/ui/CTA';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { appStore, useAppStore } from '@/lib/store';
import { BRAND } from '@/content/brand';
import { ContactFormSlider } from './Slider';
import { UploadIcon } from './icons';
import { MAX_ATTACHMENT_BYTES, CONTACT_MESSAGES, VIEWED_CASE_STUDIES_KEY, validateContact, type ContactErrors, type ContactField } from './validation';
import styles from './contactForm.module.css';

/** module 27275 `pm` */
export const COMPLEXITY = { Base: 'base', Medium: 'medium', Full: 'full' } as const;
/** module 27275 `yG` */
export const BUTTON_STATE = { Invalid: 'invalid', Submitting: 'submitting', Ready: 'ready', Successful: 'successful', Errored: 'errored' } as const;
type ButtonState = (typeof BUTTON_STATE)[keyof typeof BUTTON_STATE];

/** module 72175 `EF.contact` */
export const CONTACT_API = '/api/contact';
const PLACEHOLDER = 'Digite aqui';

/** module 39209: useId() with ":" replaced (valid CSS id selector) */
const safeId = (id: string) => id.replaceAll(':', '_');
/** module 83367 */
const errorId = (name: string) => `error-${name}`;

export interface ContactDocumentData {
  step_1_title: string;
  step_1_project_enquiry_eyebrow: string;
  step_1_project_enquiry_description: string;
  step_1_project_bg_video: string | null;
  step_1_veil_enquiry_eyebrow: string;
  step_1_veil_enquiry_description: string;
  step_1_veil_bg_video: string | null;
  step_1_partnerships_enquiry_eyebrow: string;
  step_1_partnerships_enquiry_desc: string;
  step_1_partnerships_email: string | null;
  step_1_partnerships_whatsapp: string | null;
  step_1_partnerships_bg_video: string | null;
  /** Olwtelet: still images behind the tiles (no video), the second tile's link, a LinkedIn row on the third */
  step_1_project_bg_image?: string | null;
  step_1_veil_bg_image?: string | null;
  step_1_veil_href?: string | null;
  step_1_partnerships_linkedin?: string | null;
  step_2_title: string;
  step_2_slider: { slider_option: string }[];
  step_2_full_name_placeholder: string;
  step_2_email_placeholder: string;
  step_2_company_placeholder: string;
  step_2_input_5_placeholder_1: string;
  step_2_input_5_placeholder_2: string;
  step_2_input_5_placeholder_3: string;
  step_2_input_6_placeholder_1: string;
  step_2_input_6_placeholder_2: string;
  step_2_selection_label: string;
  step_2_selection_options: { selection_option: string }[];
  step_3_success_message: import('@/lib/types').RichTextField;
  step_3_next_steps: { message: string }[] | null;
  [k: string]: unknown;
}

// ------------------------------------------------------------------ store setters (module 5572 contact slice)
export const setContactFlowStep = (contactFlowStep: number) => appStore.set({ contactFlowStep });
export const setContactFormComplexity = (contactFormComplexity: number) => appStore.set({ contactFormComplexity });
const setName = (name: string) => appStore.set({ name });

// ------------------------------------------------------------------ small components

/** module 35669 — error bar (orange) "Invalid" + message */
function FormInputError({ error, name }: { error: string; name: string }) {
  return (
    <span className={styles.FormInputError} aria-live="polite" id={errorId(name)}>
      <motion.span className={styles.InvalidSpan} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        Inválido
      </motion.span>
      <motion.span className={styles.ErrorSpan} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {error}
      </motion.span>
    </span>
  );
}

/** `e7` — form row (rows 06/07 get the reveal wrapper + data-complexity) */
function FormRow({ children, complexity }: { children: ReactNode; complexity?: string }) {
  if (complexity && complexity !== COMPLEXITY.Base) {
    return (
      <div className={styles.FormRow} data-complexity={complexity}>
        <div className={styles.FormRowRevealWrapper}>
          <div className={styles.FormRowContainer}>{children}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.FormRow}>
      <div className={styles.FormRowContainer}>{children}</div>
    </div>
  );
}

function FormIndex({ children, topAlignWithTitle, topAlignWithLabel }: { children: ReactNode; topAlignWithTitle?: boolean; topAlignWithLabel?: boolean }) {
  return (
    <span className={cx(styles.FormIndex, topAlignWithTitle && styles.FormIndex_TopAlignWithTitle, topAlignWithLabel && styles.FormIndex_TopAlignWithLabel)}>
      {children}
    </span>
  );
}

/** module 23465 — submit button (CTA button + FormSubmitButtonElement), spinner while submitting */
function FormSubmitButton({ state, tabIndex = 0, isSubmitting, text = 'Enviar', disabled }: { state: ButtonState; tabIndex?: number; isSubmitting: boolean; text?: string; disabled?: boolean }) {
  const isDisabled = useMemo(() => state === BUTTON_STATE.Invalid || state === BUTTON_STATE.Submitting || disabled, [state, disabled]);
  return (
    <CTA className={styles.FormSubmitButtonElement} disabled={isDisabled} tabIndex={tabIndex}>
      {isSubmitting ? <div className={styles.SubmitSpinnerWrapper} /> : text}
    </CTA>
  );
}

// ------------------------------------------------------------------ hand-written react-hook-form equivalent

type FileValue = FileList | never[];
interface FormValues {
  attachment: FileValue;
  viewed_case_studies: string[];
  name: string;
  email: string;
  company: string;
  note: string;
  contact_reason: string;
  callouts: string;
  features: string[];
}
const defaultValues = (): FormValues => ({
  attachment: [],
  viewed_case_studies: [],
  name: '',
  email: '',
  company: '',
  note: '',
  contact_reason: '',
  callouts: '',
  features: [],
});

/** registration order of the original form (RHF `_fields` iteration order used to focus the first error) */
const REGISTER_ORDER: ContactField[] = ['name', 'email', 'company', 'note', 'attachment', 'features', 'viewed_case_studies'];
/** zod object output order (zodResolver returns the parsed data → FormData order) */
const SCHEMA_ORDER: (keyof FormValues)[] = ['name', 'email', 'company', 'note', 'callouts', 'attachment', 'features', 'viewed_case_studies', 'contact_reason'];

type FieldEl = HTMLInputElement | HTMLTextAreaElement;

function sameErrors(a: ContactErrors, b: ContactErrors) {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k as ContactField] === b[k as ContactField]);
}

function useContactFormState(onValid: (values: FormValues) => Promise<void>) {
  const values = useRef<FormValues>(defaultValues());
  const fields = useRef(new Map<string, FieldEl[]>());
  const [errors, setErrors] = useState<ContactErrors>({});
  const errorsRef = useRef<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, true>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
  /** the last submit passed validation but the request failed */
  const [submitFailed, setSubmitFailed] = useState(false);

  const commitErrors = useCallback((next: ContactErrors) => {
    if (sameErrors(errorsRef.current, next)) return;
    errorsRef.current = next;
    setErrors(next);
  }, []);

  const readValue = (name: ContactField, el: FieldEl): unknown => {
    if (el instanceof HTMLInputElement && el.type === 'file') return el.files ?? [];
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      return (fields.current.get(name) ?? []).filter((c) => (c as HTMLInputElement).checked).map((c) => c.value);
    }
    return el.value;
  };

  const validateField = useCallback(
    (name: ContactField) => {
      const all = validateContact(values.current);
      const next = { ...errorsRef.current };
      if (all[name]) next[name] = all[name];
      else delete next[name];
      commitErrors(next);
    },
    [commitErrors],
  );

  const register = useCallback(
    (name: ContactField) => ({
      name,
      ref: (el: FieldEl | null) => {
        if (!el) return;
        const list = fields.current.get(name) ?? [];
        if (!list.includes(el)) list.push(el);
        fields.current.set(name, list);
      },
      onChange: (e: ChangeEvent<FieldEl>) => {
        (values.current as unknown as Record<string, unknown>)[name] = readValue(name, e.target);
        validateField(name);
      },
      onBlur: (e: FocusEvent<FieldEl>) => {
        void e;
        setTouched((t) => (t[name] ? t : { ...t, [name]: true }));
      },
    }),
    [validateField],
  );

  const setValue = useCallback((name: keyof FormValues, value: unknown) => {
    (values.current as unknown as Record<string, unknown>)[name] = value;
    const el = fields.current.get(name)?.[0];
    if (el && !(el instanceof HTMLInputElement && (el.type === 'file' || el.type === 'checkbox'))) el.value = value == null ? '' : String(value);
  }, []);

  const getValues = useCallback((name: keyof FormValues) => values.current[name], []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setSubmitFailed(false);
      const all = validateContact(values.current);
      let ok = false;
      if (Object.keys(all).length) {
        commitErrors(all);
        for (const name of REGISTER_ORDER) {
          if (all[name]) {
            fields.current.get(name)?.[0]?.focus();
            break;
          }
        }
      } else {
        commitErrors({});
        try {
          await onValid(values.current);
          ok = true;
        } catch {
          ok = false;
          setSubmitFailed(true);
        }
      }
      setIsSubmitting(false);
      setIsSubmitSuccessful(ok);
    },
    [commitErrors, onValid],
  );

  return { register, setValue, getValues, handleSubmit, errors, touched, isSubmitting, isSubmitSuccessful, submitFailed };
}

// ------------------------------------------------------------------ submit (`tg`)

async function submitContact(values: FormValues) {
  const fd = new FormData();
  for (const key of SCHEMA_ORDER) {
    const v = values[key];
    if (key === 'attachment' && typeof FileList !== 'undefined' && v instanceof FileList) {
      Array.from(v).forEach((f, i) => fd.append(`attachment_${i}`, f));
    } else if (Array.isArray(v)) fd.append(key, v.join(', '));
    else if (key === 'viewed_case_studies' && (v as unknown) === '') fd.append(key, '[]');
    else fd.append(key, String(v));
  }
  try {
    const res = await fetch(CONTACT_API, { method: 'POST', body: fd });
    if (res.ok) return;
    let detail = `${res.status} ${res.statusText}`;
    try {
      detail = JSON.stringify(await res.json());
    } catch {}
    throw Error(`Submission failed: ${detail}`);
  } catch (err) {
    console.error('Network error submitting form:', err);
    // DIVERGENCE: re-thrown so the form does not report a successful submission (see file header).
    throw err;
  }
}

// ------------------------------------------------------------------ fields

type Register = ReturnType<ReturnType<typeof useContactFormState>['register']>;

/** `eY` — text input row content */
function FormTextInput({
  register,
  error,
  title,
  placeholder = 'Escreva aqui',
  autoComplete,
  name,
  tabIndex = 0,
}: {
  register: Register;
  error?: string;
  title: string;
  placeholder?: string;
  autoComplete?: string;
  name: string;
  tabIndex?: number;
}) {
  const id = safeId(useId());
  return (
    <>
      <div className={styles.FormTextInputWrapper}>
        <label className={cx(styles.FormTextInputLabel, typography.DefaultBody)} tabIndex={-1} htmlFor={id}>
          {title}
        </label>
        <input
          className={cx(styles.FormTextInputElement, typography.DefaultBody)}
          aria-invalid={!!error}
          aria-label={title}
          aria-errormessage={errorId(name)}
          id={id}
          autoComplete={autoComplete}
          placeholder={placeholder}
          {...register}
          tabIndex={tabIndex}
        />
      </div>
      {error && <FormInputError error={error} name={name} />}
    </>
  );
}

/** `eU` — textarea (errors are not rendered by the original component) */
function FormTextarea({ register, title, name, placeholder, tabIndex = 0, rows = 2 }: { register: Register; title: string; name: string; placeholder?: string; tabIndex?: number; rows?: number }) {
  const id = safeId(useId());
  return (
    <>
      <label className={styles.FormTextAreaLabel} htmlFor={id}>
        {title}
      </label>
      <textarea className={cx(styles.FormTextAreaElement, typography.DefaultBody)} id={id} placeholder={placeholder} aria-label={title} {...register} name={name} tabIndex={tabIndex} rows={rows} />
    </>
  );
}

/** module 17258 — client file hook (keeps the first file ≤ 2 MB; shows "File size exceeds 2MB limit") */
function useFileInput(prompt: string) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleFileChange = (f: File | null) => {
    if (f && f.size > MAX_ATTACHMENT_BYTES) {
      setFile(null);
      setError(CONTACT_MESSAGES.fileTooBig);
    } else {
      setFile(f);
      setError(null);
    }
  };
  const id = safeId(useId());
  return { text: (file ? file.name : undefined) || prompt, id, handleFileChange, error };
}

/** `eD` — file drop zone (dashed box, cloud icon, mono prompt / file name) */
function FormFileInput({ register, title, name, prompt, tabIndex = 0 }: { register: Register; title: string; name: string; prompt: string; tabIndex?: number }) {
  const { text, id, handleFileChange, error } = useFileInput(prompt);
  return (
    <>
      <span className={styles.FileTitle}>{title}</span>
      <div className={styles.InputWrapper}>
        <label
          className={styles.FakeInput}
          data-fake
          htmlFor={id}
          tabIndex={tabIndex}
          onKeyDown={(e) => {
            if (e.key === 'Enter') document.getElementById(id)?.click();
          }}
        >
          <UploadIcon className={styles.UploadIcon} />
          <span className={typography.MonoDetail}>{text}</span>
        </label>
        <input
          className={styles.FileInput}
          id={id}
          type="file"
          aria-label="Anexar arquivo"
          tabIndex={-1}
          {...register}
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            // a file over 2 MB is dropped from the input (and so from the submission), not only flagged
            if (f && f.size > MAX_ATTACHMENT_BYTES) e.target.value = '';
            register.onChange(e);
            handleFileChange(f);
          }}
          accept=".pdf,.doc,.docx"
        />
        {error && <FormInputError error={error} name={name} />}
      </div>
    </>
  );
}

/** `eE` — round checkbox chip */
function FormCheckbox({ title, register, tabIndex = 0 }: { title: string; register: Register; tabIndex?: number }) {
  const id = safeId(useId());
  return (
    <div className={styles.CheckboxContainer}>
      <input className={styles.CheckboxInput} aria-hidden id={id} aria-label={title} type="checkbox" value={title} {...register} tabIndex={tabIndex} />
      <label htmlFor={id}>{title}</label>
    </div>
  );
}

/** `eP` — features fieldset (tabIndex never passed by the form → 0 even off-step, as shipped) */
function FormCheckboxes({ title, name, values, register, tabIndex = 0 }: { title: string; name: string; values: string[]; register: Register; tabIndex?: number }) {
  return (
    <fieldset className={styles.FormFieldset} name={name}>
      <legend className={styles.FormFieldsetLegend}>{title}</legend>
      <ul className={styles.FormList}>
        {values.map((v) => (
          <li key={v} className={styles.FormListItem}>
            <FormCheckbox title={v} register={register} tabIndex={tabIndex} />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

// ------------------------------------------------------------------ the form (`tf`)

export function ContactFormFields({ data, onSuccess }: { data: ContactDocumentData; onSuccess: () => void }) {
  // whole-store subscription (original `(0, m.P)()` without selector → re-renders on every store change)
  const store = useAppStore();
  const { contactFlowStep, contactFormComplexity } = store;
  const tabIndex = contactFlowStep === 2 ? 0 : -1;

  const { register, setValue, getValues, handleSubmit, errors, touched, isSubmitting, isSubmitSuccessful, submitFailed } = useContactFormState(submitContact);

  const noErrors = !errors || Object.values(errors).length < 1;
  const isTouched = Object.values(touched).length >= 1;
  const features = data.step_2_selection_options.map(({ selection_option }) => selection_option).filter((v) => v !== '');
  // new array on every render (as the original) → the memoised slider re-renders with the form
  const sliderLabels = data.step_2_slider.map(({ slider_option }) => slider_option).filter((v) => v !== '');

  const noteTitle = useMemo(
    () => (contactFormComplexity === 0 ? data.step_2_input_5_placeholder_1 : contactFormComplexity === 1 ? data.step_2_input_5_placeholder_2 : data.step_2_input_5_placeholder_3),
    [contactFormComplexity, data],
  );
  const fileTitle = useMemo(() => (contactFormComplexity === 1 ? data.step_2_input_6_placeholder_1 : data.step_2_input_6_placeholder_2), [contactFormComplexity, data]);

  const state: ButtonState = useMemo(
    () =>
      isTouched
        ? noErrors
          ? isSubmitting
            ? BUTTON_STATE.Submitting
            : isSubmitSuccessful
              ? BUTTON_STATE.Successful
              : BUTTON_STATE.Errored
          : BUTTON_STATE.Invalid
        : BUTTON_STATE.Ready,
    [isTouched, noErrors, isSubmitSuccessful, isSubmitting],
  );

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(VIEWED_CASE_STUDIES_KEY);
    } catch {}
    let viewed: string[] = [];
    if (raw) {
      try {
        viewed = Object.keys(JSON.parse(raw));
      } catch {}
    }
    setValue('viewed_case_studies', viewed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSubmitSuccessful) {
      setName(String(getValues('name')));
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getValues, isSubmitSuccessful]);

  useEffect(() => {
    setValue('contact_reason', sliderLabels[contactFormComplexity]);
  });

  return (
    <form className={cx(styles.Form, typography.DefaultBody)} onSubmit={handleSubmit}>
      <FormRow>
        <FormIndex topAlignWithTitle>01</FormIndex>
        <h2 id="slider-label" className={cx(styles.FormTitle, typography.MidSubTitle)}>
          {data.step_2_title}
        </h2>
        <ContactFormSlider labels={sliderLabels} labelledBy="slider-label" tabIndex={tabIndex} value={contactFormComplexity} setValue={setContactFormComplexity} />
      </FormRow>
      <FormRow>
        <FormIndex>02</FormIndex>
        <FormTextInput register={register('name')} title={data.step_2_full_name_placeholder} placeholder={PLACEHOLDER} autoComplete="name" error={errors.name} name="name" tabIndex={tabIndex} />
      </FormRow>
      <FormRow>
        <FormIndex>03</FormIndex>
        <FormTextInput register={register('email')} title={data.step_2_email_placeholder} placeholder={PLACEHOLDER} autoComplete="email" error={errors.email} name="email" tabIndex={tabIndex} />
      </FormRow>
      <FormRow>
        <FormIndex>04</FormIndex>
        <FormTextInput register={register('company')} title={data.step_2_company_placeholder} placeholder={PLACEHOLDER} error={errors.company} name="company" tabIndex={tabIndex} />
      </FormRow>
      <FormRow>
        <FormIndex topAlignWithTitle>05</FormIndex>
        <FormTextarea register={register('note')} title={noteTitle} placeholder={PLACEHOLDER} name="note" tabIndex={tabIndex} rows={6} />
      </FormRow>
      <FormRow complexity={COMPLEXITY.Medium}>
        <FormIndex topAlignWithLabel>06</FormIndex>
        <FormFileInput title={fileTitle} prompt="Anexe um arquivo (PDF, DOC ou DOCX, até 2 MB)" register={register('attachment')} name="attachment" tabIndex={tabIndex} />
      </FormRow>
      <FormRow complexity={COMPLEXITY.Full}>
        <FormIndex topAlignWithLabel>07</FormIndex>
        <FormCheckboxes title={data.step_2_selection_label} values={features} register={register('features')} name="features" />
      </FormRow>
      {/* Olwtelet: out of the Tab order (inherited: Tab from the privacy link landed on this invisible field and scrolled
          the modal 621 px into step 2); its value is only set by setValue */}
      <input className={styles.FormInvisibleInput} {...register('viewed_case_studies')} aria-hidden tabIndex={-1} type="text" />
      {submitFailed && (
        <p className={cx(styles.FormSubmitError, typography.MonoDetail)} role="alert">
          Não foi possível enviar a mensagem agora. Escreva para{' '}
          <a href={`mailto:${BRAND.contact.email}`}>{BRAND.contact.email}</a>.
        </p>
      )}
      <FormSubmitButton isSubmitting={isSubmitting} state={state} tabIndex={tabIndex} />
    </form>
  );
}
