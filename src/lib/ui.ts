/* Shared class strings — one source for every form control and table */

export const labelClass = 'block text-[11px] font-semibold text-ink-muted uppercase tracking-[0.09em] mb-1.5';

export const fieldClass =
  'w-full px-4 py-2.5 rounded-md bg-bg border border-line text-ink text-sm placeholder:text-ink-muted/60 focus:outline-2 focus:outline-offset-1 focus:outline-gold focus:border-transparent transition-colors';

export const numFieldClass = `${fieldClass} font-mono tabular`;

export const tableClass =
  'w-full border-collapse tabular text-sm [&_td]:py-[7px] [&_th]:py-[7px] [&_td]:border-t [&_th]:border-t [&_td]:border-rule [&_th]:border-rule [&_tr:first-child>*]:border-t-0 [&_td+td]:pl-2.5 [&_th+th]:pl-2.5 [&_td]:text-left [&_th]:text-left [&_td]:font-medium [&_th]:font-medium [&_th]:text-[13px] [&_th]:text-gold-dim';

export const numCell = 'text-right! font-mono whitespace-nowrap';

export const bigCell = 'text-gold-glow text-base';
