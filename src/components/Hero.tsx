import React from 'react';
import { ChevronRight } from 'lucide-react';
import { GoldField } from './GoldField.tsx';
import { HeroLoop } from './HeroLoop.tsx';
import { CountUp } from './CountUp.tsx';
import { Reveal } from './Reveal.tsx';

interface HeroProps {
  onApplyClick?: () => void;
  onSeePathClick?: () => void;
}

export function Hero({ onApplyClick, onSeePathClick }: HeroProps) {
  const stats = [
    { value: 6, prefix: '', label: 'Markets open' },
    { value: 225, prefix: '$', label: 'Top rep rate / account' },
    { value: 4, prefix: '', label: 'Pillars we build' },
  ];

  return (
    <section className="relative w-full min-h-screen flex flex-col justify-start pt-32 sm:pt-40 lg:pt-48 pb-24 overflow-hidden bg-bg">
      {/* Background: gold glow + interactive gold dust */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* The one gradient the brand allows — a faint gold glow behind the hero */}
        <div className="absolute -top-48 right-[-12%] h-[760px] w-[760px] rounded-full bg-[radial-gradient(circle,rgba(245,197,24,0.16),transparent_62%)]" />

        {/* The 3D Creed mark, turning on the right */}
        <HeroLoop />

        <GoldField />

        {/* Readability: dark under the copy on the left, clear toward the right */}
        {/* Dark under the copy, fully clear by the time it reaches the mark */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg from-20% via-bg/55 via-45% to-transparent to-70%" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40" />
      </div>

      <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="max-w-4xl">
          {/* Tagline badge */}
          <Reveal className="mb-6 sm:mb-7 inline-block">
            <div className="relative p-[1px] rounded-full overflow-hidden group">
              {/* Gradient border ring with gold on the left */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gold via-gold/40 to-white/10 opacity-90 group-hover:opacity-100 transition-opacity" />

              {/* Inner capsule content */}
              <div className="relative flex items-center gap-3 px-4 py-2 rounded-full bg-well/80 backdrop-blur-md">
                <span className="font-mono text-eyebrow font-medium text-ink uppercase">
                  Relentless Refinement <span className="ml-1 align-[-1px] text-[16px] leading-none text-gold">∞</span>
                </span>
              </div>
            </div>
          </Reveal>

          {/* Main Headline */}
          <Reveal delay={80}>
            <h1 className="font-display font-semibold text-display-xs sm:text-display-sm md:text-display-md lg:text-display-lg xl:text-display-xl text-ink">
              <span className="block text-ink-muted">
                Most people talk.
              </span>
              <span className="block">
                Become who you
              </span>
              <span className="block">
                said you'd <span className="text-gold">be.</span>
              </span>
            </h1>
          </Reveal>

          {/* Subtitle / Paragraph */}
          <Reveal delay={160}>
            <p className="mt-6 sm:mt-7 text-lede lg:text-lede-lg text-ink-muted font-normal max-w-[560px]">
              A self-development group that builds people physically, spiritually, mentally and financially — with door-to-door sales as the route.
            </p>
          </Reveal>

          {/* CTA Buttons */}
          <Reveal delay={240}>
            <div className="mt-8 sm:mt-9 flex flex-wrap items-center gap-6 sm:gap-8">
              <button
                onClick={onApplyClick}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-md bg-gold text-on-gold font-semibold text-[15px] hover:bg-gold-glow hover:-translate-y-0.5 active:translate-y-0 active:bg-gold-deep transition-all duration-200 cursor-pointer"
              >
                Apply
              </button>

              <button
                onClick={onSeePathClick}
                className="inline-flex items-center gap-1.5 text-gold font-semibold text-[15px] hover:text-gold-glow transition-colors duration-200 group cursor-pointer"
              >
                <span>See the path</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          </Reveal>

          {/* Stat strip — counts up as it enters */}
          <Reveal delay={320}>
            <dl className="mt-14 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl border-t border-line pt-6">
              {stats.map((s) => (
                <div key={s.label} className="min-w-0">
                  <dd className="font-mono text-[26px] sm:text-stat text-gold-glow">
                    <CountUp value={s.value} prefix={s.prefix} />
                  </dd>
                  <dt className="mt-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.09em] text-ink-muted">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
