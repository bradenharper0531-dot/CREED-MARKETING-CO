import React, { useId } from 'react';

/* The Creed Co mark: an infinity sign made of two interlocking C's.
   The first C rides over the crossing; a mask cuts a thin gap into the second
   C where they cross, so the two letters read as hooked through each other on
   any background (the navbar pill is translucent, so a painted "cut" won't do). */
const C_ONE =
  'M18.26 12.80 L17.75 13.46 L17.27 14.13 L16.80 14.82 L16.33 15.51 L15.87 16.20 L15.40 16.89 L14.93 17.58 L14.45 18.26 L13.96 18.93 L13.44 19.57 L12.90 20.20 L12.34 20.79 L11.74 21.34 L11.11 21.84 L10.43 22.27 L9.72 22.62 L8.98 22.87 L8.20 22.99 L7.39 22.97 L6.58 22.77 L5.78 22.39 L5.01 21.81 L4.31 21.01 L3.70 20.02 L3.23 18.86 L2.92 17.56 L2.80 16.19 L2.87 14.81 L3.13 13.49 L3.56 12.28 L4.13 11.24 L4.81 10.39 L5.56 9.75 L6.36 9.31 L7.17 9.07 L7.98 9.00 L8.76 9.08 L9.52 9.30 L10.24 9.62 L10.92 10.03';
const C_TWO =
  'M13.74 12.80 L14.25 13.46 L14.73 14.13 L15.20 14.82 L15.67 15.51 L16.13 16.20 L16.60 16.89 L17.07 17.58 L17.55 18.26 L18.04 18.93 L18.56 19.57 L19.10 20.20 L19.66 20.79 L20.26 21.34 L20.89 21.84 L21.57 22.27 L22.28 22.62 L23.02 22.87 L23.80 22.99 L24.61 22.97 L25.42 22.77 L26.22 22.39 L26.99 21.81 L27.69 21.01 L28.30 20.02 L28.77 18.86 L29.08 17.56 L29.20 16.19 L29.13 14.81 L28.87 13.49 L28.44 12.28 L27.87 11.24 L27.19 10.39 L26.44 9.75 L25.64 9.31 L24.83 9.07 L24.02 9.00 L23.24 9.08 L22.48 9.30 L21.76 9.62 L21.08 10.03';

export function CreedMark({ size = 34, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={Math.round(size * 0.57)}
      viewBox="1.4 7.6 29.2 16.8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <mask id={`cut-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect x="0" y="0" width="32" height="32" fill="#fff" />
          <path d={C_ONE} stroke="#000" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <g stroke="#f5c518" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={C_TWO} mask={`url(#cut-${id})`} />
        <path d={C_ONE} />
      </g>
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Creed Mark — two interlocking C's forming an infinity sign.
          Point-symmetric, so a half turn on hover lands it back on itself. */}
      <CreedMark className="shrink-0 transition-transform duration-500 group-hover:rotate-180" />

      {/* Wordmark */}
      <span className="font-display text-[19px] font-semibold leading-none uppercase tracking-[0.08em] text-gold">
        Creed
      </span>
    </div>
  );
}
