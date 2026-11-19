'use client';
// Rendered at runtime when the root layout itself throws: the same pt-BR document as the static /500 of src/proxy.ts,
// with the tab title TAB_TITLE as every page (Next's default here had no <title>).
// - global-error replaces the root layout and renders its own <html>; metadata exports are not supported here, so the
//   title is the React <title> (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md,
//   "Global Error"). Next's error boundary already applies its ISR guard before rendering this component.
// - Next's static 500 document (pages/500.html, /_global-error) is NOT built from this file: Next always prerenders it
//   from next/dist/client/components/builtin/app-error, with an English title. src/proxy.ts answers direct GETs to /500
//   and /_global-error with its own pt-BR document instead.
import { TAB_TITLE } from '@/content/brand';

const THEME_CSS =
  ':root{--next-error-bg:#fff;--next-error-text:#171717;--next-error-title:#171717;--next-error-message:#171717;--next-error-digest:#666666;--next-error-btn-text:#fff;--next-error-btn-bg:#171717;--next-error-btn-border:none;--next-error-btn-secondary-text:#171717;--next-error-btn-secondary-bg:transparent;--next-error-btn-secondary-border:1px solid rgba(0,0,0,0.08)}' +
  '@media (prefers-color-scheme: dark){:root{--next-error-bg:#0a0a0a;--next-error-text:#ededed;--next-error-title:#ededed;--next-error-message:#ededed;--next-error-digest:#a0a0a0;--next-error-btn-text:#0a0a0a;--next-error-btn-bg:#ededed;--next-error-btn-border:none;--next-error-btn-secondary-text:#ededed;--next-error-btn-secondary-bg:transparent;--next-error-btn-secondary-border:1px solid rgba(255,255,255,0.14)}}' +
  'body{margin:0;color:var(--next-error-text);background:var(--next-error-bg)}';

const button = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  padding: '0 12px',
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '20px',
  borderRadius: 6,
  cursor: 'pointer',
} as const;

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void; retry: () => void }) {
  const digest = error?.digest;
  const serverError = !!digest;
  return (
    <html lang="pt-BR" id="__next_error__">
      <head>
        <title>{TAB_TITLE}</title>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      </head>
      <body>
        <div style={{ fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ marginTop: -32, maxWidth: 325, padding: '32px 28px', textAlign: 'left' }}>
            <svg width="32" height="32" viewBox="-0.2 -1.5 32 32" fill="none" style={{ marginBottom: 24 }} aria-hidden="true">
              <path
                d="M16.9328 0C18.0839 0.000116771 19.1334 0.658832 19.634 1.69531L31.4299 26.1309C32.0708 27.4588 31.1036 28.9999 29.6291 29H2.00215C0.527541 29 -0.439628 27.4588 0.201371 26.1309L11.9973 1.69531C12.4979 0.658823 13.5474 7.75066e-05 14.6984 0H16.9328ZM3.59493 26H28.0363L16.9328 3H14.6984L3.59493 26ZM15.8156 19C16.9202 19.0001 17.8156 19.8955 17.8156 21C17.8156 22.1045 16.9202 22.9999 15.8156 23C14.7111 23 13.8156 22.1046 13.8156 21C13.8156 19.8954 14.7111 19 15.8156 19ZM17.3156 16.5H14.3156V8.5H17.3156V16.5Z"
                fill="var(--next-error-title)"
              />
            </svg>
            <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: '32px', margin: '0 0 12px 0', color: 'var(--next-error-title)' }}>Esta página não carregou</h1>
            <p style={{ fontSize: 14, fontWeight: 400, lineHeight: '21px', margin: '0 0 20px 0', color: 'var(--next-error-message)' }}>
              {serverError ? 'Ocorreu um erro no servidor. Recarregue para tentar de novo.' : 'Recarregue para tentar de novo ou volte à página anterior.'}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <form style={{ margin: 0 }}>
                <button type="submit" style={{ ...button, color: 'var(--next-error-btn-text)', background: 'var(--next-error-btn-bg)', border: 'var(--next-error-btn-border)' }}>
                  Recarregar
                </button>
              </form>
              {!serverError && (
                <button
                  type="button"
                  style={{ ...button, color: 'var(--next-error-btn-secondary-text)', background: 'var(--next-error-btn-secondary-bg)', border: 'var(--next-error-btn-secondary-border)' }}
                  onClick={() => {
                    // a full document load, as Next's own page: the root layout failed, so the client router is not
                    // relied on. With history, the previous page; otherwise the home page.
                    if (window.history.length > 1) window.history.back();
                    else window.location.href = window.location.origin;
                  }}
                >
                  Voltar
                </button>
              )}
            </div>
          </div>
        </div>
        {digest && (
          <p style={{ position: 'fixed', bottom: 32, left: 0, right: 0, textAlign: 'center', fontFamily: 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace', fontSize: 12, lineHeight: '18px', fontWeight: 400, margin: 0, color: 'var(--next-error-digest)' }}>
            Código do erro: {digest}
          </p>
        )}
      </body>
    </html>
  );
}
