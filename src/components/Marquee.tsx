import React from 'react';

const PHRASE = ['Believe', 'Become', 'Belong', 'Where your creed starts'];
// the phrase is short, so repeat it within each row to fill wide screens
const ITEMS = [...PHRASE, ...PHRASE, ...PHRASE];

/* One slow horizontal band. The list renders twice so the -50% loop is seamless. */
export function Marquee() {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6 font-display text-2xl sm:text-3xl font-semibold uppercase tracking-[0.06em] text-ink whitespace-nowrap">
            {item === 'Where your creed starts' ? (
              <>Where your <span className="text-gold">creed</span> starts</>
            ) : (
              item
            )}
          </span>
          <span className="text-gold text-sm">◆</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden border-y border-line bg-surface py-5">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface to-transparent" />
    </div>
  );
}
