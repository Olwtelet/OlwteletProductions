// Request-level handling: GET /500 answers HTTP 500 with a static error document (Next 16 has no public /500 route),
// and so does /_global-error, the URL of Next's built-in static 500 page (pages/500.html, always Next's own document with
// its English title; the App Router has no file convention that replaces it). Mixed-case page URLs are routed to their
// not-found branch (caseGuard below).
import { NextResponse, type NextRequest } from 'next/server';
import { TAB_TITLE } from '@/content/brand';

/** Static 500 document (pt-BR, no scripts), in the style of Next's own error page. Tab title: TAB_TITLE, as every page. */
const ERROR_500_HTML = "<!DOCTYPE html><html lang=\"pt-BR\" id=\"__next_error__\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/><title>" + TAB_TITLE + "</title><style>:root {--next-error-bg: #fff;--next-error-text: #171717;--next-error-title: #171717;--next-error-message: #171717;--next-error-digest: #666666;--next-error-btn-text: #fff;--next-error-btn-bg: #171717;--next-error-btn-border: none;--next-error-btn-secondary-text: #171717;--next-error-btn-secondary-bg: transparent;--next-error-btn-secondary-border: 1px solid rgba(0,0,0,0.08);}@media (prefers-color-scheme: dark) {:root {--next-error-bg: #0a0a0a;--next-error-text: #ededed;--next-error-title: #ededed;--next-error-message: #ededed;--next-error-digest: #a0a0a0;--next-error-btn-text: #0a0a0a;--next-error-btn-bg: #ededed;--next-error-btn-border: none;--next-error-btn-secondary-text: #ededed;--next-error-btn-secondary-bg: transparent;--next-error-btn-secondary-border: 1px solid rgba(255,255,255,0.14);}}body { margin: 0; color: var(--next-error-text); background: var(--next-error-bg); }</style></head><body><div hidden=\"\"><!--$--><!--/$--></div><div style=\"font-family:system-ui,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot;;height:100vh;display:flex;align-items:center;justify-content:center\"><div style=\"margin-top:-32px;max-width:325px;padding:32px 28px;text-align:left\"><svg width=\"32\" height=\"32\" viewBox=\"-0.2 -1.5 32 32\" fill=\"none\" style=\"margin-bottom:24px\"><path d=\"M16.9328 0C18.0839 0.000116771 19.1334 0.658832 19.634 1.69531L31.4299 26.1309C32.0708 27.4588 31.1036 28.9999 29.6291 29H2.00215C0.527541 29 -0.439628 27.4588 0.201371 26.1309L11.9973 1.69531C12.4979 0.658823 13.5474 7.75066e-05 14.6984 0H16.9328ZM3.59493 26H28.0363L16.9328 3H14.6984L3.59493 26ZM15.8156 19C16.9202 19.0001 17.8156 19.8955 17.8156 21C17.8156 22.1045 16.9202 22.9999 15.8156 23C14.7111 23 13.8156 22.1046 13.8156 21C13.8156 19.8954 14.7111 19 15.8156 19ZM17.3156 16.5H14.3156V8.5H17.3156V16.5Z\" fill=\"var(--next-error-title)\"></path></svg><h1 style=\"font-size:24px;font-weight:500;letter-spacing:-0.02em;line-height:32px;margin:0 0 12px 0;color:var(--next-error-title)\">Esta página não carregou</h1><p style=\"font-size:14px;font-weight:400;line-height:21px;margin:0 0 20px 0;color:var(--next-error-message)\">Ocorreu um erro no servidor. Recarregue para tentar de novo.</p><form style=\"margin:0\"><button type=\"submit\" style=\"display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;font-size:14px;font-weight:500;line-height:20px;border-radius:6px;cursor:pointer;color:var(--next-error-btn-text);background:var(--next-error-btn-bg);border:var(--next-error-btn-border)\">Recarregar</button></form></div></div><!--$--><!--/$--></body></html>";

/**
 * Mixed-case page URLs (owner review 2026-11-08; docs/evidence/verify/final/retest/): every route is lower-case and
 * the host is case-sensitive, so /PRIVACY-POLICY or /about/Studio are unknown URLs (404). On a case-insensitive file
 * system (Windows/NTFS) `next start` would instead serve the lower-case prerendered page for the first such request and
 * then write the 404 of the revalidation into the CANONICAL route's cache entry, after which the real page answers 404.
 * The guard rewrites each segment that contains a capital letter to an unknown lower-case segment ("~" + lower-case),
 * so the request takes the route's not-found branch and never touches the canonical page's cache files.
 */
const INTERNAL = /^\/(?:_next|api|assets|brand|projects|fonts|images|models|sounds)(?:\/|$)/;
function caseGuard(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!/[A-Z]/.test(pathname) || INTERNAL.test(pathname) || /\.[A-Za-z0-9]+$/.test(pathname)) return null;
  const url = request.nextUrl.clone();
  url.pathname = pathname
    .split('/')
    .map((s) => (/[A-Z]/.test(s) ? '~' + s.toLowerCase() : s))
    .join('/');
  return NextResponse.rewrite(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== '/500' && pathname !== '/_global-error') return caseGuard(request) ?? NextResponse.next();
  return new NextResponse(ERROR_500_HTML, {
    status: 500,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Disposition': 'inline; filename="500"',
    },
  });
}

export const config = {
  // every page-like path (the case guard needs them all); internals, media and files with an extension are skipped
  matcher: ['/((?!_next/|api/|assets/|brand/|fonts/|images/|models/|sounds/|.*\\.[A-Za-z0-9]+$).*)'],
};
