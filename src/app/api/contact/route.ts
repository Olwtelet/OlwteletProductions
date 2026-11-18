// POST /api/contact — local replacement for the original's same-origin Route Handler (module 72175 `EF.contact`,
// multipart/form-data from the contact form `tg`). The original's server side is unknown (never exercised).
// Contract here (ARCHITECTURE.md "Runtime conventions"):
//   - validates the multipart body with the same rules as the client schema (validation.ts = zod `wZ`)
//     → 400 {error:"validation failed", issues:{field: message}} on invalid input;
//   - without CONTACT_WEBHOOK_URL → 503 {error:"integration not configured"} (the UI then stays on step two);
//   - with CONTACT_WEBHOOK_URL → forwards the multipart body unchanged (POST) and mirrors the webhook's status
//     (2xx → 200 {ok:true}, anything else → 502 {error:"webhook failed", status}).
// Never contacts the original site.
import { validateContact } from '@/components/contact/validation';

const MAX_BODY_BYTES = 25 * 1024 * 1024;

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'invalid multipart body' }, 400);
  }

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v : undefined;
  };
  const features = str('features');
  const issues = validateContact({
    name: str('name'),
    email: str('email'),
    company: str('company'),
    note: str('note'),
    callouts: str('callouts'),
    // the client joins the checked chips with ", " (original `tg`)
    features: features ? features.split(', ') : undefined,
    contact_reason: str('contact_reason') ?? '',
  });
  if (Object.keys(issues).length) return json({ error: 'validation failed', issues }, 400);

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) return json({ error: 'integration not configured' }, 503);

  try {
    const res = await fetch(webhook, { method: 'POST', body: form });
    if (!res.ok) return json({ error: 'webhook failed', status: res.status }, 502);
    return json({ ok: true }, 200);
  } catch {
    return json({ error: 'webhook unreachable' }, 502);
  }
}
