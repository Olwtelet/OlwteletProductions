// Inline SVG components of the original contact bundle (path data copied verbatim from the shipped code — not
// redrawn; checked by scripts/contact-legal/check-icons.mjs): chunk 665 module 78349 (close), module 95192
// (arrow `S`, email `g`, WhatsApp `f`) and chunk 8462 module 73775 (upload cloud `p`). Same files as
// docs/recon/svg/ds-contact-close.svg, ds-arrow-right-16.svg, ds-icon-email-25.svg, ds-icon-whatsapp-24.svg.
import type { SVGProps } from 'react';

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56" {...props}>
      <circle cx={28} cy={28} r={28} fill="#fff" fillOpacity={0.1} />
      <path stroke="#fff" strokeWidth={1.5} d="m19.778 20.222 15.556 15.556m.001-15.556L19.779 35.778" />
    </svg>
  );
}

export function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 16 16" {...props}>
      <path d="M13.104 8.308H.5V7.052h12.604L7.117 1.065 8 .18l7.5 7.5-7.5 7.5-.883-.885z" />
    </svg>
  );
}

export function EmailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 25 25" {...props}>
      <mask id="email_svg__a" width={25} height={25} x={0} y={0} maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
        <path fill="#D9D9D9" d="M.167.353h24v24h-24z" />
      </mask>
      <g mask="url(#email_svg__a)">
        <path
          fill="#fff"
          d="M4.474 19.852q-.758 0-1.283-.524a1.75 1.75 0 0 1-.524-1.283V6.66q0-.757.525-1.282t1.282-.525H19.86q.757 0 1.282.525t.526 1.282v11.385q0 .757-.526 1.282-.525.525-1.282.525zm7.692-6.942-8-5.115v10.25a.3.3 0 0 0 .087.221.3.3 0 0 0 .221.087H19.86a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.221V7.795l-8 5.115Zm0-1.558 7.847-5H4.32zm-8-3.557V6.353v11.692a.3.3 0 0 0 .087.221.3.3 0 0 0 .221.087h-.308z"
        />
      </g>
    </svg>
  );
}

export function WhatsappIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 25" {...props}>
      <path
        fill="#fff"
        d="m7.246 18.846.724.424a7.95 7.95 0 0 0 4.023 1.082 8 8 0 1 0-6.916-3.976l.422.724-.653 2.401zm-5.25 3.506 1.353-4.968a9.95 9.95 0 0 1-1.356-5.032c0-5.522 4.477-10 10-10s10 4.478 10 10-4.477 10-10 10a9.95 9.95 0 0 1-5.03-1.355l-4.966 1.355ZM8.385 7.661q.202-.014.403-.004.081.006.162.016c.159.018.334.115.393.249q.447 1.015.868 2.04c.062.152.025.347-.093.537a4 4 0 0 1-.263.371c-.113.146-.356.412-.356.412s-.1.117-.061.264a1 1 0 0 0 .102.206l.059.095c.256.427.6.86 1.02 1.268.12.115.237.235.363.345.468.413.998.75 1.57 1l.005.002c.085.037.128.058.252.11q.093.041.19.067a.35.35 0 0 0 .368-.13c.724-.877.79-.934.796-.934v.002a.48.48 0 0 1 .378-.127.5.5 0 0 1 .177.04c.53.242 1.4.621 1.4.621l.582.261c.098.047.187.159.19.265.004.067.01.175-.013.373-.032.26-.11.57-.188.733a1.2 1.2 0 0 1-.21.303 2.5 2.5 0 0 1-.33.288l-.125.09a5 5 0 0 1-.383.22 2 2 0 0 1-.833.23c-.185.01-.37.024-.556.014l-.568-.088a9.45 9.45 0 0 1-3.84-2.046c-.226-.198-.435-.412-.65-.625-.89-.886-1.561-1.84-1.97-2.742a3.5 3.5 0 0 1-.33-1.414 2.73 2.73 0 0 1 .564-1.68c.073-.094.142-.192.26-.305.128-.12.208-.184.295-.228a1 1 0 0 1 .37-.1z"
      />
    </svg>
  );
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 27 18" {...props}>
      <path d="M6.37 17.93a5.33 5.33 0 0 1-3.92-1.61 5.37 5.37 0 0 1-1.61-3.94c0-1.52.55-2.83 1.66-3.93a5.15 5.15 0 0 1 3.78-1.63c.2-1.92 1-3.53 2.44-4.82A7.34 7.34 0 0 1 13.79.07c2.1 0 3.88.74 5.32 2.21a7.38 7.38 0 0 1 2.17 5.37v1.9h1.07a4.07 4.07 0 0 1 3.09 1.15c.84.8 1.26 1.82 1.26 3.04a4.11 4.11 0 0 1-4.13 4.2h-7.33a1.8 1.8 0 0 1-1.33-.54 1.8 1.8 0 0 1-.54-1.33V7.7l-3.13 3.16-.58-.55 4.1-4.1 4.12 4.1-.58.55-3.13-3.16v8.36c0 .27.11.5.33.73.22.22.47.34.74.34h7.26c.95 0 1.75-.34 2.41-1s1-1.46 1-2.4-.34-1.73-1-2.4a3.3 3.3 0 0 0-2.42-.98h-2.01v-2.7c0-1.86-.65-3.46-1.96-4.79-1.3-1.33-2.9-2-4.76-2-1.87 0-3.46.67-4.77 2A6.56 6.56 0 0 0 7 7.65h-.73c-1.24 0-2.32.46-3.25 1.39a4.6 4.6 0 0 0-1.4 3.37c0 1.3.47 2.41 1.4 3.34a4.56 4.56 0 0 0 3.34 1.39h3.6v.8h-3.6Z" />
    </svg>
  );
}
